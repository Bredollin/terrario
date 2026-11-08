// Quadro de curiosidades: transforma as cacadas do terrario (markdown) em
// fichas para a TV da sala (foto, nome, duas frases e um numero curioso).
// Le so a pasta de conhecimento do proprio terrario. A foto vem da Wikipedia
// do tema e o clima do Open-Meteo (sem chave).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { slug } from './cacador.mjs';

// Frases para a TV: so corta no ponto seguido de espaco e maiuscula (10.582 km² fica inteiro).
export function frases(texto) {
  return String(texto).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[\p{Lu}"“(\d])/u).map(s => s.trim()).filter(Boolean);
}

const UA = 'Terrario/0.5 (quadro de curiosidades; github.com/Bredollin/terrario)';

async function baixar(url, { timeout = 10000, limite = 4_000_000 } = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout), redirect: 'follow' });
  if (!r.ok) throw new Error(`${new URL(url).hostname} respondeu ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > limite) throw new Error('Arquivo grande demais.');
  return { tipo: r.headers.get('content-type') ?? '', buf };
}

// Le o markdown gravado por paraMarkdown().
export function lerCacada(md) {
  const cab = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? '';
  const campo = k => { const m = new RegExp(`^${k}: (.*)$`, 'm').exec(cab); if (!m) return ''; try { return JSON.parse(m[1]); } catch { return m[1].trim(); } };
  const fontes = [...cab.matchAll(/^\s+- (".*")$/gm)].map(m => { try { return JSON.parse(m[1]); } catch { return ''; } }).filter(Boolean);
  const resumo = /## Resumo\n\n([\s\S]*?)\n\n## /.exec(md)?.[1]?.trim() ?? '';
  return { criatura: campo('criatura'), tema: campo('tema'), data: campo('data'), fontes, resumo };
}

function limpar(txt) {
  return String(txt).replace(/\*\*[^*]+\*\*:\s*/g, '').replace(/\[\d+\]/g, '').replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '').replace(/\s+/g, ' ').trim();
}

const UNIDADES = 'km²|km2|km|quilômetros|metros|m²|anos|milhões|milhão|bilhões|bilhão|mil|%|°C|graus|kg|toneladas|espécies|habitantes|vezes|séculos|dias|horas';
const RE_NUM = new RegExp(`(\\d[\\d.,]*\\s*(?:${UNIDADES}))([^.;]{0,60})`, 'i');

// Ficha sem IA: duas primeiras frases do resumo e o primeiro numero com unidade.
export function fichaExtrativa(c) {
  const texto = limpar(c.resumo);
  const fs = frases(texto);
  let corpo = fs.slice(0, 2).join(' ');
  if (corpo.length > 260) corpo = fs[0]?.length <= 260 ? fs[0] : corpo.slice(0, 257).replace(/\s\S*$/, '') + '…';
  const m = RE_NUM.exec(texto);
  const titulo = c.tema ? c.tema[0].toUpperCase() + c.tema.slice(1) : 'Curiosidade';
  return { titulo, categoria: 'Curiosidade', onde: '', texto: corpo || texto.slice(0, 200),
    numero: m ? m[1].trim() : '', numeroLegenda: m ? m[2].replace(/^[\s,:-]+/, '').trim().slice(0, 60) : '' };
}

// Ficha com IA (so se houver ANTHROPIC_API_KEY): melhor texto, categoria e lugar.
export async function fichaComIA(c, { chave, modelo = 'claude-sonnet-5-5' }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: modelo, max_tokens: 400, messages: [{ role: 'user', content:
      'Monte uma ficha para um quadro de curiosidades na TV da sala de uma familia, em portugues do Brasil, '
      + 'usando SO o resumo abaixo. Responda so com JSON: {"titulo": nome curto, "categoria": uma palavra (Lugar, Animal, '
      + 'Fenomeno, Pessoa, Historia, Ciencia, Tecnologia...), "onde": onde fica ou "" se nao se aplica, "texto": duas frases '
      + 'simples, ate 220 caracteres, que uma crianca entenda, "numero": um numero curioso com unidade ou "", '
      + `"numeroLegenda": o que o numero significa, ate 50 caracteres}.\n\nTema: ${c.tema}\n\n${c.resumo}` }] }),
  });
  if (!r.ok) throw new Error(`IA respondeu ${r.status}`);
  const txt = (await r.json()).content?.filter(x => x.type === 'text').map(x => x.text).join('') ?? '';
  const j = JSON.parse(/\{[\s\S]*\}/.exec(txt)?.[0] ?? '{}');
  const s = (v, n) => String(v ?? '').trim().slice(0, n);
  if (!s(j.titulo, 80) || !s(j.texto, 300)) throw new Error('Ficha incompleta.');
  return { titulo: s(j.titulo, 80), categoria: s(j.categoria, 20) || 'Curiosidade', onde: s(j.onde, 50), texto: s(j.texto, 300),
    numero: s(j.numero, 24), numeroLegenda: s(j.numeroLegenda, 60) };
}

// Foto principal do artigo da Wikipedia citado nas fontes.
export async function fotoDaWiki(fontes, { wiki }) {
  const base = new URL(wiki);
  for (const f of fontes) {
    let u; try { u = new URL(f); } catch { continue; }
    const daWiki = u.origin === base.origin || /(^|\.)wikipedia\.org$/.test(u.hostname);
    if (!daWiki || !u.pathname.startsWith('/wiki/')) continue;
    const titulo = decodeURIComponent(u.pathname.slice(6)).replace(/_/g, ' ');
    const api = new URL('/w/api.php', u.origin);
    api.search = new URLSearchParams({ action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '1280',
      titles: titulo, format: 'json', origin: '*' });
    const pags = Object.values(JSON.parse((await baixar(api)).buf.toString()).query?.pages ?? {});
    const src = pags[0]?.thumbnail?.source;
    if (!src) continue;
    const s = new URL(src, u.origin);
    if (s.hostname !== 'upload.wikimedia.org' && s.origin !== base.origin) continue;
    const { tipo, buf } = await baixar(s);
    const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('jpeg') || tipo.includes('jpg') ? 'jpg' : '';
    if (ext) return { ext, buf };
  }
  return null;
}

export function criarQuadro({ saida, wiki = 'https://pt.wikipedia.org', chave = '', modelo, clima = {} }) {
  const cache = join(saida, '.quadro');
  const emAndamento = new Map();

  async function ficha(arquivo) {
    const json = join(cache, arquivo.replace(/\.md$/, '.json'));
    const pronta = await readFile(json, 'utf8').then(JSON.parse, () => null);
    if (pronta) return pronta;
    const c = lerCacada(await readFile(join(saida, arquivo), 'utf8'));
    let f = fichaExtrativa(c), fonte = 'extrativo';
    if (chave) { try { f = await fichaComIA(c, { chave, modelo }); fonte = 'ia'; } catch {} }
    let imagem = '';
    try {
      const foto = await fotoDaWiki(c.fontes, { wiki });
      if (foto) { imagem = `${slug(arquivo.replace(/\.md$/, ''))}.${foto.ext}`; await mkdir(cache, { recursive: true }); await writeFile(join(cache, imagem), foto.buf); }
    } catch {}
    const pronto = { id: arquivo, ...f, criatura: c.criatura, data: c.data, fonte, imagem: imagem && `/api/quadro/imagem/${imagem}`,
      origem: c.fontes[0] ? new URL(c.fontes[0]).hostname.replace(/^www\./, '') : '' };
    await mkdir(cache, { recursive: true });
    await writeFile(json, JSON.stringify(pronto));
    return pronto;
  }

  // Ate `novas` fichas novas por chamada, para a tela nao esperar demais.
  async function listar({ max = 30, novas = 3 } = {}) {
    const nomes = (await readdir(saida).catch(() => [])).filter(n => n.endsWith('.md')).sort().reverse().slice(0, max);
    const out = []; let feitas = 0;
    for (const n of nomes) {
      const existe = await readFile(join(cache, n.replace(/\.md$/, '.json')), 'utf8').then(JSON.parse, () => null);
      if (existe) { out.push(existe); continue; }
      if (feitas >= novas) continue;
      feitas++;
      if (!emAndamento.has(n)) emAndamento.set(n, ficha(n).finally(() => emAndamento.delete(n)));
      try { out.push(await emAndamento.get(n)); } catch {}
    }
    return out;
  }

  async function imagem(nome) {
    if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(nome)) throw Object.assign(new Error('Nome invalido.'), { code: 'ENOENT' });
    return readFile(join(cache, nome));
  }

  let tempo = { em: 0, dado: null };
  async function climaAgora() {
    if (Date.now() - tempo.em < 30 * 60_000 && tempo.dado) return tempo.dado;
    const u = new URL(clima.url ?? 'https://api.open-meteo.com/v1/forecast');
    u.search = new URLSearchParams({ latitude: String(clima.lat ?? -16.68), longitude: String(clima.lon ?? -49.25),
      current: 'temperature_2m,weather_code,is_day', timezone: 'auto' });
    const j = JSON.parse((await baixar(u)).buf.toString()).current ?? {};
    tempo = { em: Date.now(), dado: { temperatura: Math.round(j.temperature_2m), codigo: j.weather_code, dia: j.is_day === 1,
      texto: descreverTempo(j.weather_code) } };
    return tempo.dado;
  }

  return { listar, imagem, clima: climaAgora };
}

// Codigos WMO do Open-Meteo em palavras.
export function descreverTempo(c) {
  if (c === 0) return 'céu limpo';
  if (c <= 2) return 'poucas nuvens';
  if (c === 3) return 'nublado';
  if (c <= 48) return 'neblina';
  if (c <= 57) return 'garoa';
  if (c <= 67) return 'chuva';
  if (c <= 77) return 'neve';
  if (c <= 82) return 'pancadas de chuva';
  if (c <= 99) return 'trovoadas';
  return '';
}
