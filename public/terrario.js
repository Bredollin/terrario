// Terrario: fundo vivo, criaturas de blocos com pernas de grafo e a leitura
// das paginas que elas cacam. Tudo em canvas 2D, sem bibliotecas.
import { ELENCO } from './elenco.js';

const CORES = ['#ffd23f', '#3ee6ff', '#ff5fd2', '#9dff57', '#ff8a3d', '#b18cff', '#5effc8', '#ff4f6d'];
const NOMES = ['Quiron', 'Lumen', 'Mirra', 'Tessela', 'Vespa', 'Orvalho', 'Fiandeira', 'Brasa', 'Nimbo', 'Sarca'];
const MAX = 20;
const PERNA = '#6f7dff';

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
let W = 0, H = 0, DPR = 1, tempo = 0;
const mouse = { x: -999, y: -999 };

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const suave = t => t * t * (3 - 2 * t);
const angDif = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Brilho pre-renderizado: muito mais barato que shadowBlur.
const brilhos = new Map();
function brilho(cor) {
  if (brilhos.has(cor)) return brilhos.get(cor);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, rgba(cor, 0.9));
  grad.addColorStop(0.25, rgba(cor, 0.35));
  grad.addColorStop(1, rgba(cor, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  brilhos.set(cor, c);
  return c;
}
function pintaBrilho(x, y, r, cor, a = 1) {
  ctx.globalAlpha = a;
  ctx.drawImage(brilho(cor), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- fundo
const fundo = document.createElement('canvas');
let nos = [], esporos = [], auroras = [];

function montaFundo() {
  fundo.width = W * DPR; fundo.height = H * DPR;
  const g = fundo.getContext('2d');
  g.scale(DPR, DPR);
  const r = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  r.addColorStop(0, '#0d1236');
  r.addColorStop(0.5, '#070a1f');
  r.addColorStop(1, '#020309');
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
  // grade de pontos
  g.fillStyle = 'rgba(140,155,255,0.07)';
  for (let x = 14; x < W; x += 28) for (let y = 14; y < H; y += 28) g.fillRect(x, y, 1.2, 1.2);
  // vinheta
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);

  const area = W * H;
  nos = Array.from({ length: Math.round(area / 16000) }, () => ({
    x: rand(0, W), y: rand(0, H), vx: rand(-4, 4), vy: rand(-4, 4), luz: 0 }));
  esporos = Array.from({ length: Math.round(area / 9000) }, () => ({
    x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.8), v: rand(4, 14), f: rand(0, 6.28),
    cor: Math.random() < 0.7 ? '#9fb0ff' : CORES[(Math.random() * 3) | 0] }));
  auroras = [
    { cor: '#3b2bff', x: 0.2, y: 0.25, r: 0.55, f: 0 },
    { cor: '#00b3c7', x: 0.8, y: 0.7, r: 0.5, f: 2 },
    { cor: '#a0189c', x: 0.65, y: 0.15, r: 0.4, f: 4 },
  ];
}

function desenhaFundo(dt) {
  ctx.drawImage(fundo, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const a of auroras) {
    const x = W * (a.x + Math.sin(tempo * 0.05 + a.f) * 0.08);
    const y = H * (a.y + Math.cos(tempo * 0.04 + a.f) * 0.06);
    pintaBrilho(x, y, Math.max(W, H) * a.r, a.cor, 0.09);
  }
  // rede: a "internet" por baixo do terrario. Acende perto das criaturas.
  const cabecas = criaturas.map(c => c.segs[0]);
  for (const n of nos) {
    n.x += n.vx * dt; n.y += n.vy * dt;
    if (n.x < 0 || n.x > W) n.vx *= -1;
    if (n.y < 0 || n.y > H) n.vy *= -1;
    let perto = 0;
    for (const c of cabecas) perto = Math.max(perto, 1 - dist(n, c) / 220);
    n.luz = lerp(n.luz, Math.max(0, perto), Math.min(1, dt * 3));
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < nos.length; i++) {
    for (let j = i + 1; j < nos.length; j++) {
      const a = nos[i], b = nos[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 150) continue;
      const luz = Math.max(a.luz, b.luz);
      ctx.strokeStyle = `rgba(111,125,255,${(1 - d / 150) * (0.06 + luz * 0.35)})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  for (const n of nos) {
    ctx.fillStyle = `rgba(160,175,255,${0.18 + n.luz * 0.7})`;
    ctx.fillRect(n.x - 1.2, n.y - 1.2, 2.4, 2.4);
    if (n.luz > 0.2) pintaBrilho(n.x, n.y, 10, PERNA, n.luz * 0.6);
  }
  for (const e of esporos) {
    e.y -= e.v * dt; e.x += Math.sin(tempo * 0.6 + e.f) * 6 * dt;
    if (e.y < -5) { e.y = H + 5; e.x = rand(0, W); }
    const piscar = 0.45 + 0.55 * Math.sin(tempo * 1.7 + e.f * 3);
    pintaBrilho(e.x, e.y, e.r * 5, e.cor, 0.22 * piscar);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Moldura de vidro do terrario.
function desenhaVidro() {
  const m = 16, r = 26;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(m, m, W - m * 2, H - m * 2, r);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(190,200,255,0.35)');
  g.addColorStop(0.5, 'rgba(110,125,255,0.08)');
  g.addColorStop(1, 'rgba(255,210,63,0.22)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // reflexo
  ctx.globalCompositeOperation = 'lighter';
  const ref = ctx.createLinearGradient(m, m, m + 260, m + 260);
  ref.addColorStop(0, 'rgba(255,255,255,0.07)');
  ref.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = ref;
  ctx.beginPath();
  ctx.moveTo(m + r, m); ctx.lineTo(m + 300, m); ctx.lineTo(m, m + 300); ctx.lineTo(m, m + r);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- criatura
class Criatura {
  constructor({ id, nome, cor, papel = '', tema = '', vel = 1, x = rand(200, W - 200), y = rand(160, H - 220), n = 13 }) {
    Object.assign(this, { id, nome, cor, papel, tema, ritmo: vel, n });
    this.semente = Math.random() * 100;
    this.ang = rand(0, 6.28);
    this.vel = 40;
    this.espaco = 15;
    this.segs = Array.from({ length: n }, (_, i) => ({
      x: x - Math.cos(this.ang) * i * this.espaco, y: y - Math.sin(this.ang) * i * this.espaco, a: this.ang,
      tam: 11 * (1 - (i / n) * 0.45), bits: (Math.random() * 16) | 0, troca: rand(0, 1) }));
    this.pernas = [];
    for (let i = 1; i < n - 1; i++) for (const lado of [-1, 1]) {
      const s = this.segs[i];
      this.pernas.push({ i, lado, pe: { x: s.x, y: s.y }, de: null, para: null, t: 1 });
    }
    this.alvo = null;
    this.rota = [];
    this.estado = 'vagando';
    this.legenda = '';
    this.susto = 0;
    this.lendo = 0;
    this.noAlvo = 0;
  }

  get cabeca() { return this.segs[0]; }

  cutucar(de) {
    this.susto = 1;
    this.ang = Math.atan2(this.cabeca.y - de.y, this.cabeca.x - de.x) + rand(-0.4, 0.4);
    for (const s of this.segs) s.bits = 15;
    ondas.push({ x: this.cabeca.x, y: this.cabeca.y, r: 6, cor: this.cor, vida: 1 });
    if (this.estado === 'vagando') this.alvo = null;
  }

  atualizar(dt) {
    const c = this.cabeca;
    this.susto = Math.max(0, this.susto - dt * 0.9);
    let velAlvo = 42 * this.ritmo, giro = 2.2, alvoAng = this.ang;

    if (this.estado === 'farejando') {
      alvoAng = this.ang + 2.6 * dt * 20;
      velAlvo = 55; giro = 2.6;
    } else {
      if (this.rota.length) {
        if (this.alvo !== this.rota[0]) { this.alvo = this.rota[0]; this.noAlvo = 0; }
        this.noAlvo += dt;
        // chegou, ou ficou rodando em volta do ponto: segue para o proximo
        if (dist(c, this.alvo) < 12 || this.noAlvo > 1.5) { this.rota.shift(); this.alvo = this.rota[0] ?? null; this.noAlvo = 0; }
        // freia quando o ponto esta de lado ou atras, para nao orbitar
        const desvio = this.alvo ? Math.abs(angDif(this.ang, Math.atan2(this.alvo.y - c.y, this.alvo.x - c.x))) : 0;
        velAlvo = 175 * Math.max(0.2, Math.cos(Math.min(desvio, Math.PI / 2))); giro = 7;
      } else if (!this.alvo || dist(c, this.alvo) < 40 || Math.random() < dt * 0.05) {
        this.alvo = { x: rand(120, W - 120), y: rand(120, H - 200) };
      }
      if (this.alvo) alvoAng = Math.atan2(this.alvo.y - c.y, this.alvo.x - c.x);
      if (!this.rota.length) {
        alvoAng += Math.sin(tempo * 1.1 + this.semente) * 0.7;
        const dm = dist(c, mouse);
        if (dm < 240 && dm > 50 && this.susto === 0) alvoAng = Math.atan2(mouse.y - c.y, mouse.x - c.x);
      }
    }
    // quem esta vagando da a vez para quem esta lendo
    if (this.estado === 'vagando') for (const f of folhas) {
      if (c.x > f.x - 50 && c.x < f.x + f.w + 50 && c.y > f.y - 50 && c.y < f.y + f.h + 50) {
        alvoAng = Math.atan2(c.y - (f.y + f.h / 2), c.x - (f.x + f.w / 2)); giro = 4; this.alvo = null;
      }
    }
    // paredes do vidro
    const m = 70;
    if (c.x < m || c.x > W - m || c.y < m || c.y > H - m) {
      alvoAng = Math.atan2(H / 2 - c.y, W / 2 - c.x); giro = Math.max(giro, 4);
    }
    if (this.susto > 0) { velAlvo = 150 + this.susto * 120; giro = 3; alvoAng = this.ang; }
    this.ang += Math.max(-giro * dt, Math.min(giro * dt, angDif(this.ang, alvoAng)));
    this.vel = lerp(this.vel, velAlvo, Math.min(1, dt * 2.5));
    c.x += Math.cos(this.ang) * this.vel * dt;
    c.y += Math.sin(this.ang) * this.vel * dt;
    c.a = this.ang;

    // corpo: cada bloco segue o anterior a uma distancia fixa
    for (let i = 1; i < this.segs.length; i++) {
      const a = this.segs[i - 1], s = this.segs[i];
      const ang = Math.atan2(a.y - s.y, a.x - s.x);
      s.x = a.x - Math.cos(ang) * this.espaco;
      s.y = a.y - Math.sin(ang) * this.espaco;
      s.a = ang;
    }
    // bits piscando: mais rapido quando le ou leva susto
    const ritmo = this.estado === 'vagando' ? 0.6 : 7;
    for (const s of this.segs) {
      s.troca -= dt * (ritmo + this.susto * 10);
      if (s.troca < 0) { s.troca = rand(0.3, 1); s.bits = (Math.random() * 16) | 0; }
    }
    // pernas: passo alternado, pe fica plantado ate esticar demais
    for (const p of this.pernas) {
      const s = this.segs[p.i];
      const alcance = s.tam * 2.1 + 6;
      const lat = s.a + p.lado * Math.PI / 2;
      const ideal = { x: s.x + Math.cos(lat) * alcance + Math.cos(s.a) * alcance * 0.35,
        y: s.y + Math.sin(lat) * alcance + Math.sin(s.a) * alcance * 0.35 };
      if (p.t < 1) {
        p.t = Math.min(1, p.t + dt / 0.11);
        const k = suave(p.t);
        p.pe.x = lerp(p.de.x, p.para.x, k); p.pe.y = lerp(p.de.y, p.para.y, k);
      } else if (dist(p.pe, ideal) > alcance * 0.85) {
        const vizinhos = this.pernas.filter(q => q !== p && Math.abs(q.i - p.i) <= 1 && q.t < 1);
        if (!vizinhos.length) {
          p.de = { ...p.pe };
          p.para = { x: ideal.x + Math.cos(s.a) * alcance * 0.5, y: ideal.y + Math.sin(s.a) * alcance * 0.5 };
          p.t = 0;
        }
      }
    }
  }

  desenhar(selecionada) {
    const { cor, segs } = this;
    // aura: quadrados finos girando, como estados ao redor do corpo
    ctx.lineWidth = 1;
    for (let i = 2; i < segs.length; i += 3) {
      const s = segs[i];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a + tempo * 0.25 * (i % 2 ? 1 : -1) + i);
      ctx.strokeStyle = rgba(PERNA, 0.13 + (this.estado !== 'vagando' ? 0.12 : 0));
      const q = s.tam * 3.4;
      ctx.strokeRect(-q / 2, -q / 2, q, q);
      ctx.restore();
    }
    if (selecionada) {
      ctx.strokeStyle = rgba(cor, 0.35 + Math.sin(tempo * 4) * 0.15);
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(segs[0].x, segs[0].y, 30, 0, 6.28); ctx.stroke();
      ctx.setLineDash([]);
    }
    // pernas de grafo
    ctx.lineWidth = 1.2;
    for (const p of this.pernas) {
      const s = segs[p.i];
      const mx = (s.x + p.pe.x) / 2, my = (s.y + p.pe.y) / 2;
      const dx = p.pe.x - s.x, dy = p.pe.y - s.y, d = Math.hypot(dx, dy) || 1;
      const ergue = p.t < 1 ? Math.sin(p.t * Math.PI) * 7 : 0;
      const dobra = s.tam * 0.6 + ergue;
      const jx = mx + (-dy / d) * dobra * p.lado * -1 + Math.cos(s.a) * dobra * 0.6;
      const jy = my + (dx / d) * dobra * p.lado * -1 + Math.sin(s.a) * dobra * 0.6;
      ctx.strokeStyle = rgba(PERNA, 0.75);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(jx, jy); ctx.lineTo(p.pe.x, p.pe.y); ctx.stroke();
      ctx.fillStyle = cor;
      ctx.beginPath(); ctx.arc(jx, jy, 1.9, 0, 6.28); ctx.fill();
      ctx.strokeStyle = rgba(cor, 0.8);
      ctx.strokeRect(p.pe.x - 2, p.pe.y - 2, 4, 4);
    }
    // ligacoes entre pes vizinhos: o corpo vira uma constelacao
    ctx.strokeStyle = rgba(PERNA, 0.16);
    ctx.beginPath();
    for (const p of this.pernas) {
      const q = this.pernas.find(o => o.lado === p.lado && o.i === p.i + 2);
      if (q) { ctx.moveTo(p.pe.x, p.pe.y); ctx.lineTo(q.pe.x, q.pe.y); }
    }
    ctx.stroke();

    // brilho do corpo
    ctx.globalCompositeOperation = 'lighter';
    const forca = 0.22 + this.susto * 0.4 + (this.estado !== 'vagando' ? 0.15 : 0);
    for (let i = segs.length - 1; i >= 0; i -= 2) pintaBrilho(segs[i].x, segs[i].y, segs[i].tam * 3.2, cor, forca);
    ctx.globalCompositeOperation = 'source-over';

    // espinha
    ctx.strokeStyle = rgba(cor, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    segs.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y));
    ctx.stroke();

    // blocos com 4 celulas
    for (let i = segs.length - 1; i >= 1; i--) {
      const s = segs[i], t = s.tam;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.fillStyle = 'rgba(6,8,22,0.85)';
      ctx.strokeStyle = cor;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-t, -t, t * 2, t * 2, 3); ctx.fill(); ctx.stroke();
      const c = t * 0.42, g = t * 0.12;
      for (let b = 0; b < 4; b++) {
        const bx = (b % 2 ? g : -g - c * 2) + 0, by = (b < 2 ? -g - c * 2 : g);
        const aceso = (s.bits >> b) & 1;
        ctx.fillStyle = aceso ? (this.susto > 0.5 ? '#ffffff' : cor) : rgba(cor, 0.12);
        ctx.fillRect(bx, by, c * 2, c * 2);
      }
      ctx.restore();
    }
    // cabeca: anel com mira girando e antenas
    const h = segs[0], r = h.tam * 1.15;
    const balanco = Math.sin(tempo * 6 + this.semente) * 0.25;
    const mundo = (px, py) => ({ x: h.x + Math.cos(h.a) * px - Math.sin(h.a) * py, y: h.y + Math.sin(h.a) * px + Math.cos(h.a) * py });
    ctx.strokeStyle = rgba(cor, 0.85);
    ctx.lineWidth = 1.3;
    for (const lado of [-1, 1]) {
      const a = mundo(r * 0.6, lado * r * 0.4), m = mundo(r * 1.8, lado * r * 1.9), p = mundo(r * 3.2, lado * r * (1.6 + balanco * lado));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, p.x, p.y); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      pintaBrilho(p.x, p.y, 7 + (this.estado === 'farejando' ? Math.sin(tempo * 10) * 4 + 4 : 0), cor, 0.9);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.a);
    ctx.fillStyle = 'rgba(6,8,22,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = cor; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.rotate(tempo * (this.estado === 'vagando' ? 0.8 : 4));
    ctx.strokeStyle = rgba(cor, 0.7); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); }
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.28); ctx.fill();
    ctx.restore();

    // nome
    // nome na frente da cabeca, longe do corpo, sobre uma pilula escura
    const lx = h.x + Math.cos(h.a) * 52, ly = h.y + Math.sin(h.a) * 40 + 4;
    const linhas = [this.nome.toUpperCase(), this.estado === 'vagando' ? '' : this.legenda].filter(Boolean);
    ctx.font = '11px "JetBrains Mono", Consolas, monospace';
    const larg = Math.max(...linhas.map(l => ctx.measureText(l).width)) + 14;
    const alt = linhas.length * 14 + 6;
    ctx.fillStyle = 'rgba(5,7,18,0.72)';
    ctx.beginPath(); ctx.roundRect(lx - larg / 2, ly - alt / 2 - 4, larg, alt, 6); ctx.fill();
    ctx.textAlign = 'center';
    linhas.forEach((l, i) => {
      ctx.fillStyle = i ? 'rgba(200,208,255,0.75)' : rgba(cor, 0.95);
      ctx.fillText(l, lx, ly - alt / 2 + 9 + i * 14);
    });
    ctx.textAlign = 'left';
  }
}

// ---------------------------------------------------------------- leitura
// Folha: a pagina que a criatura percorre palavra por palavra.
class Folha {
  constructor({ titulo, texto, url }, termos, criatura) {
    this.titulo = titulo; this.url = url; this.criatura = criatura;
    this.alfa = 0; this.saindo = false;
    const larg = Math.min(560, W * 0.62);
    this.x = Math.max(60, (W - larg) / 2 + rand(-80, 80));
    this.y = Math.max(110, H * 0.22 + rand(-30, 30));
    this.w = larg;
    ctx.font = '15px Georgia, "Times New Roman", serif';
    const palavras = texto.split(/\s+/).filter(Boolean);
    const linhas = [[]];
    let largura = 0;
    const espaco = ctx.measureText(' ').width;
    for (const p of palavras) {
      const lw = ctx.measureText(p).width;
      if (largura + lw > larg - 40 && linhas.at(-1).length) {
        if (linhas.length === 7) break;
        linhas.push([]); largura = 0;
      }
      linhas.at(-1).push({ p, lw, x: 20 + largura });
      largura += lw + espaco;
    }
    const tset = new Set(termos.map(t => t.toLowerCase()));
    this.palavras = [];
    linhas.forEach((l, li) => l.forEach(w => this.palavras.push({
      ...w, y: 66 + li * 27, lida: 0, termo: tset.has(w.p.toLowerCase().replace(/[^\p{L}-]/gu, '')) })));
    this.h = 66 + linhas.length * 27 + 12;
    // caminho em zigue-zague sobre as linhas
    this.rota = [];
    linhas.forEach((l, li) => {
      const ws = this.palavras.filter(w => w.y === 66 + li * 27);
      (li % 2 ? [...ws].reverse() : ws).forEach(w =>
        this.rota.push({ x: this.x + w.x + w.lw / 2, y: this.y + w.y - 5 }));
    });
  }

  atualizar(dt) {
    this.alfa = this.saindo ? Math.max(0, this.alfa - dt * 1.2) : Math.min(1, this.alfa + dt * 2);
    const c = this.criatura.cabeca;
    for (const w of this.palavras) {
      if (w.lida) { w.lida = Math.min(1, w.lida + dt * 3); continue; }
      const px = this.x + w.x, py = this.y + w.y;
      if (c.x > px - 8 && c.x < px + w.lw + 8 && Math.abs(c.y - (py - 5)) < 16) {
        w.lida = 0.01;
        if (w.termo) rotulos.push(new Rotulo(w.p.replace(/[^\p{L}-]/gu, ''), px + w.lw / 2, py - 5, this.criatura.cor, this));
      }
    }
  }

  desenhar() {
    if (!this.alfa) return;
    const { x, y, w, h } = this;
    ctx.save();
    ctx.globalAlpha = this.alfa;
    ctx.fillStyle = 'rgba(8,11,30,0.72)';
    ctx.strokeStyle = 'rgba(130,145,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.font = '600 20px Georgia, serif';
    ctx.fillStyle = '#eef0ff';
    ctx.fillText(this.titulo.slice(0, 48), x + 20, y + 34);
    ctx.font = '10px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = 'rgba(140,150,200,0.7)';
    ctx.fillText((this.url ?? '').replace(/^https?:\/\//, '').slice(0, 70), x + 20, y + 50);
    ctx.font = '15px Georgia, "Times New Roman", serif';
    const cor = this.criatura.cor;
    for (const p of this.palavras) {
      const px = x + p.x, py = y + p.y;
      if (p.termo) {
        ctx.fillStyle = p.lida ? rgba(cor, 0.4 + p.lida * 0.6) : 'rgba(130,145,255,0.55)';
        if (p.lida) { ctx.fillRect(px, py + 4, p.lw * p.lida, 1.3); }
      } else {
        ctx.fillStyle = `rgba(215,222,255,${0.28 + p.lida * 0.62})`;
      }
      ctx.fillText(p.p, px, py);
    }
    ctx.restore();
  }
}

// Rotulo: termo descoberto que sai flutuando, como num cladograma.
class Rotulo {
  constructor(texto, x, y, cor, folha) {
    this.texto = texto[0].toUpperCase() + texto.slice(1);
    this.ax = x; this.ay = y; this.x = x; this.y = y; this.cor = cor;
    const a = rand(0, 6.28), d = rand(110, 240);
    this.tx = Math.min(W - 120, Math.max(80, x + Math.cos(a) * d));
    this.ty = Math.min(H - 180, Math.max(90, y + Math.sin(a) * d));
    // nao pousa em cima da folha: sobe ou desce ate sair dela
    if (folha && this.tx > folha.x - 100 && this.tx < folha.x + folha.w + 20 && this.ty > folha.y - 20 && this.ty < folha.y + folha.h + 20) {
      this.ty = this.ty < folha.y + folha.h / 2 ? folha.y - rand(24, 110) : folha.y + folha.h + rand(24, 130);
    }
    this.vida = 1; this.idade = 0;
  }
  atualizar(dt) {
    this.idade += dt;
    const k = Math.min(1, dt * 1.6);
    this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k);
    this.tx += Math.sin(this.idade * 0.3) * 4 * dt;
    if (this.idade > 14) this.vida -= dt / 30;
  }
  desenhar() {
    const a = Math.max(0, this.vida);
    ctx.strokeStyle = rgba(PERNA, 0.28 * a);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.ax, this.ay); ctx.lineTo(this.x, this.ay); ctx.lineTo(this.x, this.y); ctx.stroke();
    ctx.fillStyle = rgba(this.cor, a);
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    ctx.font = '13px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = `rgba(150,165,255,${0.85 * a})`;
    ctx.fillText(this.texto, this.x + 8, this.y + 4);
  }
}

// Orbe: o conhecimento voando ate a gaveta.
class Orbe {
  constructor(de, para, cor, fim) { Object.assign(this, { de, para, cor, fim, t: 0, rastro: [] }); }
  atualizar(dt) {
    this.t = Math.min(1, this.t + dt / 1.4);
    const k = suave(this.t);
    const cx = (this.de.x + this.para.x) / 2, cy = Math.min(this.de.y, this.para.y) - 220;
    const x = (1 - k) ** 2 * this.de.x + 2 * (1 - k) * k * cx + k * k * this.para.x;
    const y = (1 - k) ** 2 * this.de.y + 2 * (1 - k) * k * cy + k * k * this.para.y;
    this.rastro.push({ x, y });
    if (this.rastro.length > 26) this.rastro.shift();
    if (this.t === 1 && this.fim) { this.fim(); this.fim = null; }
  }
  desenhar() {
    ctx.globalCompositeOperation = 'lighter';
    this.rastro.forEach((p, i) => pintaBrilho(p.x, p.y, 4 + i * 0.7, this.cor, (i / this.rastro.length) * 0.5));
    const p = this.rastro.at(-1);
    if (p) pintaBrilho(p.x, p.y, 30, this.cor, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------------------- estado
let criaturas = [];
let folhas = [], rotulos = [], ondas = [], orbes = [];
let escolhida = null;

const lista = document.getElementById('lista');
const form = document.getElementById('form-caca');
const campo = document.getElementById('tema');
const botaoCacar = document.getElementById('btn-cacar');
const alvo = document.getElementById('alvo');
const gaveta = document.getElementById('gaveta');
const botaoSaber = document.getElementById('btn-saber');
const qtd = document.getElementById('qtd');
const aviso = document.getElementById('aviso');
const dica = document.getElementById('dica');
const contagem = document.getElementById('contagem');
// ponte com o app de desktop (so existe dentro do Electron)
const ponte = window.terrarioApp ?? null;

// Elenco: todas as criaturas que existem. So as ligadas vivem no terrario.
const CHAVE = 'terrario.elenco.v3';
let elenco = [];
const LIGADAS_DE_INICIO = new Set(['xavier', 'mimir', 'iris']);

function salvar() {
  for (const c of criaturas) Object.assign(elenco.find(d => d.id === c.id) ?? {}, { nome: c.nome });
  try { localStorage.setItem(CHAVE, JSON.stringify(elenco)); } catch {}
  ponte?.ligadas(elenco.filter(d => d.ativa).map(d => d.id));
}
function carregar() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch { return null; }
}

function avisar(txt) {
  aviso.textContent = txt;
  aviso.classList.add('ver');
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => aviso.classList.remove('ver'), 3800);
}

function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === 'style' ? e.style.cssText = v : e.setAttribute(k, v);
  for (const f of filhos) e.append(f);
  return e;
}

function escolher(c) {
  escolhida = c ?? null;
  document.documentElement.style.setProperty('--c', c?.cor ?? '#8890b8');
  alvo.textContent = c?.nome ?? 'ninguem';
  botaoCacar.disabled = !c;
  campo.placeholder = !c ? 'ligue uma criatura para cacar'
    : c.tema ? `tema para ${c.nome} cacar… (vazio = ${c.tema})` : 'tema para cacar… ex.: centopeias, auroras, polvos';
  desenhaLista();
}

function desenhaLista() {
  lista.replaceChildren(...elenco.map(d => {
    const viva = criaturas.find(c => c.id === d.id);
    const chave = el('button', { class: 'liga', type: 'button', role: 'switch', 'aria-checked': String(!!viva),
      'aria-label': `${viva ? 'Desligar' : 'Ligar'} ${d.nome}`, title: viva ? 'desligar' : 'ligar' });
    chave.addEventListener('click', () => alternar(d.id));
    const nome = el('button', { class: 'nome', type: 'button', title: [d.papel, d.tema && `caca: ${d.tema}`].filter(Boolean).join(' · ') },
      d.nome, el('small', {}, viva && viva.estado !== 'vagando' ? viva.legenda : ''));
    nome.addEventListener('click', () => viva ? escolher(viva) : alternar(d.id, true));
    return el('span', { class: `chip${viva ? '' : ' desligada'}`, 'aria-current': String(!!viva && viva === escolhida), style: `--c:${d.cor}` }, chave, nome);
  }));
  const n = criaturas.length;
  contagem.textContent = `${n} de ${elenco.length} ligadas`;
}

// liga ou desliga uma criatura do elenco
function alternar(id, escolherDepois = false) {
  const d = elenco.find(x => x.id === id);
  const viva = criaturas.find(c => c.id === id);
  if (viva) {
    // desligar no meio de uma cacada cancela a cacada
    if (viva.estado !== 'vagando') { viva.cancelada = true; viva.rota = []; }
    criaturas = criaturas.filter(c => c !== viva);
    for (const s of viva.segs.filter((_, i) => i % 3 === 0)) ondas.push({ x: s.x, y: s.y, r: 2, cor: viva.cor, vida: 0.7 });
    d.ativa = false;
    if (escolhida === viva) escolhida = null;
  } else {
    if (criaturas.length >= MAX) return avisar(`No maximo ${MAX} ligadas ao mesmo tempo.`);
    const c = new Criatura(d);
    criaturas.push(c);
    ondas.push({ x: c.cabeca.x, y: c.cabeca.y, r: 4, cor: c.cor, vida: 1 });
    d.ativa = true;
    if (escolherDepois || !escolhida) escolhida = c;
  }
  salvar();
  escolher(escolhida ?? criaturas[0]);
}

function todas(liga) {
  for (const d of elenco) if (!!criaturas.find(c => c.id === d.id) !== liga) alternar(d.id);
}

// criatura nova, fora do elenco do Brain
function chocar(dados = {}) {
  const usados = new Set(elenco.map(c => c.nome));
  const d = {
    id: crypto.randomUUID(), n: 12, vel: 1, papel: 'criatura nova', tema: '', ...dados,
    nome: dados.nome ?? NOMES.find(n => !usados.has(n)) ?? `Cria ${elenco.length + 1}`,
    cor: dados.cor ?? CORES.find(k => !elenco.some(c => c.cor === k)) ?? CORES[elenco.length % CORES.length],
  };
  elenco.push(d);
  alternar(d.id, true);
  return criaturas.find(c => c.id === d.id);
}

// Texto de exemplo para quando a tela abre sem o servidor (ou com ?demo).
const DEMO = {
  tema: 'centopeias',
  paginas: [{
    titulo: 'Centopeia', url: 'https://pt.wikipedia.org/wiki/Centopeia',
    texto: 'Centopeias sao artropodes de corpo alongado e achatado, dividido em muitos segmentos, cada um com um par de pernas. O primeiro par foi modificado em forcipulas, garras que injetam veneno nas presas. Vivem no solo humido, sob folhas e pedras, e cacam a noite. As ultimas pernas, mais longas, servem como antenas traseiras e ajudam na defesa. A classe Chilopoda reune milhares de especies espalhadas por todos os continentes, das florestas tropicais aos desertos.',
  }, {
    titulo: 'Artropodes', url: 'https://pt.wikipedia.org/wiki/Artropode',
    texto: 'Os artropodes formam o maior filo do reino animal. Possuem exoesqueleto de quitina, corpo segmentado e apendices articulados. Insetos, aracnideos, crustaceos e miriapodes pertencem ao grupo. O exoesqueleto protege, mas limita o crescimento, por isso eles trocam de pele em mudas sucessivas ao longo da vida.',
  }],
  termos: ['segmentos', 'forcipulas', 'veneno', 'chilopoda', 'especies', 'exoesqueleto', 'quitina', 'miriapodes', 'artropodes', 'pernas'],
  resumo: '', arquivo: 'demo-centopeias.md',
};

async function pedirCaca(c, { tema = '', link = '' }) {
  if (location.protocol === 'file:' || new URLSearchParams(location.search).has('demo')) return { ...DEMO, demo: true };
  const r = await fetch('/api/cacar', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ criatura: c.nome, tema, link }) });
  const dado = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dado.erro || `Erro ${r.status}`);
  return dado;
}

async function cacar(c, pedido) {
  if (c.estado !== 'vagando') return avisar(`${c.nome} ainda esta ocupada.`);
  c.estado = 'farejando';
  c.legenda = 'farejando…';
  desenhaLista();
  botaoCacar.disabled = true;
  const inicio = performance.now();
  let achado;
  try {
    achado = await pedirCaca(c, pedido);
  } catch (e) {
    c.estado = 'vagando'; botaoCacar.disabled = false; desenhaLista();
    c.cutucar({ x: c.cabeca.x + 10, y: c.cabeca.y });
    return avisar(`${c.nome} voltou sem nada: ${e.message}`);
  }
  // fareja pelo menos um pouquinho, para dar tempo de ver
  await new Promise(r => setTimeout(r, Math.max(0, 1600 - (performance.now() - inicio))));
  botaoCacar.disabled = !escolhida;
  for (const pagina of achado.paginas.slice(0, 3)) {
    c.estado = 'lendo';
    c.legenda = `lendo: ${pagina.titulo.slice(0, 28)}`;
    desenhaLista();
    const f = new Folha(pagina, achado.termos, c);
    folhas.push(f);
    rotulos.push(new Rotulo(pagina.titulo, f.x + 20, f.y + 28, c.cor, f));
    c.rota = [{ x: f.x - 10, y: f.y + 60 }, ...f.rota];
    await esperar(() => !c.rota.length);
    f.saindo = true;
    if (c.cancelada) break;
  }
  if (c.cancelada) { c.cancelada = false; c.estado = 'vagando'; c.legenda = ''; return; }
  c.estado = 'digerindo';
  c.legenda = 'digerindo…';
  desenhaLista();
  const b = botaoSaber.getBoundingClientRect();
  await new Promise(fim => orbes.push(new Orbe({ ...c.cabeca }, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, c.cor, fim)));
  botaoSaber.classList.remove('pulso'); void botaoSaber.offsetWidth; botaoSaber.classList.add('pulso');
  if (achado.demo) {
    conhecimento.unshift({ arquivo: achado.arquivo, texto: `# ${achado.tema}\n\n(demonstracao sem servidor: nada foi gravado)` });
    qtd.textContent = conhecimento.length;
  } else await carregarConhecimento();
  avisar(achado.demo ? `${c.nome} trouxe "${achado.tema}" (demonstracao)` : `${c.nome} gravou ${achado.arquivo}`);
  c.estado = 'vagando'; c.legenda = '';
  desenhaLista();
}

function esperar(cond) {
  return new Promise(r => { const t = setInterval(() => { if (cond()) { clearInterval(t); r(); } }, 100); });
}

// ---------------------------------------------------------------- conhecimento
let conhecimento = [];
async function carregarConhecimento() {
  if (location.protocol === 'file:') return;
  try { conhecimento = await (await fetch('/api/conhecimento')).json(); } catch { conhecimento = []; }
  qtd.textContent = conhecimento.length;
}
function abrirGaveta() {
  const itens = document.getElementById('itens');
  itens.replaceChildren(...(conhecimento.length ? conhecimento.map(k => {
    const titulo = /^# (.+)$/m.exec(k.texto)?.[1] ?? k.arquivo;
    return el('details', { class: 'item' }, el('summary', {}, titulo, el('small', {}, k.arquivo)), el('pre', {}, k.texto));
  }) : [el('p', { class: 'sub' }, 'Nada ainda. Dê um tema para uma criatura caçar.')]));
  gaveta.hidden = false;
}

// ---------------------------------------------------------------- eventos
function maisPerto(p, raio = 60) {
  let melhor = null, d = raio;
  for (const c of criaturas) for (const s of c.segs) { const k = dist(s, p); if (k < d) { d = k; melhor = c; } }
  return melhor;
}

tela.addEventListener('pointermove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  tela.style.cursor = maisPerto(mouse) ? 'pointer' : 'default';
});
tela.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
tela.addEventListener('click', e => {
  const p = { x: e.clientX, y: e.clientY };
  const c = maisPerto(p);
  if (c) { c.cutucar(p); escolher(c); }
  else ondas.push({ x: p.x, y: p.y, r: 2, cor: '#9fb0ff', vida: 0.6 });
});
tela.addEventListener('dragover', e => { e.preventDefault(); dica.classList.add('alerta'); dica.textContent = 'solte o link perto de uma criatura'; });
tela.addEventListener('dragleave', () => { dica.classList.remove('alerta'); dica.textContent = 'clique numa criatura para cutucar · solte um link nela para ela ler'; });
tela.addEventListener('drop', e => {
  e.preventDefault();
  tela.dispatchEvent(new Event('dragleave'));
  const link = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).split('\n')[0].trim();
  if (!/^https?:\/\//.test(link)) return avisar('Isso nao parece um link.');
  const c = maisPerto({ x: e.clientX, y: e.clientY }, 260) ?? escolhida;
  if (!c) return avisar('Ligue uma criatura primeiro.');
  escolher(c);
  cacar(c, { link });
});
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!escolhida) return avisar('Ligue uma criatura primeiro.');
  if (batizando) {
    const nome = campo.value.trim().slice(0, 20);
    if (nome) { escolhida.nome = nome; salvar(); }
    return modoBatizar(false);
  }
  const tema = campo.value.trim() || escolhida.tema;
  if (!tema) return campo.focus();
  if (/^https?:\/\//.test(tema)) cacar(escolhida, { link: tema }); else cacar(escolhida, { tema });
  campo.value = '';
});
document.getElementById('btn-nova').addEventListener('click', () => { const c = chocar(); if (c) escolher(c); });
// batizar usa o proprio campo (o app de desktop nao tem prompt())
let batizando = false;
function modoBatizar(liga) {
  batizando = liga;
  botaoCacar.textContent = liga ? 'Batizar' : 'Caçar';
  campo.value = liga ? escolhida.nome : '';
  if (liga) { campo.placeholder = `novo nome para ${escolhida.nome}`; campo.focus(); campo.select(); } else escolher(escolhida);
}
document.getElementById('btn-batizar').addEventListener('click', () => escolhida ? modoBatizar(!batizando) : avisar('Ligue uma criatura primeiro.'));
campo.addEventListener('keydown', e => { if (e.key === 'Escape' && batizando) modoBatizar(false); });
botaoSaber.addEventListener('click', abrirGaveta);
document.getElementById('btn-todas').addEventListener('click', () => todas(true));
document.getElementById('btn-nenhuma').addEventListener('click', () => todas(false));

// ---------------------------------------------------------------- tela de bloqueio
const botaoBloqueio = document.getElementById('btn-bloqueio');
const previa = document.getElementById('previa');
const moldura = document.getElementById('previa-quadro');
function mostraBloqueio(ligada) {
  botaoBloqueio.setAttribute('aria-checked', String(ligada));
  botaoBloqueio.textContent = `tela de bloqueio: ${ligada ? 'ligada' : 'desligada'}`;
}
botaoBloqueio.addEventListener('click', async () => {
  if (!ponte) return avisar('A tela de bloqueio so troca no app de Windows. Aqui da para ver a previa.');
  const ligar = botaoBloqueio.getAttribute('aria-checked') !== 'true';
  mostraBloqueio(ligar);
  try {
    await ponte.bloqueio(ligar);
    avisar(ligar ? 'Tela de bloqueio ligada: uma imagem nova a cada bloqueio (Win+L).' : 'Tela de bloqueio desligada.');
  } catch (e) {
    mostraBloqueio(!ligar);
    avisar(`Nao consegui: ${e.message.replace(/^.*Error: /, '')}`);
  }
});
function abrirPrevia() {
  const ids = criaturas.map(c => c.id).join(',');
  const semente = new Date().toISOString();
  moldura.src = `bloqueio.html?${new URLSearchParams({ semente, w: '1920', h: '1080', elenco: ids })}`;
  document.getElementById('previa-legenda').textContent = `semente ${semente}`;
  previa.hidden = false;
}
document.getElementById('btn-previa').addEventListener('click', abrirPrevia);
document.getElementById('previa-outra').addEventListener('click', abrirPrevia);
document.getElementById('previa-fechar').addEventListener('click', () => { previa.hidden = true; moldura.src = 'about:blank'; });
mostraBloqueio(false);
ponte?.estado().then(e => mostraBloqueio(e.bloqueio)).catch(() => {});
document.getElementById('btn-fechar').addEventListener('click', () => { gaveta.hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') { gaveta.hidden = true; previa.hidden = true; } });

// ---------------------------------------------------------------- laco
function redimensionar() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  tela.width = W * DPR; tela.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  montaFundo();
}
addEventListener('resize', redimensionar);

let antes = performance.now();
function quadro(agora) {
  const dt = Math.min(0.05, (agora - antes) / 1000);
  antes = agora; tempo += dt;
  desenhaFundo(dt);
  for (const f of folhas) { f.atualizar(dt); f.desenhar(); }
  folhas = folhas.filter(f => !(f.saindo && f.alfa === 0));
  for (const r of rotulos) { r.atualizar(dt); r.desenhar(); }
  rotulos = rotulos.filter(r => r.vida > 0).slice(-80);
  for (const o of ondas) {
    o.r += 90 * (1 / 60); o.vida -= 1 / 60 * 1.1;
    ctx.strokeStyle = rgba(o.cor, Math.max(0, o.vida) * 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.stroke();
  }
  ondas = ondas.filter(o => o.vida > 0);
  for (const c of criaturas) { c.atualizar(dt); c.desenhar(c === escolhida); }
  for (const o of orbes) { o.atualizar(dt); o.desenhar(); }
  orbes = orbes.filter(o => o.fim);
  desenhaVidro();
  requestAnimationFrame(quadro);
}

redimensionar();
elenco = carregar() ?? ELENCO.map(d => ({ ...d, ativa: LIGADAS_DE_INICIO.has(d.id) }));
// agente novo no Brain aparece desligado no elenco salvo
for (const d of ELENCO) if (!elenco.some(x => x.id === d.id)) elenco.push({ ...d, ativa: false });
criaturas = elenco.filter(d => d.ativa).map(d => new Criatura(d));
escolher(criaturas[0]);
ponte?.ligadas(elenco.filter(d => d.ativa).map(d => d.id));
carregarConhecimento();
requestAnimationFrame(quadro);

// ?demo: a primeira criatura caca sozinha, para mostrar o efeito
if (new URLSearchParams(location.search).has('demo') && criaturas[0]) setTimeout(() => cacar(criaturas[0], { tema: 'centopeias' }), 1200);

// para testes automatizados
window.terrario = { get criaturas() { return criaturas; }, get elenco() { return elenco; }, cacar, chocar, alternar };
