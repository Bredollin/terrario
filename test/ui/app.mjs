// Abre o app de desktop (Electron), confere a janela e gera uma tela de bloqueio.
// Uso: npm run test:app [pasta]   (no Linux sem tela: xvfb-run -a npm run test:app)
import { createRequire } from 'node:module';
import { mkdir, copyFile, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { _electron } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const saida = resolve(process.argv[2] ?? 'capturas');
await mkdir(saida, { recursive: true });
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
await app.close();
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log('ok');
