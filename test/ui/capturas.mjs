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
// os primeiros passos sao manuais: desliga a caca sozinha
await pag.click('#btn-sozinhas');
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
await pag.waitForTimeout(4000);
const cena = await pag.evaluate(() => document.getElementById('previa-quadro').contentWindow.protetor.cena);
console.log('previa do protetor:', cena);
await foto('01c-previa-protetor.png');
await pag.click('#previa-outra');
await pag.waitForTimeout(3000);
if (!(await pag.evaluate(() => document.getElementById('previa-quadro').contentWindow.protetor.cena)).includes('>')) throw new Error('proximo movimento nao fundiu');
await pag.click('#previa-fechar');
// fora do app, as chaves dos modos so avisam
await pag.click('#btn-area');
if (await pag.getAttribute('#btn-area', 'aria-checked') !== 'false') throw new Error('chave da area ligou fora do app');
await pag.fill('#tema', 'centopeia');
const inicio = Date.now();
await pag.click('#btn-cacar');
await pag.waitForTimeout(900);
await foto('02-farejando.png');
await pag.waitForTimeout(7000);
await foto('03-lendo.png');
await pag.waitForFunction(() => terrario.criaturas[0].estado === 'vagando', null, { timeout: 90000 });
// 3 paginas, uma delas longa: a leitura tem de acabar, sem a criatura ficar rodando
const segundos = (Date.now() - inicio) / 1000;
console.log(`cacada de 3 paginas em ${segundos.toFixed(1)} s`);
if (segundos > 75) throw new Error(`cacada demorou demais (${segundos} s)`);
await pag.waitForTimeout(600);
await foto('04-depois.png');
// desligar no meio da cacada: tem de sair na hora, sem travar
await pag.fill('#tema', 'miriapode');
await pag.click('#btn-cacar');
await pag.waitForFunction(() => terrario.criaturas[0].estado === 'lendo', null, { timeout: 30000 });
await pag.click('.chip:has-text("Xavier") .liga');
await pag.waitForTimeout(500);
if ((await ligadas()).includes('xavier')) throw new Error('Xavier nao desligou durante a cacada');
await pag.click('.chip:has-text("Xavier") .liga');
await pag.waitForTimeout(300);
if (!(await ligadas()).includes('xavier')) throw new Error('Xavier nao religou');
// caca sozinha: liga e, sem tema nenhum, alguma criatura escolhe e caca
const antes = await pag.evaluate(() => document.getElementById('qtd').textContent);
await pag.click('#btn-sozinhas');
await pag.waitForFunction(() => terrario.criaturas.some(c => c.estado !== 'vagando' && /escolheu|lendo/.test(c.legenda)), null, { timeout: 20000 });
const quem = await pag.evaluate(() => terrario.criaturas.filter(c => c.estado !== 'vagando').map(c => `${c.nome}: ${c.legenda}`).join(', '));
console.log('caca sozinha:', quem);
await pag.waitForFunction(n => document.getElementById('qtd').textContent !== n, antes, { timeout: 90000 });
await foto('04b-caca-sozinha.png');
await pag.click('#btn-sozinhas');
await pag.click('#btn-saber');
await pag.click('.item summary');
await pag.waitForTimeout(300);
await foto('05-conhecimento.png');

// protetor de tela: cada movimento sozinho, sem criaturas
const movimentos = ['fluxo', 'aurora', 'rede', 'harmonografo', 'mandala', 'tunel', 'ondas'];
const quadro = await nav.newPage({ viewport: { width: 1600, height: 900 } });
quadro.on('pageerror', e => erros.push(e.message));
for (const [i, so] of movimentos.entries()) {
  await quadro.goto(`${url}/protetor.html?so=${so}&semente=captura-${i}`);
  await quadro.waitForTimeout(so === 'harmonografo' || so === 'mandala' ? 12000 : 6000);
  await quadro.screenshot({ path: join(saida, `06-protetor-${i + 1}-${so}.png`) });
  console.log('captura protetor', so);
}
// imagem parada da tela de bloqueio: um instante do protetor, sem relogio
await quadro.goto(`${url}/bloqueio.html?semente=captura&w=1920&h=1080`);
await quadro.waitForFunction(() => window.pronto === true, null, { timeout: 60000 });
await quadro.screenshot({ path: join(saida, '07-imagem-bloqueio.png') });
// area de trabalho: criaturas sobre um fundo que imita o Windows
await quadro.goto(`${url}/area.html?fundo=1&elenco=xavier,mimir,batman,stark,iris`);
await quadro.waitForTimeout(5000);
if (await quadro.evaluate(() => area.criaturas.length) !== 5) throw new Error('area de trabalho sem as 5 criaturas');
await quadro.mouse.move(800, 450);
await quadro.waitForTimeout(1500);
await quadro.screenshot({ path: join(saida, '08-area-de-trabalho.png') });
await quadro.evaluate(() => area.definir([{ id: 'stark', nome: 'Stark', cor: '#ff3b3b', n: 13, vel: 1.3 }]));
await quadro.waitForTimeout(300);
if (await quadro.evaluate(() => area.criaturas.map(c => c.id).join()) !== 'stark') throw new Error('area nao desligou as criaturas');

await nav.close(); app.close(); wiki.close();
await rm(pasta, { recursive: true, force: true });
if (erros.length) { console.error('Erros na tela:\n' + erros.join('\n')); process.exit(1); }
console.log('ok, sem erros na tela');
