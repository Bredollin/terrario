// App de desktop do Terrario: sobe o servidor local, mostra o terrario, solta
// as criaturas na area de trabalho, roda o protetor de tela animado e, se
// ligado, pinta uma imagem nova para a tela de bloqueio a cada bloqueio.
// Chamado como protetor de tela (Terrario.scr /s, /p, /c) so roda o protetor.
import { app, BrowserWindow, Tray, Menu, nativeImage, powerMonitor, screen, shell, Notification, ipcMain, dialog } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { criarServidor } from '../server.mjs';
import { criarCacador } from '../src/cacador.mjs';
import { SCRIPT_BLOQUEIO } from './bloqueio-ps.mjs';
import { SCRIPT_LIGAR_PROTETOR, SCRIPT_DESLIGAR_PROTETOR } from './protetor-ps.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ICONE = join(AQUI, '..', 'build', 'icon.png');
const PASTA = join(app.getPath('documents'), 'Terrario');
const TELAS = join(PASTA, 'telas');
const CONFIG = join(app.getPath('userData'), 'config.json');
const MANTER_TELAS = 12;

const MINUTOS = [1, 3, 5, 10, 15, 30];

let cfg = { criaturas: true, bloqueio: false, area: false, protetor: false, protetorMinutos: 5, iniciarComWindows: false,
  ligadas: [], elenco: [], saida: join(PASTA, 'conhecimento') };
let base = '', janela = null, bandeja = null, saindo = false, gerando = null, area = null, protetores = [];

// Windows chama o protetor de tela com /s (mostrar), /p <janela> (miniatura) ou
// /c (configurar); clicar duas vezes no .scr nao manda nada e conta como /c.
const executavel = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
const argProtetor = process.argv.slice(1).map(a => /^[/-]([scp])(\b|:|$)/i.exec(a)?.[1].toLowerCase()).find(Boolean);
const modoProtetor = argProtetor ?? (/\.scr$/i.test(executavel) ? 'c' : null);

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

// roda um script do Windows PowerShell 5.1 com tempo limite; parametros vao como argumentos, nunca no texto
async function powershell(nome, texto, args) {
  const script = join(app.getPath('userData'), nome);
  await writeFile(script, texto);
  return new Promise((ok, falha) => execFile('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args],
    { timeout: 40000, windowsHide: true },
    (erro, saida, err) => erro ? falha(new Error((err || erro.message).trim().split('\n')[0])) : ok(saida)));
}

async function aplicarTela(arquivo) {
  if (process.platform !== 'win32') throw new Error('Trocar a tela de bloqueio so funciona no Windows.');
  await powershell('bloqueio.ps1', SCRIPT_BLOQUEIO, ['-Imagem', arquivo]);
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

// ------------------------------------------------------------ area de trabalho
// Janela transparente do tamanho da tela (sem a barra de tarefas), sempre no
// topo, que nao pega foco e deixa o clique passar para o que esta embaixo.
function abrirArea() {
  if (area) return;
  const { workArea } = screen.getPrimaryDisplay();
  area = new BrowserWindow({
    ...workArea, show: false, transparent: true, frame: false, resizable: false, movable: false, focusable: false,
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, backgroundColor: '#00000000', title: 'Terrário · área de trabalho',
    webPreferences: { contextIsolation: true, sandbox: true, preload: join(AQUI, 'preload-area.cjs'), backgroundThrottling: false },
  });
  area.setAlwaysOnTop(true, 'screen-saver');
  area.setIgnoreMouseEvents(true, { forward: true });
  area.setVisibleOnAllWorkspaces(true);
  area.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  area.webContents.on('will-navigate', e => e.preventDefault());
  // janela transparente: no Windows o ready-to-show pode nao vir, entao mostra quando a pagina carrega
  area.webContents.once('did-finish-load', () => { area?.showInactive(); area?.setAlwaysOnTop(true, 'screen-saver'); });
  area.on('closed', () => { area = null; });
  area.loadURL(`${base}/area.html`);
}
function fecharArea() { area?.destroy(); area = null; }
function enviarArea() { area?.webContents.send('area:criaturas', cfg.elenco); }
function ajustarArea() { if (area) area.setBounds(screen.getPrimaryDisplay().workArea); }
ipcMain.on('area:pronta', enviarArea);

// ------------------------------------------------------------ protetor de tela
// Uma janela em tela cheia por monitor. Qualquer tecla, clique ou mexida fecha.
function verProtetor({ aoSair } = {}) {
  if (protetores.length) return;
  const semente = new Date().toISOString();
  protetores = screen.getAllDisplays().map((tela, i) => {
    const w = new BrowserWindow({
      ...tela.bounds, show: false, frame: false, fullscreen: true, alwaysOnTop: true, skipTaskbar: true,
      backgroundColor: '#02030a', title: 'Terrário · protetor de tela',
      webPreferences: { contextIsolation: true, sandbox: true, preload: join(AQUI, 'preload-protetor.cjs') },
    });
    w.setAlwaysOnTop(true, 'screen-saver');
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    w.webContents.on('will-navigate', e => e.preventDefault());
    w.once('ready-to-show', () => { w.show(); if (i === 0) w.focus(); });
    // cada monitor com um desenho proprio; o relogio so no principal
    const principal = tela.id === screen.getPrimaryDisplay().id;
    w.loadURL(`${base}/protetor.html?${new URLSearchParams({ semente: `${semente}:${i}`, relogio: principal ? '1' : '0' })}`);
    w.on('closed', () => { protetores = protetores.filter(x => x !== w); if (!protetores.length) aoSair?.(); });
    return w;
  });
}
function fecharProtetor() { for (const w of [...protetores]) w.destroy(); }
ipcMain.on('protetor:sair', fecharProtetor);

// O .scr e uma copia do proprio Terrario.exe; o Windows chama ele quando o PC fica parado.
const SCR = join(process.env.LOCALAPPDATA || app.getPath('userData'), 'Terrario', 'Terrario.scr');
async function instalarProtetor() {
  if (process.platform !== 'win32') throw new Error('O protetor de tela so instala no Windows.');
  if (!process.env.PORTABLE_EXECUTABLE_FILE) throw new Error('Abra pelo Terrario.exe para instalar o protetor.');
  await mkdir(dirname(SCR), { recursive: true });
  if (executavel.toLowerCase() !== SCR.toLowerCase()) await copyFile(executavel, SCR);
  await powershell('protetor.ps1', SCRIPT_LIGAR_PROTETOR, ['-Scr', SCR, '-Minutos', String(cfg.protetorMinutos)]);
}
async function desinstalarProtetor() {
  if (process.platform !== 'win32') return;
  await powershell('protetor-off.ps1', SCRIPT_DESLIGAR_PROTETOR, ['-Scr', SCR]);
}

// ------------------------------------------------------------ ponte com a tela
const estado = () => ({ bloqueio: cfg.bloqueio, criaturas: cfg.criaturas, area: cfg.area, protetor: cfg.protetor, protetorMinutos: cfg.protetorMinutos });
function avisarTela() { janela?.webContents.send('terrario:estado', estado()); }
const COR = /^#[0-9a-f]{6}$/i, ID = /^[\w-]{1,40}$/;
ipcMain.on('terrario:ligadas', (_e, lista) => {
  if (!Array.isArray(lista)) return;
  // aceita so ids (versao velha) ou {id, nome, cor, n, vel}
  cfg.elenco = lista.slice(0, 40).map(d => typeof d === 'string' ? { id: d } : d).filter(d => d && ID.test(d.id ?? ''))
    .map(d => ({ id: d.id, nome: String(d.nome ?? d.id).slice(0, 40), cor: COR.test(d.cor) ? d.cor : '#ffd23f',
      n: Math.max(6, Math.min(20, Math.round(Number(d.n) || 12))), vel: Math.max(0.3, Math.min(2, Number(d.vel) || 1)) }));
  cfg.ligadas = cfg.elenco.map(d => d.id);
  enviarArea();
  salvarConfig().catch(() => {});
});
ipcMain.handle('terrario:estado', estado);
ipcMain.handle('terrario:bloqueio', async (_e, liga) => {
  if (liga) await novaTela({ mostrar: true }); // so liga se conseguiu trocar
  cfg.bloqueio = liga;
  await salvarConfig();
  montarMenu();
  return estado();
});
ipcMain.handle('terrario:area', async (_e, liga) => { await mudarArea(liga); return estado(); });
ipcMain.handle('terrario:protetor', async (_e, liga) => { await mudarProtetor(liga); return estado(); });
ipcMain.handle('terrario:ver-protetor', () => verProtetor());

async function mudarArea(liga) {
  cfg.area = liga;
  liga ? abrirArea() : fecharArea();
  await salvarConfig();
  montarMenu(); avisarTela();
}
async function mudarProtetor(liga) {
  try {
    liga ? await instalarProtetor() : await desinstalarProtetor();
  } catch (e) {
    avisar('Protetor de tela', `Nao consegui: ${e.message}`);
    montarMenu(); avisarTela();
    throw e;
  }
  cfg.protetor = liga;
  await salvarConfig();
  montarMenu(); avisarTela();
}
async function mudarMinutos(m) {
  cfg.protetorMinutos = m;
  await salvarConfig();
  if (cfg.protetor) await instalarProtetor().catch(e => avisar('Protetor de tela', `Nao consegui: ${e.message}`));
  montarMenu(); avisarTela();
}

// ------------------------------------------------------------ bandeja
function montarMenu() {
  const alternar = (chave, fn) => async item => { cfg[chave] = item.checked; await salvarConfig(); fn?.(item.checked); montarMenu(); };
  bandeja.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir terrário', click: abrirTerrario, enabled: cfg.criaturas },
    { type: 'separator' },
    { label: 'Criaturas', type: 'checkbox', checked: cfg.criaturas, click: alternar('criaturas', liga => liga ? abrirTerrario() : fecharTerrario()) },
    { label: 'Criaturas na área de trabalho', type: 'checkbox', checked: cfg.area, click: item => mudarArea(item.checked) },
    { type: 'separator' },
    { label: 'Protetor de tela animado', type: 'checkbox', checked: cfg.protetor, click: item => mudarProtetor(item.checked).catch(() => {}) },
    { label: 'Protetor entra depois de', submenu: MINUTOS.map(m => ({ label: `${m} min`, type: 'radio', checked: cfg.protetorMinutos === m, click: () => mudarMinutos(m) })) },
    { label: 'Ver protetor de tela agora', click: () => verProtetor() },
    { type: 'separator' },
    { label: 'Imagem nova na tela de bloqueio', type: 'checkbox', checked: cfg.bloqueio, click: alternar('bloqueio', liga => liga && novaTela({ mostrar: true }).catch(() => {})) },
    { label: 'Gerar imagem de bloqueio agora', click: () => novaTela({ mostrar: true }).catch(() => {}) },
    { type: 'separator' },
    { label: 'Abrir pasta das telas', click: async () => { await mkdir(TELAS, { recursive: true }); shell.openPath(TELAS); } },
    { label: 'Abrir pasta do conhecimento', click: async () => { await mkdir(cfg.saida, { recursive: true }); shell.openPath(cfg.saida); } },
    { label: 'Iniciar com o Windows', type: 'checkbox', checked: cfg.iniciarComWindows, click: alternar('iniciarComWindows', liga => app.setLoginItemSettings({
      openAtLogin: liga, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--bandeja'] })) },
    { type: 'separator' },
    { label: 'Sair', click: () => { saindo = true; app.quit(); } },
  ]));
  bandeja.setToolTip(`Terrário · área de trabalho ${cfg.area ? 'ligada' : 'desligada'} · protetor ${cfg.protetor ? `${cfg.protetorMinutos} min` : 'desligado'}`);
  avisarTela();
}

// ------------------------------------------------------------ inicio
if (modoProtetor) {
  // processo so do protetor: nao pega a trava do app, nao mexe na config nem na bandeja
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    if (modoProtetor === 'p') return app.quit(); // miniatura da janela do Windows: fica vazia
    if (modoProtetor === 'c') {
      await dialog.showMessageBox({ type: 'info', title: 'Terrário', message: 'Protetor de tela do Terrário',
        detail: 'Sete movimentos abstratos que se revezam sozinhos. Para mudar o tempo, use o ícone do Terrário na bandeja: "Protetor entra depois de".' });
      return app.quit();
    }
    await subirServidor();
    verProtetor({ aoSair: () => app.quit() });
  });
} else if (!app.requestSingleInstanceLock()) app.quit();
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
    if (cfg.area) abrirArea();
    screen.on('display-metrics-changed', ajustarArea);
    screen.on('display-added', ajustarArea);
    screen.on('display-removed', ajustarArea);
    // bloqueado ninguem ve: a area de trabalho para de desenhar
    powerMonitor.on('lock-screen', () => area?.hide());
    powerMonitor.on('unlock-screen', () => area?.showInactive());
    // a cada bloqueio, pinta a proxima tela
    powerMonitor.on('lock-screen', () => cfg.bloqueio && novaTela().catch(() => {}));
    if (process.env.TERRARIO_TESTE) globalThis.terrarioTeste = { gerarTela, verProtetor, fecharProtetor,
      get area() { return area; }, get protetores() { return protetores; }, get base() { return base; }, get cfg() { return cfg; } };
  });
}
