// Cacador: o agente de cada criatura. Recebe um tema (ou um link), le paginas
// da web e devolve o que aprendeu. Nunca le a tela nem arquivos do usuario:
// so o que recebe.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const STOP = new Set(`a o e as os de da do das dos em no na nos nas um uma uns umas por para com sem que se
como mais mas ou ao aos sua seu suas seus ele ela eles elas isso esta este essa esse foi sao ser tem ter
ja nao sim entre sobre tambem pela pelo pelas pelos ate onde quando muito muitos muita muitas outro outra
outros outras qual quais pode podem the of and in to is was for on with as by an are from at that this
be or it its which also has have were their other can into than more such cada todo toda todos todas
sua seus vez apos antes depois durante assim ainda aqui`.split(/\s+/));

export function slug(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sem-nome';
}

export function frases(texto) {
  return String(texto).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) ?? [];
}

// Termos mais frequentes (palavras de 4+ letras, sem stopwords).
export function termos(textos, n = 12) {
  const cont = new Map();
  for (const t of textos) {
    for (const p of String(t).toLowerCase().match(/[\p{L}][\p{L}-]{3,}/gu) ?? []) {
      const base = p.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (STOP.has(base)) continue;
      cont.set(p, (cont.get(p) ?? 0) + 1);
    }
  }
  return [...cont].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([p]) => p);
}

// Resumo sem IA externa: primeiras frases de cada pagina.
export function resumoExtrativo(paginas, porPagina = 3) {
  return paginas.map(p => `**${p.titulo}**: ${frases(p.texto).slice(0, porPagina).join(' ')}`).join('\n\n');
}

export function htmlParaTexto(html) {
  return String(html)
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

function ipPrivado(ip) {
  if (ip.includes(':')) return /^(::1?$|fc|fd|fe80|::ffff:(127|10|192\.168|169\.254)\.)/i.test(ip);
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// Link solto pelo usuario: so http(s) publico, nada da rede interna.
export async function validarLink(link, { permitirPrivado = false } = {}) {
  let url;
  try { url = new URL(link); } catch { throw new Error('Link invalido.'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('So links http ou https.');
  if (permitirPrivado) return url;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map(r => r.address);
  if (ips.some(ipPrivado)) throw new Error('A criatura nao entra na rede interna.');
  return url;
}

async function buscar(url, { timeout = 10000, limite = 1_500_000 } = {}) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { 'user-agent': 'terrario/0.1 (criatura curiosa; github.com/Bredollin)' },
  });
  if (!r.ok) throw new Error(`A pagina respondeu ${r.status}.`);
  const corpo = await r.text();
  return { tipo: r.headers.get('content-type') ?? '', corpo: corpo.slice(0, limite) };
}

export function criarCacador({ wiki = 'https://pt.wikipedia.org', chave = '', modelo = 'claude-sonnet-5-5',
  permitirPrivado = false, maxPaginas = 3 } = {}) {

  async function lerWiki(tema) {
    const api = new URL('/w/api.php', wiki);
    api.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: tema,
      srlimit: String(maxPaginas), format: 'json', origin: '*' });
    const achados = JSON.parse((await buscar(api)).corpo).query?.search ?? [];
    if (!achados.length) throw new Error(`Nada encontrado sobre "${tema}".`);
    const ext = new URL('/w/api.php', wiki);
    ext.search = new URLSearchParams({ action: 'query', prop: 'extracts', explaintext: '1', exintro: '0',
      exchars: '2400', titles: achados.map(a => a.title).join('|'), format: 'json', origin: '*' });
    const paginas = Object.values(JSON.parse((await buscar(ext)).corpo).query?.pages ?? {});
    return achados.map(a => paginas.find(p => p.title === a.title)).filter(p => p?.extract)
      .map(p => ({ titulo: p.title, url: new URL(`/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, wiki).href,
        texto: p.extract.replace(/\n+/g, ' ').trim() }));
  }

  async function lerLink(link) {
    const url = await validarLink(link, { permitirPrivado });
    const { tipo, corpo } = await buscar(url);
    const titulo = /<title[^>]*>([^<]*)<\/title>/i.exec(corpo)?.[1]?.trim() || url.hostname;
    const texto = tipo.includes('html') ? htmlParaTexto(corpo) : corpo;
    return [{ titulo: htmlParaTexto(titulo), url: url.href, texto: texto.replace(/\s+/g, ' ').slice(0, 2400) }];
  }

  async function resumirComIA(tema, paginas) {
    const fontes = paginas.map((p, i) => `[${i + 1}] ${p.titulo}\n${p.texto}`).join('\n\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(60000),
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: modelo, max_tokens: 900,
        messages: [{ role: 'user', content: `Voce e uma criatura curiosa de um terrario digital que acabou de explorar a web sobre "${tema}". `
          + `Com base SO nas fontes abaixo, escreva em portugues do Brasil um resumo em markdown (sem titulo de nivel 1): `
          + `um paragrafo de visao geral, depois uma lista "O que descobri" com 4 a 6 itens citando [n]. Seja fiel as fontes.\n\n${fontes}` }],
      }),
    });
    if (!r.ok) throw new Error(`IA respondeu ${r.status}`);
    return (await r.json()).content?.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  }

  return async function cacar({ tema = '', link = '' }) {
    const alvo = link || tema;
    if (!String(alvo).trim()) throw new Error('Diga um tema ou solte um link.');
    const paginas = link ? await lerLink(link) : await lerWiki(tema.trim().slice(0, 120));
    let resumo = '', fonte = 'extrativo';
    if (chave) {
      try { resumo = await resumirComIA(tema || paginas[0].titulo, paginas); fonte = 'ia'; }
      catch { resumo = ''; }
    }
    if (!resumo) resumo = resumoExtrativo(paginas);
    return { tema: tema || paginas[0].titulo, paginas, resumo, fonte, termos: termos(paginas.map(p => p.texto)) };
  };
}

export function paraMarkdown({ criatura, tema, paginas, resumo, termos: ts, fonte }, data = new Date()) {
  const quando = data.toISOString();
  return `---
criatura: ${JSON.stringify(criatura)}
tema: ${JSON.stringify(tema)}
data: ${quando}
resumo: ${fonte}
fontes:
${paginas.map(p => `  - ${JSON.stringify(p.url)}`).join('\n')}
---

# ${tema}

_Cacado por ${criatura} em ${quando.slice(0, 10)}._

## Resumo

${resumo}

## Termos

${ts.map(t => `\`${t}\``).join(' · ')}

## Fontes

${paginas.map((p, i) => `${i + 1}. [${p.titulo}](${p.url})`).join('\n')}
`;
}
