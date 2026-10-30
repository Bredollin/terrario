// App de desktop do Terrario: sobe o servidor local, mostra o terrario e,
// se ligado, pinta uma tela de bloqueio nova a cada bloqueio do Windows.
import { app, BrowserWindow, Tray, Menu, nativeImage, powerMonitor, screen, shell, Notification, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { criarServidor } from '../server.mjs';
import { criarCacador } from '../src/cacador.mjs';
import { SCRIPT_BLOQUEIO } from './bloqueio-ps.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ICONE = join(AQUI, '..', 'build', 'icon.png');
const PASTA = join(app.getPath('documents'), 'Terrario');
const TELAS = join(PASTA, 'telas');
const CONFIG = join(app.getPath('userData'), 'config.json');
const MANTER_TELAS = 12;

let cfg = { criaturas: true, bloqueio: false, iniciarComWindows: false, ligadas: [], saida: join(PASTA, 'conhecimento') };
let base = '', janela = null, bandeja = null, saindo = false, gerando = null;

async function lerConfig() {
  try { cfg = { ...cfg, ...JSON.parse(await readFile(CONFIG, 'utf8')) }; } catch {}
}
async function salvarConfig() {
  await mkdir(dirname(CONFIG), { recursive: true });
  await writeFile(CONFIG, JSON.stringify(cfg, null, 2));
}

function avisar(titulo, corpo) {
  if (Notification.isSupported()) new Notification({ title: titulo, body: corpo, icon: ICONE }).show();
}

// ------------------------------------------------------------ servidor
async function subirServidor() {
  const cacar = criarCacador({ chave: process.env.ANTHROPIC_API_KEY || '', modelo: process.env.TERRARIO_MODELO || undefined });
  const srv = criarServidor({ saida: cfg.saida, cacar });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
}

// ------------------------------------------------------------ janela
function abrirTerrario() {
  if (janela) { janela.show(); janela.focus(); return; }
  janela = new BrowserWindow({
    width: 1360, height: 860, minWidth: 820, minHeight: 560,
    title: 'Terrário', icon: ICONE, backgroundColor: '#04060d', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, preload: join(AQUI, 'preload.cjs') },
  });
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  janela.webContents.on('will-navigate', e => e.preventDefault());
  janela.loadURL(base);
  // fechar a janela nao desliga: o terrario fica na bandeja
  janela.on('close', e => { if (!saindo) { e.preventDefault(); janela.hide(); } });
  janela.on('closed', () => { janela = null; });
}

function fecharTerrario() {
  if (!janela) return;
  janela.destroy();
  janela = null;
}

// ------------------------------------------------------------ tela de bloqueio
async function gerarTela() {
  const tela = screen.getPrimaryDisplay();
  const w = Math.round(tela.size.width * tela.scaleFactor), h = Math.round(tela.size.height * tela.scaleFactor);
  const semente = new Date().toISOString();
  const oculta = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { contextIsolation: true, sandbox: true } });
  try {
    await oculta.loadURL(`${base}/bloqueio.html?${new URLSearchParams({ semente, w: String(w), h: String(h), elenco: cfg.ligadas.join(',') })}`);
    for (let i = 0; i < 100 && !(await oculta.webContents.executeJavaScript('window.pronto === true')); i++) await new Promise(r => setTimeout(r, 100));
    const dados = await oculta.webContents.executeJavaScript(`document.getElementById('c').toDataURL('image/jpeg', 0.93)`);
    await mkdir(TELAS, { recursive: true });
    const arquivo = join(TELAS, `${semente.replace(/[:.]/g, '-')}.jpg`);
    await writeFile(arquivo, Buffer.from(dados.split(',')[1], 'base64'));
    // guarda so as ultimas
    const velhas = (await readdir(TELAS)).filter(n => n.endsWith('.jpg')).sort().reverse().slice(MANTER_TELAS);
    await Promise.all(velhas.map(n => rm(join(TELAS, n), { force: true })));
    return arquivo;
  } finally {
    oculta.destroy();
  }
}

async function aplicarTela(arquivo) {
  if (process.platform !== 'win32') throw new Error('Trocar a tela de bloqueio so funciona no Windows.');
  const script = join(app.getPath('userData'), 'bloqueio.ps1');
  await writeFile(script, SCRIPT_BLOQUEIO);
  await new Promise((ok, falha) => execFile('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Imagem', arquivo],
    { timeout: 40000, windowsHide: true },
    (erro, saida, err) => erro ? falha(new Error((err || erro.message).trim().split('\n')[0])) : ok(saida)));
}

// uma de cada vez: se ja esta gerando, espera a mesma
function novaTela({ mostrar = false } = {}) {
  gerando ??= (async () => {
    try {
      const arquivo = await gerarTela();
      await aplicarTela(arquivo);
      if (mostrar) avisar('Tela de bloqueio nova', 'Aperte Win+L para ver.');
      return arquivo;
    } catch (e) {
      avisar('Tela de bloqueio', `Nao consegui trocar: ${e.message}`);
      throw e;
    } finally { gerando = null; }
  })();
  return gerando;
}

// ------------------------------------------------------------ ponte com a tela
ipcMain.on('terrario:ligadas', (_e, ids) => {
  if (!Array.isArray(ids)) return;
  cfg.ligadas = ids.filter(i => typeof i === 'string' && /^[\w-]{1,40}$/.test(i)).slice(0, 40);
  salvarConfig().catch(() => {});
});
ipcMain.handle('terrario:estado', () => ({ bloqueio: cfg.bloqueio, criaturas: cfg.criaturas }));
ipcMain.handle('terrario:bloqueio', async (_e, liga) => {
  if (liga) await novaTela({ mostrar: true }); // so liga se conseguiu trocar
  cfg.bloqueio = liga;
  await salvarConfig();
  montarMenu();
  return cfg.bloqueio;
});

// ------------------------------------------------------------ bandeja
function montarMenu() {
  const alternar = (chave, fn) => async item => { cfg[chave] = item.checked; await salvarConfig(); fn?.(item.checked); montarMenu(); };
  bandeja.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir terrário', click: abrirTerrario, enabled: cfg.criaturas },
    { type: 'separator' },
    { label: 'Criaturas', type: 'checkbox', checked: cfg.criaturas, click: alternar('criaturas', liga => liga ? abrirTerrario() : fecharTerrario()) },
    { label: 'Tela de bloqueio generativa', type: 'checkbox', checked: cfg.bloqueio, click: alternar('bloqueio', liga => liga && novaTela({ mostrar: true }).catch(() => {})) },
    { label: 'Gerar tela de bloqueio agora', click: () => novaTela({ mostrar: true }).catch(() => {}) },
    { type: 'separator' },
    { label: 'Abrir pasta das telas', click: async () => { await mkdir(TELAS, { recursive: true }); shell.openPath(TELAS); } },
    { label: 'Abrir pasta do conhecimento', click: async () => { await mkdir(cfg.saida, { recursive: true }); shell.openPath(cfg.saida); } },
    { label: 'Iniciar com o Windows', type: 'checkbox', checked: cfg.iniciarComWindows, click: alternar('iniciarComWindows', liga => app.setLoginItemSettings({
      openAtLogin: liga, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--bandeja'] })) },
    { type: 'separator' },
    { label: 'Sair', click: () => { saindo = true; app.quit(); } },
  ]));
  bandeja.setToolTip(`Terrário · criaturas ${cfg.criaturas ? 'ligadas' : 'desligadas'} · tela de bloqueio ${cfg.bloqueio ? 'ligada' : 'desligada'}`);
}

// ------------------------------------------------------------ inicio
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => cfg.criaturas && abrirTerrario());
  app.on('window-all-closed', () => {}); // vive na bandeja
  app.on('before-quit', () => { saindo = true; });
  app.whenReady().then(async () => {
    app.setAppUserModelId('br.bredollin.terrario');
    await lerConfig();
    await subirServidor();
    bandeja = new Tray(nativeImage.createFromPath(ICONE).resize({ width: 16, height: 16 }));
    bandeja.on('click', () => cfg.criaturas && abrirTerrario());
    montarMenu();
    if (cfg.criaturas && !process.argv.includes('--bandeja')) abrirTerrario();
    // a cada bloqueio, pinta a proxima tela
    powerMonitor.on('lock-screen', () => cfg.bloqueio && novaTela().catch(() => {}));
    if (process.env.TERRARIO_TESTE) globalThis.terrarioTeste = { gerarTela, get base() { return base; }, get cfg() { return cfg; } };
  });
}
