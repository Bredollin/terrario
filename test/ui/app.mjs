// Abre o app de desktop (Electron), confere a janela e gera uma tela de bloqueio.
// Uso: npm run test:app [pasta]   (no Linux sem tela: xvfb-run -a npm run test:app)
import { createRequire } from 'node:module';
import { mkdir, copyFile, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const { _electron } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const saida = resolve(process.argv[2] ?? 'capturas');
await mkdir(saida, { recursive: true });
// espera uma janela do app cujo endereco contenha o trecho
async function esperarJanela(app, trecho) {
  for (let i = 0; i < 100; i++) {
    const w = app.windows().find(p => p.url().includes(trecho));
    if (w) return w;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('janela nao abriu: ' + trecho);
}
const casa = await mkdtemp(join(tmpdir(), 'terrario-app-'));

const electron = createRequire(import.meta.url)('electron');
const app = await _electron.launch({ executablePath: electron, args: ['.', '--no-sandbox'], env: { ...process.env, TERRARIO_TESTE: '1', HOME: casa, XDG_CONFIG_HOME: casa } });
const erros = [];
const janela = await app.firstWindow();
janela.on('pageerror', e => erros.push(e.message));
await janela.setViewportSize({ width: 1360, height: 860 });
await janela.waitForTimeout(2500);
const ponte = await janela.evaluate(() => typeof window.terrarioApp?.bloqueio);
if (ponte !== 'function') throw new Error('ponte do app ausente');
await janela.screenshot({ path: join(saida, 'app-01-janela.png') });
const arquivo = await app.evaluate(() => globalThis.terrarioTeste.gerarTela());
const { size } = await stat(arquivo);
console.log('tela gerada', arquivo, Math.round(size / 1024), 'KB');
await copyFile(arquivo, join(saida, 'app-02-tela-de-bloqueio.jpg'));
// fora do Windows, ligar a tela de bloqueio tem de falhar com mensagem clara
const msg = await janela.evaluate(() => window.terrarioApp.bloqueio(true).then(() => 'ligou', e => e.message));
console.log('ligar fora do Windows:', msg);
// o protetor de tela tambem so instala no Windows, e a chave volta para desligada
const msgProt = await janela.evaluate(() => window.terrarioApp.protetor(true).then(() => 'ligou', e => e.message));
console.log('protetor fora do Windows:', msgProt);
if (msgProt === 'ligou') throw new Error('protetor ligou fora do Windows');

// area de trabalho: janela transparente, no topo, que deixa o clique passar
const estado = await janela.evaluate(() => window.terrarioApp.area(true));
if (!estado.area) throw new Error('area nao ligou');
const area = await esperarJanela(app, 'area.html');
await area.waitForFunction(() => window.area?.criaturas.length > 0);
const ids = await area.evaluate(() => window.area.criaturas.map(c => c.id).join(','));
console.log('na area de trabalho:', ids);
const props = await app.evaluate(() => { const w = globalThis.terrarioTeste.area;
  return { topo: w.isAlwaysOnTop(), foco: w.isFocusable(), borda: w.getBounds().width > 0 }; });
if (!props.topo || props.foco) throw new Error('area de trabalho errada: ' + JSON.stringify(props));
// desligar uma criatura no terrario some com ela na area
await janela.evaluate(() => terrario.alternar('mimir'));
await area.waitForFunction(() => !window.area.criaturas.some(c => c.id === 'mimir'));
await area.waitForTimeout(1500);
await area.screenshot({ path: join(saida, 'app-03-area-transparente.png'), omitBackground: true });
await janela.evaluate(() => window.terrarioApp.area(false));
await new Promise(r => setTimeout(r, 400));
if (await app.evaluate(() => !!globalThis.terrarioTeste.area)) throw new Error('area nao desligou');

// protetor de tela pelo app: abre em tela cheia e fecha com uma tecla
await app.evaluate(() => globalThis.terrarioTeste.verProtetor());
const prot = await esperarJanela(app, 'protetor.html');
await prot.waitForFunction(() => window.pronto === true);
await prot.waitForTimeout(3000);
await prot.screenshot({ path: join(saida, 'app-04-protetor.png') });
await prot.keyboard.press('a').catch(() => {}); // a janela fecha no meio do aperto
await new Promise(r => setTimeout(r, 600));
if (await app.evaluate(() => globalThis.terrarioTeste.protetores.length)) throw new Error('protetor nao fechou com tecla');
await app.close();

// como o Windows chama o .scr: /p sai na hora; /s mostra e sai com uma tecla
const miniatura = spawn(electron, ['.', '--no-sandbox', '/p', '1234'], { env: { ...process.env, HOME: casa, XDG_CONFIG_HOME: casa } });
await Promise.race([new Promise(r => miniatura.once('exit', r)), new Promise((_, n) => setTimeout(() => n(new Error('/p nao saiu')), 15000))]);
console.log('/p saiu');
const scr = await _electron.launch({ executablePath: electron, args: ['.', '--no-sandbox', '/s'], env: { ...process.env, HOME: casa, XDG_CONFIG_HOME: casa } });
const tela = await scr.firstWindow();
await tela.waitForFunction(() => window.pronto === true);
if (!tela.url().includes('protetor.html')) throw new Error('/s nao abriu o protetor: ' + tela.url());
await tela.waitForTimeout(1500);
const saiu = new Promise(r => scr.process().once('exit', r));
await tela.keyboard.press('Escape').catch(() => {});
await Promise.race([saiu, new Promise((_, n) => setTimeout(() => n(new Error('/s nao fechou')), 8000))]);
console.log('/s abriu e fechou com tecla');
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log('ok');
