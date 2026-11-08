import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerCacada, fichaExtrativa, descreverTempo } from '../src/quadro.mjs';
import { criarCacador, paraMarkdown } from '../src/cacador.mjs';
import { criarServidor } from '../server.mjs';
import { wikiFalsa } from './wiki-falsa.mjs';

let wiki, base, pasta, app, appBase;
before(async () => {
  wiki = wikiFalsa().listen(0, '127.0.0.1');
  await new Promise(r => wiki.once('listening', r));
  base = `http://127.0.0.1:${wiki.address().port}`;
  pasta = await mkdtemp(join(tmpdir(), 'terrario-quadro-'));
  app = criarServidor({ saida: pasta, cacar: criarCacador({ wiki: base, busca: `${base}/html/` }),
    quadro: { wiki: base, clima: { url: `${base}/v1/forecast` } } }).listen(0, '127.0.0.1');
  await new Promise(r => app.once('listening', r));
  appBase = `http://127.0.0.1:${app.address().port}`;
});
after(async () => { wiki.close(); app.close(); await rm(pasta, { recursive: true, force: true }); });

const MD = paraMarkdown({ criatura: 'Mimir', tema: 'salar de Uyuni', fonte: 'extrativo', termos: ['sal'],
  paginas: [{ titulo: 'Salar de Uyuni', url: 'https://pt.wikipedia.org/wiki/Salar_de_Uyuni' }],
  resumo: '**Salar de Uyuni**: O Salar de Uyuni é o maior deserto de sal do mundo. Ele tem 10.582 km² de área no sudoeste da Bolívia. Quando chove vira um espelho.' },
  new Date('2026-11-08T12:00:00Z'));

test('le a cacada gravada em markdown', () => {
  const c = lerCacada(MD);
  assert.equal(c.criatura, 'Mimir');
  assert.equal(c.tema, 'salar de Uyuni');
  assert.deepEqual(c.fontes, ['https://pt.wikipedia.org/wiki/Salar_de_Uyuni']);
  assert.match(c.resumo, /maior deserto de sal/);
});

test('ficha sem IA: duas frases, titulo e numero curioso', () => {
  const f = fichaExtrativa(lerCacada(MD));
  assert.equal(f.titulo, 'Salar de Uyuni');
  assert.equal(f.texto, 'O Salar de Uyuni é o maior deserto de sal do mundo. Ele tem 10.582 km² de área no sudoeste da Bolívia.');
  assert.equal(f.numero, '10.582 km²');
  assert.equal(f.numeroLegenda, 'de área no sudoeste da Bolívia');
  assert.ok(!f.texto.includes('**'));
});

test('ficha sem numero nao inventa um', () => {
  const f = fichaExtrativa({ tema: 'polvo', resumo: 'Polvos tem tres coracoes. E sangue azul.', fontes: [] });
  assert.equal(f.numero, '');
  assert.equal(f.texto, 'Polvos tem tres coracoes. E sangue azul.');
});

test('clima em palavras', () => {
  assert.equal(descreverTempo(0), 'céu limpo');
  assert.equal(descreverTempo(3), 'nublado');
  assert.equal(descreverTempo(63), 'chuva');
  assert.equal(descreverTempo(95), 'trovoadas');
});

test('cacada vira ficha com foto da wiki, servida pelo quadro', async () => {
  const r = await fetch(`${appBase}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura: 'Odin', tema: 'centopeia' }) });
  assert.equal(r.status, 200);
  const fichas = await (await fetch(`${appBase}/api/quadro`)).json();
  assert.equal(fichas.length, 1);
  assert.equal(fichas[0].tema, 'centopeia');
  const f = fichas[0];
  assert.equal(f.criatura, 'Odin');
  assert.equal(f.titulo, 'Centopeia');
  assert.match(f.imagem, /^\/api\/quadro\/imagem\/[a-z0-9-]+\.png$/);
  // principal + duas do artigo; logo e miniatura ficam de fora
  assert.equal(f.imagens.length, 3);
  assert.equal(f.imagens[0], f.imagem);
  const img = await fetch(appBase + f.imagem);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  // segunda chamada vem do cache (mesma ficha)
  assert.deepEqual(await (await fetch(`${appBase}/api/quadro`)).json(), fichas);
});

test('tema repetido aparece uma vez so, e tema da sala ganha categoria', async () => {
  await fetch(`${appBase}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura: 'Mimir', tema: 'centopeia' }) });
  await fetch(`${appBase}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura: 'Iris', tema: 'Polvo' }) });
  const fichas = await (await fetch(`${appBase}/api/quadro`)).json();
  assert.equal(fichas.filter(f => f.tema === 'centopeia').length, 1);
  assert.equal(fichas.find(f => f.tema === 'Polvo')?.categoria, 'Animal');
});

test('imagem do quadro nao sai da pasta', async () => {
  for (const nome of ['..%2F..%2Fetc%2Fpasswd', 'x.md', '..%2Fquadro.json']) {
    const r = await fetch(`${appBase}/api/quadro/imagem/${nome}`);
    assert.equal(r.status, 404, nome);
  }
});

test('clima do Open-Meteo', async () => {
  const c = await (await fetch(`${appBase}/api/clima`)).json();
  assert.deepEqual(c, { temperatura: 27, codigo: 0, dia: true, texto: 'céu limpo' });
});

test('markdown estranho na pasta nao derruba o quadro', async () => {
  await writeFile(join(pasta, '0000-lixo.md'), 'sem cabecalho nenhum');
  const r = await fetch(`${appBase}/api/quadro`);
  assert.equal(r.status, 200);
});
