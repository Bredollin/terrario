// Quadro de curiosidades: transforma as cacadas do terrario (markdown) em
// fichas para a TV da sala (foto, nome, duas frases e um numero curioso).
// Le so a pasta de conhecimento do proprio terrario. A foto vem da Wikipedia
// do tema e o clima do Open-Meteo (sem chave).
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { slug } from './cacador.mjs';
import { LISTA_SALA } from '../public/temas-sala.js';

// Frases para a TV: so corta no ponto seguido de espaco e maiuscula (10.582 km² fica inteiro).
export function frases(texto) {
  return String(texto).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[\p{Lu}"“(\d])/u).map(s => s.trim()).filter(Boolean);
}

const VERSAO = 2; // muda quando a ficha ganha campos novos (refaz o cache)
const CATEGORIA = new Map(LISTA_SALA.map(t => [slug(t.tema), t.categoria]));
const UA = 'Terrario/0.6 (quadro de curiosidades; github.com/Bredollin/terrario)';

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

const RUIM = /(icon|logo|flag|bandeira|mapa|map|locator|location|commons|wiki|symbol|simbolo|brasao|coat_of_arms|signature|assinatura|disambig|edit-|question|padlock)/i;

function extensao(tipo) {
  return tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('jpeg') || tipo.includes('jpg') ? 'jpg' : '';
}

// Ate `max` fotos do artigo da Wikipedia citado nas fontes: a principal primeiro,
// depois as outras fotos grandes do artigo (sem icones, mapas, bandeiras, svg).
export async function fotosDaWiki(fontes, { wiki, max = 4 }) {
  const base = new URL(wiki);
  for (const f of fontes) {
    let u; try { u = new URL(f); } catch { continue; }
    const daWiki = u.origin === base.origin || /(^|\.)wikipedia\.org$/.test(u.hostname);
    if (!daWiki || !u.pathname.startsWith('/wiki/')) continue;
    const titulo = decodeURIComponent(u.pathname.slice(6)).replace(/_/g, ' ');
    const api = (q) => { const a = new URL('/w/api.php', u.origin); a.search = new URLSearchParams({ ...q, format: 'json', origin: '*' }); return a; };
    const urls = [];
    try {
      const pags = Object.values(JSON.parse((await baixar(api({ action: 'query', prop: 'pageimages', piprop: 'thumbnail',
        pithumbsize: '1280', titles: titulo }))).buf.toString()).query?.pages ?? {});
      if (pags[0]?.thumbnail?.source) urls.push(pags[0].thumbnail.source);
    } catch {}
    try {
      const imgs = Object.values(JSON.parse((await baixar(api({ action: 'query', generator: 'images', gimlimit: '30', titles: titulo,
        prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: '1280' }))).buf.toString()).query?.pages ?? {});
      for (const i of imgs) {
        const inf = i.imageinfo?.[0];
        if (!inf || !/jpeg|png/.test(inf.mime ?? '') || (inf.width ?? 0) < 800 || (inf.height ?? 0) < 500) continue;
        if (RUIM.test(i.title ?? '') || !inf.thumburl) continue;
        urls.push(inf.thumburl);
      }
    } catch {}
    const fotos = [], vistas = new Set();
    for (const src of urls) {
      if (fotos.length >= max) break;
      const s = new URL(src, u.origin);
      const chaveFoto = decodeURIComponent(s.pathname).replace(/^.*\//, '').replace(/^\d+px-/, '');
      if (vistas.has(chaveFoto)) continue;
      vistas.add(chaveFoto);
      if (s.hostname !== 'upload.wikimedia.org' && s.origin !== base.origin) continue;
      try {
        const { tipo, buf } = await baixar(s);
        const ext = extensao(tipo);
        if (ext) fotos.push({ ext, buf });
      } catch {}
    }
    if (fotos.length) return fotos;
  }
  return [];
}

export function criarQuadro({ saida, wiki = 'https://pt.wikipedia.org', chave = '', modelo, clima = {} }) {
  const cache = join(saida, '.quadro');
  const emAndamento = new Map();

  async function ficha(arquivo) {
    const json = join(cache, arquivo.replace(/\.md$/, '.json'));
    const pronta = await readFile(json, 'utf8').then(JSON.parse, () => null);
    if (pronta?.v === VERSAO) return pronta;
    const c = lerCacada(await readFile(join(saida, arquivo), 'utf8'));
    let f = fichaExtrativa(c), fonte = 'extrativo';
    if (chave) { try { f = await fichaComIA(c, { chave, modelo }); fonte = 'ia'; } catch {} }
    if (f.categoria === 'Curiosidade' && CATEGORIA.has(slug(c.tema))) f.categoria = CATEGORIA.get(slug(c.tema));
    const imagens = [];
    try {
      const fotos = await fotosDaWiki(c.fontes, { wiki });
      await mkdir(cache, { recursive: true });
      for (const [i, foto] of fotos.entries()) {
        const nome = `${slug(arquivo.replace(/\.md$/, ''))}-${i + 1}.${foto.ext}`;
        await writeFile(join(cache, nome), foto.buf);
        imagens.push(`/api/quadro/imagem/${nome}`);
      }
    } catch {}
    const pronto = { v: VERSAO, id: arquivo, ...f, tema: c.tema, criatura: c.criatura, data: c.data, fonte, imagens, imagem: imagens[0] ?? '',
      origem: c.fontes[0] ? new URL(c.fontes[0]).hostname.replace(/^www\./, '') : '' };
    await mkdir(cache, { recursive: true });
    await writeFile(json, JSON.stringify(pronto));
    return pronto;
  }

  // Ate `novas` fichas novas por chamada, para a tela nao esperar demais.
  // Tema repetido aparece uma vez so (a cacada mais nova).
  async function listar({ max = 80, novas = 3 } = {}) {
    // mais nova primeiro (pela hora do arquivo; o nome so tem o dia)
    const mds = (await readdir(saida).catch(() => [])).filter(n => n.endsWith('.md'));
    const nomes = (await Promise.all(mds.map(async n => [n, (await stat(join(saida, n)).catch(() => ({ mtimeMs: 0 }))).mtimeMs])))
      .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0])).map(([n]) => n);
    const out = [], temas = new Set(); let feitas = 0;
    const entra = f => { const k = slug(f.tema || f.titulo); if (temas.has(k)) return; temas.add(k); out.push(f); };
    for (const n of nomes) {
      if (out.length >= max) break;
      const existe = await readFile(join(cache, n.replace(/\.md$/, '.json')), 'utf8').then(JSON.parse, () => null);
      if (existe?.v === VERSAO) { entra(existe); continue; }
      if (feitas >= novas) continue;
      feitas++;
      if (!emAndamento.has(n)) emAndamento.set(n, ficha(n).finally(() => emAndamento.delete(n)));
      try { entra(await emAndamento.get(n)); } catch {}
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
