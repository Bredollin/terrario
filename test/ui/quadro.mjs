// Abre o quadro de curiosidades (TV da sala) com uma wiki de mentira, deixa
// as criaturas cacarem e tira capturas em 1920x1080 e 1366x768.
// Uso: node test/ui/quadro.mjs [pasta]  (padrao: capturas/)
import { createRequire } from 'node:module';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { criarServidor } from '../../server.mjs';
import { criarCacador } from '../../src/cacador.mjs';
import { wikiFalsa } from '../wiki-falsa.mjs';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const saida = resolve(process.argv[2] ?? 'capturas');
await mkdir(saida, { recursive: true });
const ouvir = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));
const wiki = wikiFalsa();
const base = await ouvir(wiki);
const pasta = await mkdtemp(join(tmpdir(), 'terrario-quadro-'));
const app = criarServidor({ saida: pasta, cacar: criarCacador({ wiki: base, busca: `${base}/html/` }),
  quadro: { wiki: base, clima: { url: `${base}/v1/forecast` } } });
const url = await ouvir(app);
// algumas cacadas antes de abrir a tela
for (const [criatura, tema] of [['Mimir', 'artropode'], ['Thoth', 'Polvo'], ['Odin', 'centopeia']])
  await fetch(`${url}/api/cacar`, { method: 'POST', body: JSON.stringify({ criatura, tema }) });

const nav = await chromium.launch();
const erros = [];
for (const [w, h, nome] of [[1920, 1080, '10-quadro.png'], [1366, 768, '11-quadro-1366.png']]) {
  const pag = await nav.newPage({ viewport: { width: w, height: h } });
  pag.on('pageerror', e => erros.push(e.message));
  await pag.goto(`${url}/quadro.html?intervalo=0&troca=4&noite=0`);
  await pag.waitForFunction(() => window.quadro?.fichas.length >= 3, null, { timeout: 15000 });
  await pag.waitForTimeout(2500);
  const r = await pag.evaluate(() => {
    const caixa = s => document.querySelector(s).getBoundingClientRect();
    const q = caixa('.quadro'), d = caixa('.data'), c = caixa('.canto');
    return { fichas: quadro.fichas.length, titulo: document.getElementById('titulo').textContent,
      clima: document.getElementById('tempo').textContent, encosta: d.left < q.right || c.left < q.right,
      miniaturas: document.querySelectorAll('#miniaturas span').length };
  });
  console.log(nome, r);
  if (r.encosta) throw new Error('data/hora encostando no quadro');
  if (!r.clima.includes('27°')) throw new Error('clima nao apareceu');
  if (r.titulo === 'Centopeia' && r.miniaturas !== 3) throw new Error('fotos do tema nao apareceram');
  await pag.screenshot({ path: join(saida, nome) });
  await pag.close();
}
if (erros.length) throw new Error(erros.join('\n'));
await nav.close(); app.close(); wiki.close();
console.log('ok');
