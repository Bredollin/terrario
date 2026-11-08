// Abre o terrario com ?quiosque (monitor da sala) e confere: sem controles,
// todas as criaturas do elenco ligadas, cacando sozinhas. Tira uma captura.
// Uso: node test/ui/quiosque.mjs [pasta]  (padrao: capturas/)
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
const pasta = await mkdtemp(join(tmpdir(), 'terrario-quiosque-'));
const app = criarServidor({ saida: pasta, cacar: criarCacador({ wiki: base, busca: `${base}/html/` }) });
const url = await ouvir(app);

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
const erros = [];
pag.on('pageerror', e => erros.push(e.message));
await pag.goto(`${url}/?quiosque&intervalo=5`);
await pag.waitForTimeout(1500);
const r = await pag.evaluate(() => ({
  vivas: terrario.criaturas.length, elenco: terrario.elenco.length,
  doca: getComputedStyle(document.querySelector('.doca')).display,
  sozinhas: document.getElementById('btn-sozinhas').getAttribute('aria-checked'),
}));
console.log(r);
if (r.vivas !== r.elenco) throw new Error('nem todas ligadas');
if (r.doca !== 'none') throw new Error('controles aparecendo');
if (r.sozinhas !== 'true') throw new Error('nao cacam sozinhas');
// com intervalo curto, alguma deve sair cacando sozinha
await pag.waitForFunction(() => terrario.criaturas.some(c => c.estado !== 'vagando'), null, { timeout: 20000 });
await pag.waitForTimeout(4000);
await pag.screenshot({ path: join(saida, '09-quiosque.png') });
console.log('captura 09-quiosque.png');
if (erros.length) throw new Error(erros.join('\n'));
await nav.close(); app.close(); wiki.close();
