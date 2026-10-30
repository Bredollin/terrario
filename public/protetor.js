// Protetor de tela do Terrario: animacoes abstratas que nunca param de mudar.
// Sete "movimentos" (fluxo, aurora, rede, harmonografo, mandala, tunel, ondas)
// se revezam com fusao lenta; cada vez que um volta, volta com outros numeros,
// e a paleta gira devagar o tempo todo. Sem criaturas.

// mesma semente, mesmos numeros
function hash(txt) {
  let h = 1779033703 ^ txt.length;
  for (let i = 0; i < txt.length; i++) { h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function gerador(semente) {
  let a = hash(String(semente))();
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.entre = (x, y) => x + r() * (y - x);
  r.um = lista => lista[Math.floor(r() * lista.length)];
  return r;
}

const TAU = Math.PI * 2;
const HARMONIAS = [[0, 30, 60], [0, 120, 240], [0, 180, 25], [0, 150, 210], [0, 45, 200]];

function novaTela(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c;
}

// ---------------------------------------------------------------- movimentos
// Cada um pinta na sua propria tela (opaca, guarda o rastro) e recebe
// cor(i, luz, alfa): a paleta do momento.

class Fluxo {
  iniciar(g, W, H, r, k) {
    this.esc = r.entre(0.0014, 0.0034) / k;
    this.giro = r.entre(1.2, 2.8);
    this.vel = r.entre(60, 110) * k;
    this.n = Math.min(2600, Math.round(W * H / 900));
    this.p = Array.from({ length: this.n }, (_, i) => ({ x: r() * W, y: r() * H, v: r.entre(1, 5), c: i % 3 }));
    this.r = r;
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(2,3,10,0.028)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1.4 * k;
    const s = this.esc, passo = this.vel * dt;
    for (let c = 0; c < 3; c++) {
      g.strokeStyle = cor(c, 64, 0.5);
      g.beginPath();
      for (const p of this.p) {
        if (p.c !== c) continue;
        const a = (Math.sin(p.x * s + t * 0.13) + Math.cos(p.y * s * 1.3 - t * 0.09) + Math.sin((p.x - p.y) * s * 0.6 + t * 0.05)) * this.giro;
        const nx = p.x + Math.cos(a) * passo, ny = p.y + Math.sin(a) * passo;
        g.moveTo(p.x, p.y); g.lineTo(nx, ny);
        p.x = nx; p.y = ny; p.v -= dt;
        if (p.v < 0 || nx < 0 || ny < 0 || nx > W || ny > H) { p.x = this.r() * W; p.y = this.r() * H; p.v = this.r.entre(2, 6); }
      }
      g.stroke();
    }
  }
}

class Aurora {
  iniciar(g, W, H, r, k) {
    this.bandas = Array.from({ length: 3 + Math.floor(r() * 3) }, (_, i) => ({
      y: H * r.entre(0.28, 0.55), amp: H * r.entre(0.04, 0.12), f: r.entre(0.6, 2.2) / W * TAU, fase: r() * TAU,
      vel: r.entre(0.15, 0.45) * (r() < 0.5 ? -1 : 1), alt: H * r.entre(0.22, 0.45), c: i % 3 }));
    this.estrelas = Array.from({ length: Math.round(W * H / 6000) }, () => ({ x: r() * W, y: r() * H * 0.75, s: r.entre(0.5, 1.8) * k, f: r() * TAU }));
    const base = H * 0.86;
    this.serra = Array.from({ length: 65 }, (_, i) => base - (Math.sin(i * 0.37 + r() * 0.4) * 0.5 + Math.sin(i * 0.13 + 1.7) * 0.8 + r() * 0.35) * H * 0.045);
    this.sprites = []; this.refeito = -1;
  }
  sprite(cor) {
    const s = novaTela(1, 256), g = s.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.55, cor(this.cur, 55, 0.18));
    gr.addColorStop(0.88, cor(this.cur, 70, 0.75));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 1, 256);
    return s;
  }
  quadro(g, W, H, dt, t, cor, k) {
    if (t - this.refeito > 0.5) { // a paleta gira: refaz as faixas de cor de vez em quando
      this.sprites = [0, 1, 2].map(i => { this.cur = i; return this.sprite(cor); });
      this.refeito = t;
    }
    g.globalCompositeOperation = 'source-over';
    const ceu = g.createLinearGradient(0, 0, 0, H);
    ceu.addColorStop(0, '#010208'); ceu.addColorStop(1, '#070b1f');
    g.fillStyle = ceu; g.fillRect(0, 0, W, H);
    for (const e of this.estrelas) {
      g.fillStyle = `rgba(200,210,255,${0.25 + 0.35 * Math.sin(t * 1.3 + e.f)})`;
      g.fillRect(e.x, e.y, e.s, e.s);
    }
    g.globalCompositeOperation = 'lighter';
    const larg = Math.max(2, Math.round(4 * k));
    for (const b of this.bandas) {
      const sp = this.sprites[b.c];
      for (let x = 0; x < W; x += larg) {
        const y = b.y + Math.sin(x * b.f + t * b.vel + b.fase) * b.amp + Math.sin(x * b.f * 2.7 - t * b.vel * 1.6) * b.amp * 0.35;
        const luz = 0.35 + 0.65 * Math.max(0, Math.sin(x * b.f * 0.7 + t * 0.4 + b.fase) * 0.6 + Math.sin(x * 0.031 / k + t * 2.1) * 0.25 + 0.3);
        const alt = b.alt * (0.75 + 0.25 * Math.sin(x * b.f * 1.9 + t * 0.6));
        g.globalAlpha = Math.min(1, luz) * 0.55;
        g.drawImage(sp, x, Math.round(y - alt), larg, Math.round(alt * 1.08));
      }
    }
    g.globalAlpha = 1;
    // morros contra o ceu
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#010106';
    g.beginPath(); g.moveTo(0, H);
    this.serra.forEach((y, i) => g.lineTo(i / (this.serra.length - 1) * W, y));
    g.lineTo(W, H); g.fill();
  }
}

class Rede {
  iniciar(g, W, H, r, k) {
    this.nos = Array.from({ length: 120 }, () => {
      const a = r() * TAU, b = Math.acos(r.entre(-1, 1)), raio = r.entre(0.45, 1);
      return { x: Math.sin(b) * Math.cos(a) * raio, y: Math.cos(b) * raio * 0.75, z: Math.sin(b) * Math.sin(a) * raio, f: r() * TAU };
    });
    this.giro = r.entre(0.05, 0.12) * (r() < 0.5 ? -1 : 1);
    this.inclina = r.entre(0.2, 0.6);
    this.limiar = r.entre(0.36, 0.48);
    this.pulsos = []; this.r = r;
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(2,3,10,0.38)'; g.fillRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.62, ca = Math.cos(t * this.giro), sa = Math.sin(t * this.giro), ci = Math.cos(this.inclina), si = Math.sin(this.inclina);
    const p = this.nos.map(n => {
      const ox = n.x + Math.sin(t * 0.3 + n.f) * 0.03, oy = n.y + Math.cos(t * 0.25 + n.f) * 0.03;
      const x = ox * ca - n.z * sa, z1 = ox * sa + n.z * ca;
      const y = oy * ci - z1 * si, z = oy * si + z1 * ci;
      const e = 2.4 / (2.4 + z);
      return { X: W / 2 + x * R * e, Y: H / 2 + y * R * e, z, e, x, y: oy, z3: z1, f: n.f };
    });
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1 * k;
    const arestas = [];
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const a = this.nos[i], b = this.nos[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d < this.limiar) {
        arestas.push([i, j]);
        g.strokeStyle = cor((i + j) % 3, 65, (1 - d / this.limiar) * 0.42 * Math.min(p[i].e, p[j].e));
        g.beginPath(); g.moveTo(p[i].X, p[i].Y); g.lineTo(p[j].X, p[j].Y); g.stroke();
      }
    }
    if (arestas.length && this.r() < dt * 6) this.pulsos.push({ a: this.r.um(arestas), t: 0, c: Math.floor(this.r() * 3) });
    for (const u of this.pulsos) {
      u.t += dt * 0.9;
      const [i, j] = u.a, x = p[i].X + (p[j].X - p[i].X) * u.t, y = p[i].Y + (p[j].Y - p[i].Y) * u.t;
      g.fillStyle = cor(u.c, 80, 0.9);
      g.beginPath(); g.arc(x, y, 2.6 * k, 0, TAU); g.fill();
      g.fillStyle = cor(u.c, 60, 0.12);
      g.beginPath(); g.arc(x, y, 12 * k, 0, TAU); g.fill();
    }
    this.pulsos = this.pulsos.filter(u => u.t < 1);
    for (const n of p) {
      const s = (1.2 + n.e * 2.2) * k;
      g.fillStyle = cor(Math.floor(n.f) % 3, 75, 0.35 + 0.5 * n.e);
      g.fillRect(n.X - s / 2, n.Y - s / 2, s, s);
    }
  }
}

class Harmonografo {
  iniciar(g, W, H, r, k) {
    this.r = r;
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
    this.novo(W, H);
  }
  novo(W, H) {
    const r = this.r, base = r.um([1, 2, 3]), R = Math.min(W, H) * 0.36;
    const f = () => r.um([1, 2, 3, 4]) * base / 2 + r.entre(-0.012, 0.012);
    this.pend = [0, 1, 2, 3].map(() => ({ A: R * r.entre(0.5, 1), f: f(), p: r() * TAU, d: r.entre(0.0006, 0.0012) }));
    this.u = 0; this.ang = r() * TAU;
  }
  ponto(u) {
    const [a, b, c, d] = this.pend;
    return {
      x: a.A * Math.sin(a.f * u + a.p) * Math.exp(-a.d * u) + b.A * Math.sin(b.f * u + b.p) * Math.exp(-b.d * u),
      y: c.A * Math.sin(c.f * u + c.p) * Math.exp(-c.d * u) + d.A * Math.sin(d.f * u + d.p) * Math.exp(-d.d * u) };
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(2,3,10,0.006)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1.2 * k;
    const ca = Math.cos(this.ang + t * 0.02), sa = Math.sin(this.ang + t * 0.02);
    const tr = q => ({ x: W / 2 + q.x * ca - q.y * sa, y: H / 2 + q.x * sa + q.y * ca });
    const passos = 60, du = 0.03;
    let ant = tr(this.ponto(this.u));
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = cor(i, 66, 0.45);
      g.beginPath(); g.moveTo(ant.x, ant.y);
      for (let s = 0; s < passos / 3; s++) {
        this.u += du;
        const q = tr(this.ponto(this.u));
        g.lineTo(q.x, q.y); ant = q;
      }
      g.stroke();
    }
    if (Math.exp(-this.pend[0].d * this.u) < 0.08) this.novo(W, H);
  }
}

class Mandala {
  iniciar(g, W, H, r, k) {
    this.lados = r.um([6, 7, 8, 9, 10, 12]);
    this.pinceis = Array.from({ length: 4 }, (_, i) => ({ f1: r.entre(0.22, 0.5), f2: r.entre(0.2, 0.6), fa: r.entre(0.3, 0.7), p: r() * TAU, c: i % 3, ant: null }));
    this.giro = r.entre(0.03, 0.08) * (r() < 0.5 ? -1 : 1);
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(2,3,10,0.01)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const R = Math.min(W, H) * 0.47;
    for (const p of this.pinceis) {
      const raio = R * (0.55 + 0.42 * Math.sin(t * p.f1 + p.p)) * (0.85 + 0.15 * Math.sin(t * p.f2 * 3.1));
      const ang = Math.sin(t * p.fa + p.p) * Math.PI / this.lados * 1.6 + t * this.giro;
      const novo = { r: raio, a: ang };
      if (p.ant) {
        g.strokeStyle = cor(p.c, 64, 0.75);
        g.lineWidth = (1.2 + 2 * (raio / R)) * k;
        g.beginPath();
        for (let s = 0; s < this.lados; s++) for (const esp of [1, -1]) {
          const b = s * TAU / this.lados;
          g.moveTo(W / 2 + Math.cos(b + esp * p.ant.a) * p.ant.r, H / 2 + Math.sin(b + esp * p.ant.a) * p.ant.r);
          g.lineTo(W / 2 + Math.cos(b + esp * novo.a) * novo.r, H / 2 + Math.sin(b + esp * novo.a) * novo.r);
        }
        g.stroke();
      }
      p.ant = novo;
    }
  }
}

class Tunel {
  iniciar(g, W, H, r, k) {
    this.lados = r.um([3, 4, 5, 6, 8]);
    this.torce = r.entre(0.08, 0.3) * (r() < 0.5 ? -1 : 1);
    this.vel = r.entre(0.5, 0.9);
    this.aneis = Array.from({ length: 36 }, (_, i) => ({ z: 0.2 + i * 0.25, id: i }));
    this.prox = 36;
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(2,3,10,0.3)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const R = Math.max(W, H) * 0.42;
    const cx = z => W / 2 + Math.sin(t * 0.21 + z * 0.35) * W * 0.06 * Math.min(1, z / 3);
    const cy = z => H / 2 + Math.cos(t * 0.17 + z * 0.3) * H * 0.07 * Math.min(1, z / 3);
    for (const a of this.aneis) { a.z -= dt * this.vel; if (a.z < 0.2) { a.z += 9; a.id = this.prox++; } }
    this.aneis.sort((a, b) => b.z - a.z);
    for (const a of this.aneis) {
      const raio = R / a.z, rot = a.z * this.torce * 4 + t * this.torce;
      const alfa = Math.min(1, (9 - a.z) / 3) * Math.min(1, a.z / 0.6);
      g.strokeStyle = cor(a.id % 3, 62, 0.55 * alfa);
      g.lineWidth = Math.max(0.6, 2.4 / a.z) * k;
      g.beginPath();
      for (let s = 0; s <= this.lados; s++) {
        const b = rot + s * TAU / this.lados;
        const x = cx(a.z) + Math.cos(b) * raio, y = cy(a.z) + Math.sin(b) * raio;
        s ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      // vertices acesos
      g.fillStyle = cor(a.id % 3, 82, 0.8 * alfa);
      const q = Math.max(1.5, 5 / a.z) * k;
      for (let s = 0; s < this.lados; s++) {
        const b = rot + s * TAU / this.lados;
        g.fillRect(cx(a.z) + Math.cos(b) * raio - q / 2, cy(a.z) + Math.sin(b) * raio - q / 2, q, q);
      }
    }
  }
}

class Ondas {
  iniciar(g, W, H, r, k) {
    this.fontes = Array.from({ length: 3 }, () => ({ fx: r.entre(0.05, 0.13), fy: r.entre(0.05, 0.13), p: r() * TAU, comp: r.entre(0.018, 0.034) / k }));
    this.passo = Math.round(19 * k);
    this.vel = r.entre(1.4, 2.4);
  }
  quadro(g, W, H, dt, t, cor, k) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
    const fs = this.fontes.map(f => ({ x: W / 2 + Math.sin(t * f.fx + f.p) * W * 0.38, y: H / 2 + Math.cos(t * f.fy + f.p * 1.3) * H * 0.38, c: f.comp }));
    const P = this.passo, cores = [0, 1, 2].map(i => [cor(i, 60, 0.85), cor(i, 72, 0.95)]);
    for (let y = P / 2; y < H; y += P) for (let x = P / 2; x < W; x += P) {
      let v = 0, dom = 0, maior = -1;
      for (let i = 0; i < 3; i++) {
        const f = fs[i], s = Math.sin(Math.hypot(x - f.x, y - f.y) * f.c - t * this.vel);
        v += s;
        if (s > maior) { maior = s; dom = i; }
      }
      v = (v / 3 + 1) / 2;
      const lado = P * 0.82 * v * v;
      if (lado < 0.8) continue;
      g.fillStyle = cores[dom][v > 0.8 ? 1 : 0];
      g.globalAlpha = 0.25 + 0.75 * v;
      g.fillRect(x - lado / 2, y - lado / 2, lado, lado);
    }
    g.globalAlpha = 1;
  }
}

export const MOVIMENTOS = { fluxo: Fluxo, aurora: Aurora, rede: Rede, harmonografo: Harmonografo, mandala: Mandala, tunel: Tunel, ondas: Ondas };

// ---------------------------------------------------------------- regente
// Alterna os movimentos com fusao. Opcoes: semente, relogio (mostra hora e
// data), so (um movimento fixo, para testes), duracao (segundos de cada um).
export function criarProtetor(canvas, { semente = Date.now(), relogio = true, so = null, duracao = null } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, k = Math.min(W, H) / 1080;
  const r = gerador(semente);
  const matiz0 = r() * 360;
  let t = 0, contador = 0;
  let harmonia = r.um(HARMONIAS);
  const cor = (i, luz = 60, alfa = 1) => `hsla(${(matiz0 + t * 0.7 + harmonia[i % 3]) % 360},88%,${luz}%,${alfa})`;

  const nomes = Object.keys(MOVIMENTOS);
  let fila = [];
  function proximoNome(antes) {
    if (so) return so;
    if (!fila.length) fila = [...nomes].sort(() => r() - 0.5);
    let n = fila.shift();
    if (n === antes && fila.length) { fila.push(n); n = fila.shift(); }
    return n;
  }
  function abrir(nome) {
    const tela = novaTela(W, H), mov = new MOVIMENTOS[nome]();
    mov.iniciar(tela.getContext('2d'), W, H, gerador(`${semente}:${contador++}`), k);
    return { nome, tela, mov, idade: 0, vida: duracao ?? r.entre(30, 48) };
  }
  let atual = abrir(proximoNome()), vindo = null;
  const FUSAO = 6;

  // vinheta pronta
  const vinheta = novaTela(W, H), vg = vinheta.getContext('2d');
  const grad = vg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  vg.fillStyle = grad; vg.fillRect(0, 0, W, H);

  // sombra suave atras do relogio, para ler sobre qualquer movimento
  const sombra = novaTela(W, H), sg = sombra.getContext('2d');
  const sgr = sg.createRadialGradient(W * 0.14, H * 0.86, 0, W * 0.14, H * 0.86, Math.max(W, H) * 0.3);
  sgr.addColorStop(0, 'rgba(2,3,10,0.7)'); sgr.addColorStop(1, 'rgba(2,3,10,0)');
  sg.fillStyle = sgr; sg.fillRect(0, 0, W, H);

  const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  function pintaRelogio() {
    const agora = new Date(), x = W * 0.055, y = H * 0.86;
    ctx.save();
    ctx.drawImage(sombra, 0, 0);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24 * k;
    ctx.fillStyle = 'rgba(240,244,255,0.9)';
    ctx.font = `200 ${Math.round(132 * k)}px "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
    ctx.fillText(fmtHora.format(agora), x, y);
    ctx.font = `300 ${Math.round(30 * k)}px "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(220,226,255,0.75)';
    ctx.fillText(fmtDia.format(agora), x + 6 * k, y + 50 * k);
    ctx.shadowBlur = 0;
    ctx.fillStyle = cor(0, 70, 0.9);
    ctx.fillRect(x + 6 * k, y + 72 * k, 56 * k, 2 * k);
    ctx.restore();
  }

  function quadro(dt) {
    t += dt;
    atual.idade += dt;
    atual.mov.quadro(atual.tela.getContext('2d'), W, H, dt, t, cor, k);
    if (!vindo && atual.idade > atual.vida) {
      vindo = abrir(proximoNome(atual.nome));
      if (r() < 0.5) harmonia = r.um(HARMONIAS);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(atual.tela, 0, 0);
    if (vindo) {
      vindo.idade += dt;
      vindo.mov.quadro(vindo.tela.getContext('2d'), W, H, dt, t, cor, k);
      const a = Math.min(1, vindo.idade / FUSAO);
      ctx.globalAlpha = a * a * (3 - 2 * a);
      ctx.drawImage(vindo.tela, 0, 0);
      ctx.globalAlpha = 1;
      if (a >= 1) { atual = vindo; vindo = null; }
    }
    ctx.drawImage(vinheta, 0, 0);
    if (relogio) pintaRelogio();
  }

  return {
    quadro,
    get cena() { return vindo ? `${atual.nome}>${vindo.nome}` : atual.nome; },
    get tempo() { return t; },
    // pula para o proximo movimento (com fusao)
    proximo() { if (!vindo) vindo = abrir(proximoNome(atual.nome)); },
  };
}
