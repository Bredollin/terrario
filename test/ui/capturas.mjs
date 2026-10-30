// Abre o terrario no Chromium, faz uma criatura cacar e tira capturas.
// Uso: npm run test:ui [pasta]  (padrao: capturas/)
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { criarServidor } from '../../server.mjs';
import { criarCacador } from '../../src/cacador.mjs';
import { wikiFalsa } from '../wiki-falsa.mjs';

// playwright pode estar instalado globalmente (fora do projeto)
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const saida = resolve(process.argv[2] ?? 'capturas');
await mkdir(saida, { recursive: true });
const ouvir = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));
const wiki = wikiFalsa();
const base = await ouvir(wiki);
const pasta = await mkdtemp(join(tmpdir(), 'terrario-ui-'));
const app = criarServidor({ saida: pasta, cacar: criarCacador({ wiki: base }) });
const url = await ouvir(app);

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
pag.on('pageerror', e => erros.push(e.message));
pag.on('console', m => m.type() === 'error' && erros.push(m.text()));
const foto = async nome => { await pag.screenshot({ path: join(saida, nome) }); console.log('captura', nome); };

await pag.goto(url);
await pag.waitForTimeout(3500);
await foto('01-terrario.png');
// liga mais duas e desliga uma: cada criatura tem a sua chave
const ligadas = () => pag.evaluate(() => terrario.criaturas.map(c => c.id).join(','));
await pag.click('.chip:has-text("Batman") .liga');
await pag.click('.chip:has-text("Stark") .liga');
await pag.click('.chip:has-text("Iris") .liga');
if (await ligadas() !== 'xavier,mimir,batman,stark') throw new Error('chaves erradas: ' + await ligadas());
await pag.waitForTimeout(1500);
await foto('01b-chaves.png');
await pag.click('#btn-previa');
await pag.frameLocator('#previa-quadro').locator('body').waitFor();
await pag.waitForFunction(() => document.getElementById('previa-quadro').contentWindow.pronto === true);
const atores = await pag.evaluate(() => document.getElementById('previa-quadro').contentWindow.resultado.atores);
if (atores.some(a => !['Xavier', 'Mimir', 'Batman', 'Stark'].includes(a))) throw new Error('previa com criatura desligada: ' + atores);
await foto('01c-previa-bloqueio.png');
await pag.click('#previa-fechar');
await pag.fill('#tema', 'centopeia');
await pag.click('#btn-cacar');
await pag.waitForTimeout(900);
await foto('02-farejando.png');
await pag.waitForTimeout(7000);
await foto('03-lendo.png');
await pag.waitForFunction(() => terrario.criaturas[0].estado === 'vagando', null, { timeout: 90000 });
await pag.waitForTimeout(600);
await foto('04-depois.png');
await pag.click('#btn-saber');
await pag.click('.item summary');
await pag.waitForTimeout(300);
await foto('05-conhecimento.png');

await nav.close(); app.close(); wiki.close();
await rm(pasta, { recursive: true, force: true });
if (erros.length) { console.error('Erros na tela:\n' + erros.join('\n')); process.exit(1); }
console.log('ok, sem erros na tela');
