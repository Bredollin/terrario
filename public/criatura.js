// Criatura de blocos com pernas de grafo. Vive num "mundo" (canvas, tamanho,
// tempo, mouse, folhas e ondas) e serve ao terrario e a area de trabalho.
export const PERNA = '#6f7dff';

export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const suave = t => t * t * (3 - 2 * t);
export const angDif = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function rgba(hex, a) {
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
export function brilhar(ctx, x, y, r, cor, a = 1) {
  ctx.globalAlpha = a;
  ctx.drawImage(brilho(cor), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- criatura
export class Criatura {
  constructor({ id, nome, cor, papel = '', tema = '', curiosidades = [], vel = 1, x, y, n = 13 }, mundo = Criatura.padrao) {
    this.mundo = mundo;
    x ??= rand(200, mundo.W - 200); y ??= rand(160, mundo.H - 220);
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
    this.curiosidades = curiosidades;
    this.historico = [];
    this.pistas = [];
    this.proxima = mundo.tempo + rand(3, 8); // ligou: logo comeca a cacar
  }

  get cabeca() { return this.segs[0]; }

  cutucar(de) {
    const { ondas } = this.mundo;
    this.susto = 1;
    this.ang = Math.atan2(this.cabeca.y - de.y, this.cabeca.x - de.x) + rand(-0.4, 0.4);
    for (const s of this.segs) s.bits = 15;
    ondas.push({ x: this.cabeca.x, y: this.cabeca.y, r: 6, cor: this.cor, vida: 1 });
    if (this.estado === 'vagando') this.alvo = null;
  }

  atualizar(dt) {
    const { W, H, tempo, mouse, folhas = [], fugir } = this.mundo;
    const c = this.cabeca;
    this.susto = Math.max(0, this.susto - dt * 0.9);
    let velAlvo = 42 * this.ritmo, giro = 2.2, alvoAng = this.ang;

    if (this.estado === 'farejando') {
      alvoAng = this.ang + 2.6 * dt * 20;
      velAlvo = 55; giro = 2.6;
    } else {
      if (this.rota.length) {
        this.seguirRota(dt);
        return this.moverCorpo(dt);
      } else if (!this.alvo || dist(c, this.alvo) < 40 || Math.random() < dt * 0.05) {
        this.alvo = { x: rand(120, W - 120), y: rand(120, H - 200) };
      }
      if (this.alvo) alvoAng = Math.atan2(this.alvo.y - c.y, this.alvo.x - c.x);
      if (!this.rota.length) {
        alvoAng += Math.sin(tempo * 1.1 + this.semente) * 0.7;
        const dm = dist(c, mouse);
        // no terrario o mouse atrai; na area de trabalho a criatura sai da frente
        if (fugir) { if (dm < 170) { alvoAng = Math.atan2(c.y - mouse.y, c.x - mouse.x); giro = 5; velAlvo = 120; } }
        else if (dm < 240 && dm > 50 && this.susto === 0) alvoAng = Math.atan2(mouse.y - c.y, mouse.x - c.x);
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
    this.moverCorpo(dt);
  }

  // Lendo: a cabeca percorre a rota em linha, sem mirar. Nao tem como orbitar
  // um ponto, e a leitura sempre termina.
  seguirRota(dt) {
    const c = this.cabeca;
    let passo = 230 * dt;
    while (passo > 0 && this.rota.length) {
      const p = this.rota[0], d = dist(c, p);
      if (d <= passo) { c.x = p.x; c.y = p.y; passo -= d; this.rota.shift(); continue; }
      c.x += (p.x - c.x) / d * passo; c.y += (p.y - c.y) / d * passo;
      passo = 0;
    }
    const prox = this.rota[0];
    if (prox && dist(c, prox) > 0.5) this.ang += angDif(this.ang, Math.atan2(prox.y - c.y, prox.x - c.x)) * Math.min(1, dt * 10);
    c.a = this.ang;
    this.vel = 230;
    this.alvo = null;
  }

  moverCorpo(dt) {

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
    const { ctx, tempo } = this.mundo;
    const pintaBrilho = (...a) => brilhar(ctx, ...a);
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
