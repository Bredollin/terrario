import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarCacador, slug, termos, htmlParaTexto, validarLink, paraMarkdown, linksDaBusca } from '../src/cacador.mjs';
import { criarServidor } from '../server.mjs';
import { wikiFalsa } from './wiki-falsa.mjs';

let wiki, base, pasta, app, appBase;
before(async () => {
  wiki = wikiFalsa().listen(0, '127.0.0.1');
  await new Promise(r => wiki.once('listening', r));
  base = `http://127.0.0.1:${wiki.address().port}`;
  pasta = await mkdtemp(join(tmpdir(), 'terrario-'));
  app = criarServidor({ saida: pasta, cacar: criarCacador({ wiki: base, permitirPrivado: true }) }).listen(0, '127.0.0.1');
  await new Promise(r => app.once('listening', r));
  appBase = `http://127.0.0.1:${app.address().port}`;
});
after(async () => { wiki.close(); app.close(); await rm(pasta, { recursive: true, force: true }); });

test('slug tira acento e espaco', () => {
  assert.equal(slug('Centopéias da Amazônia!'), 'centopeias-da-amazonia');
  assert.equal(slug('***'), 'sem-nome');
});

test('termos ignora palavras vazias', () => {
  const t = termos(['as pernas das centopeias e as pernas dos miriapodes']);
  assert.equal(t[0], 'pernas');
  assert.ok(!t.includes('das'));
});

test('html vira texto sem script', () => {
  assert.equal(htmlParaTexto('<p>Oi</p><script>mal()</script><b>mundo</b>'), 'Oi\n mundo');
});

test('link da rede interna e recusado', async () => {
  await assert.rejects(validarLink('http://127.0.0.1/x'), /rede interna/);
  await assert.rejects(validarLink('http://192.168.0.1/'), /rede interna/);
  await assert.rejects(validarLink('file:///etc/passwd'), /http/);
});

test('caca um tema e le as paginas', async () => {
  const r = await criarCacador({ wiki: base, busca: `${base}/html/` })({ tema: 'centopeia' });
  assert.deepEqual(r.paginas.map(p => p.titulo), ['Centopeia', 'Miriapode', 'Artropode']);
  assert.match(r.resumo, /\*\*Centopeia\*\*/);
  assert.equal(r.fonte, 'extrativo');
  assert.ok(r.termos.includes('segmentado'));
});

test('tema sem resultado da erro claro', async () => {
  await assert.rejects(criarCacador({ wiki: base, busca: `${base}/nada/` })({ tema: 'nada' }), /Nada encontrado/);
});

test('markdown tem cabecalho, resumo e fontes', () => {
  const md = paraMarkdown({ criatura: 'Lumen', tema: 'x', paginas: [{ titulo: 'T', url: 'https://e.x/t' }], resumo: 'R', termos: ['a'], fonte: 'extrativo' }, new Date('2026-10-30T12:00:00Z'));
  assert.match(md, /^---\ncriatura: "Lumen"/);
  assert.match(md, /## Fontes\n\n1\. \[T\]\(https:\/\/e\.x\/t\)/);
});

test('servidor grava o markdown e lista o conhecimento', async () => {
  const r = await fetch(`${appBase}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura: 'Quíron', tema: 'centopeia' }) });
  assert.equal(r.status, 200);
  const dado = await r.json();
  assert.match(dado.arquivo, /^\d{4}-\d{2}-\d{2}-quiron-centopeia\.md$/);
  assert.deepEqual(await readdir(pasta), [dado.arquivo]);
  assert.match(await readFile(join(pasta, dado.arquivo), 'utf8'), /Cacado por Quíron/);
  const lista = await (await fetch(`${appBase}/api/conhecimento`)).json();
  assert.equal(lista[0].arquivo, dado.arquivo);
});

test('servidor le um link solto', async () => {
  const r = await (await fetch(`${appBase}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura: 'Mirra', link: `${base}/artigo` }) })).json();
  assert.equal(r.paginas[0].titulo, 'Polvos');
  assert.match(r.paginas[0].texto, /tres coracoes/);
  assert.doesNotMatch(r.paginas[0].texto, /x\(\)/);
});

test('servidor nao entrega arquivo fora de public', async () => {
  const r = await fetch(`${appBase}/..%2Fserver.mjs`);
  assert.notEqual(r.status, 200);
  assert.equal((await fetch(`${appBase}/`)).status, 200);
});

test('busca na web livre junto com a Wikipedia', async () => {
  const links = linksDaBusca('<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexemplo.org%2Fa&amp;rut=1">A</a><a class="result__a" href="https://duckduckgo.com/y.js?ad_x=1">ad</a>');
  assert.deepEqual(links, ['https://exemplo.org/a']);
  const r = await criarCacador({ wiki: base, busca: `${base}/html/`, permitirPrivado: true })({ tema: 'centopeia' });
  assert.ok(r.paginas.some(p => p.titulo === 'Guia das centopeias'), 'pagina da web entrou');
  assert.ok(r.paginas.some(p => p.url.includes('/wiki/')), 'Wikipedia continua');
  assert.equal(r.paginas.length, 3);
});
