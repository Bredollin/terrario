// Modo area de trabalho: as criaturas ligadas andam pela tela inteira, numa
// janela transparente que deixa o clique passar. Sem fundo, sem vidro: so elas.
// Fora do app (navegador): ?elenco=xavier,mimir&fundo=1 para ver e testar.
import { ELENCO } from './elenco.js';
import { Criatura, rgba } from './criatura.js';

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
const q = new URLSearchParams(location.search);
let W = 0, H = 0, DPR = 1, tempo = 0;
const mouse = { x: -999, y: -999 };
let ondas = [];
const mundo = { ctx, mouse, fugir: true, folhas: [], get W() { return W; }, get H() { return H; },
  get tempo() { return tempo; }, get ondas() { return ondas; } };
let criaturas = [];

// so para captura de tela fora do app: um fundo que imita uma area de trabalho
const fundo = q.has('fundo');

function redimensionar() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  tela.width = W * DPR; tela.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', redimensionar);
// com a janela "furada", o Windows ainda manda o movimento do mouse
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });

// lista de {id, nome, cor, n, vel}: quem ja esta fica, quem saiu some com um estalo
function definir(lista) {
  const ids = new Set(lista.map(d => d.id));
  for (const c of criaturas.filter(c => !ids.has(c.id)))
    for (const s of c.segs.filter((_, i) => i % 3 === 0)) ondas.push({ x: s.x, y: s.y, r: 2, cor: c.cor, vida: 0.7 });
  criaturas = criaturas.filter(c => ids.has(c.id));
  for (const d of lista) {
    const viva = criaturas.find(c => c.id === d.id);
    if (viva) { viva.nome = d.nome; continue; }
    // entra por uma borda da tela, como quem chega de fora
    const lado = Math.floor(Math.random() * 4);
    const x = lado === 0 ? -20 : lado === 1 ? W + 20 : 80 + Math.random() * (W - 160);
    const y = lado === 2 ? -20 : lado === 3 ? H + 20 : 80 + Math.random() * (H - 160);
    const c = new Criatura({ ...d, x, y }, mundo);
    c.alvo = { x: W / 2 + (Math.random() - 0.5) * W * 0.5, y: H / 2 + (Math.random() - 0.5) * H * 0.4 };
    c.ang = Math.atan2(c.alvo.y - y, c.alvo.x - x);
    criaturas.push(c);
  }
}

function desenhaFundoFalso() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b2a4a'); g.addColorStop(1, '#3a2350');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(245,247,255,0.92)';
  ctx.beginPath(); ctx.roundRect(W * 0.18, H * 0.14, W * 0.5, H * 0.58, 8); ctx.fill();
  ctx.fillStyle = '#2b5cd8'; ctx.fillRect(W * 0.18, H * 0.14, W * 0.5, 30);
  ctx.fillStyle = 'rgba(40,45,70,0.35)';
  for (let i = 0; i < 12; i++) ctx.fillRect(W * 0.21, H * 0.14 + 60 + i * 26, W * (0.2 + ((i * 37) % 23) / 100), 8);
  ctx.fillStyle = 'rgba(12,14,24,0.92)'; ctx.fillRect(0, H - 44, W, 44);
}

const PASSO = 1 / 40; // 40 quadros por segundo bastam e poupam a CPU
let antes = performance.now(), acumulado = 0;
function quadro(agora) {
  requestAnimationFrame(quadro);
  acumulado += Math.min(0.1, (agora - antes) / 1000);
  antes = agora;
  if (acumulado < PASSO) return;
  const dt = Math.min(0.05, acumulado); acumulado = 0;
  tempo += dt;
  ctx.clearRect(0, 0, W, H);
  if (fundo) desenhaFundoFalso();
  for (const o of ondas) {
    o.r += 90 * dt; o.vida -= dt * 1.1;
    ctx.strokeStyle = rgba(o.cor, Math.max(0, o.vida) * 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.stroke();
  }
  ondas = ondas.filter(o => o.vida > 0);
  for (const c of criaturas) { c.atualizar(dt); c.desenhar(false); }
}

redimensionar();
const ponte = window.terrarioArea ?? null;
if (ponte) ponte.aoMudar(definir);
else {
  const ids = (q.get('elenco') || 'xavier,mimir,iris').split(',');
  definir(ELENCO.filter(d => ids.includes(d.id)));
}
requestAnimationFrame(quadro);
window.area = { get criaturas() { return criaturas; }, definir, mouse };
