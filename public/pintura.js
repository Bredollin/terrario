// Pintura generativa para a tela de bloqueio. A mesma semente da sempre a
// mesma imagem; semente nova (data e hora do bloqueio) da uma imagem que
// nunca existiu. As criaturas do elenco viram rastros num campo de fluxo e
// os termos que elas aprenderam viram constelacoes.
import { ELENCO } from './elenco.js';

const PERNA = '#6f7dff';

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

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function pintar(canvas, { semente = Date.now(), termos = [], elenco = ELENCO } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, k = Math.min(W, H) / 1080;
  const r = gerador(semente);

  // paleta: 3 criaturas sorteadas
  const embaralhado = [...elenco].sort(() => r() - 0.5);
  const atores = embaralhado.slice(0, 3 + Math.floor(r() * 3));
  const paleta = atores.map(a => a.cor);

  // fundo
  const g = ctx.createRadialGradient(W * r.entre(0.3, 0.7), H * r.entre(0.3, 0.6), 0, W / 2, H / 2, Math.max(W, H) * 0.8);
  g.addColorStop(0, '#0e1338');
  g.addColorStop(0.55, '#070a1d');
  g.addColorStop(1, '#010207');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = W * r(), y = H * r(), raio = Math.max(W, H) * r.entre(0.2, 0.5);
    const n = ctx.createRadialGradient(x, y, 0, x, y, raio);
    n.addColorStop(0, rgba(i % 2 ? '#3b2bff' : r.um(paleta), 0.12));
    n.addColorStop(1, rgba('#000000', 0));
    ctx.fillStyle = n;
    ctx.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < 1400 * (W * H) / 2e6; i++) {
    ctx.fillStyle = rgba(r() < 0.8 ? '#aab6ff' : r.um(paleta), r.entre(0.05, 0.5));
    const s = r() < 0.97 ? k : k * 2;
    ctx.fillRect(W * r(), H * r(), s, s);
  }

  // campo de fluxo: soma de senos + redemoinhos
  const ondas = Array.from({ length: 3 }, () => ({ fx: r.entre(0.6, 2.6) / W, fy: r.entre(0.6, 2.6) / H, f: r() * 6.28, p: r.entre(0.6, 1.4) }));
  const vortices = Array.from({ length: 2 }, () => ({ x: W * r.entre(0.2, 0.8), y: H * r.entre(0.2, 0.8), s: r() < 0.5 ? 1 : -1, raio: Math.min(W, H) * r.entre(0.2, 0.45) }));
  const angulo = (x, y) => {
    let a = 0;
    for (const o of ondas) a += Math.sin(x * o.fx * 6.28 + o.f) * o.p + Math.cos(y * o.fy * 6.28 + o.f * 1.3) * o.p;
    for (const v of vortices) {
      const dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
      if (d < v.raio) a = a * (d / v.raio) + (Math.atan2(dy, dx) + v.s * Math.PI / 2) * (1 - d / v.raio);
    }
    return a;
  };

  // correntes de seda
  ctx.lineWidth = 0.9 * k;
  const total = Math.round(2600 * (W * H) / 2e6);
  for (let i = 0; i < total; i++) {
    let x = W * r(), y = H * r();
    ctx.strokeStyle = rgba(r.um(paleta), r.entre(0.02, 0.06));
    ctx.beginPath(); ctx.moveTo(x, y);
    const passos = 60 + r() * 160;
    for (let s = 0; s < passos; s++) {
      const a = angulo(x, y);
      x += Math.cos(a) * 2.2 * k; y += Math.sin(a) * 2.2 * k;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // rede de nos
  const nos = Array.from({ length: 70 }, () => ({ x: W * r(), y: H * r() }));
  ctx.lineWidth = k;
  for (let i = 0; i < nos.length; i++) for (let j = i + 1; j < nos.length; j++) {
    const d = Math.hypot(nos[i].x - nos[j].x, nos[i].y - nos[j].y);
    if (d < 170 * k) {
      ctx.strokeStyle = rgba(PERNA, (1 - d / (170 * k)) * 0.22);
      ctx.beginPath(); ctx.moveTo(nos[i].x, nos[i].y); ctx.lineTo(nos[j].x, nos[j].y); ctx.stroke();
    }
  }
  for (const n of nos) { ctx.fillStyle = rgba('#aab6ff', 0.5); ctx.fillRect(n.x - 1.5 * k, n.y - 1.5 * k, 3 * k, 3 * k); }

  // criaturas seguindo o campo
  for (const ator of atores) desenhaCriatura(ctx, ator, angulo, r, W, H, k);

  // termos como cladograma
  ctx.font = `${Math.round(15 * k)}px "Segoe UI", Inter, sans-serif`;
  for (const t of [...termos].sort(() => r() - 0.5).slice(0, 9)) {
    const a = r.um(nos), x = a.x + r.entre(-160, 160) * k, y = a.y + r.entre(-90, 90) * k;
    ctx.strokeStyle = rgba(PERNA, 0.4);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, a.y); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = r.um(paleta);
    ctx.fillRect(x - 2.5 * k, y - 2.5 * k, 5 * k, 5 * k);
    ctx.fillStyle = 'rgba(165,178,255,0.85)';
    ctx.fillText(t[0].toUpperCase() + t.slice(1), x + 10 * k, y + 5 * k);
  }

  // vinheta e assinatura
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `${Math.round(12 * k)}px Consolas, "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(160,170,220,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText(`TERRARIO · ${atores.map(a => a.nome.toUpperCase()).join(' · ')} · ${String(semente).slice(-6)}`, W - 28 * k, H - 24 * k);
  ctx.textAlign = 'left';
  return { atores: atores.map(a => a.nome), semente: String(semente) };
}

function desenhaCriatura(ctx, ator, angulo, r, W, H, base) {
  const k = base * 1.45; // criatura maior que no terrario: e a estrela da tela
  const esp = 17 * k, n = ator.n ?? 12;
  // caminho: anda pelo campo e guarda um ponto a cada "esp"
  let x = W * r.entre(0.15, 0.85), y = H * r.entre(0.2, 0.8);
  const pontos = [{ x, y }];
  let andado = 0;
  for (let s = 0; s < 4000 && pontos.length < n; s++) {
    const a = angulo(x, y);
    const nx = x + Math.cos(a) * k, ny = y + Math.sin(a) * k;
    andado += Math.hypot(nx - x, ny - y); x = nx; y = ny;
    if (x < 0 || x > W || y < 0 || y > H) break;
    if (andado >= esp) { pontos.push({ x, y }); andado = 0; }
  }
  if (pontos.length < 4) return;
  const segs = pontos.reverse(); // cabeca no fim do caminho
  const cor = ator.cor;
  const ang = i => { const a = segs[Math.max(0, i - 1)], b = segs[Math.min(segs.length - 1, i + 1)]; return Math.atan2(a.y - b.y, a.x - b.x); };

  // rastro brilhante atras
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i], raio = 46 * k;
    const gl = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, raio);
    gl.addColorStop(0, rgba(cor, 0.22));
    gl.addColorStop(1, rgba(cor, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(s.x - raio, s.y - raio, raio * 2, raio * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // pernas de grafo
  ctx.lineWidth = 1.3 * k;
  segs.forEach((s, i) => {
    if (i === 0 || i === segs.length - 1) return;
    const a = ang(i), tam = 11 * k * (1 - ((segs.length - 1 - i) / segs.length) * 0.45);
    for (const lado of [-1, 1]) {
      const al = tam * 2.2 + 6 * k, fase = Math.sin(i * 1.7 + lado) * 0.4;
      const px = s.x + Math.cos(a + lado * (Math.PI / 2 + fase)) * al, py = s.y + Math.sin(a + lado * (Math.PI / 2 + fase)) * al;
      const jx = (s.x + px) / 2 + Math.cos(a) * tam * 0.8, jy = (s.y + py) / 2 + Math.sin(a) * tam * 0.8;
      ctx.strokeStyle = rgba(PERNA, 0.85);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(jx, jy); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = cor;
      ctx.beginPath(); ctx.arc(jx, jy, 2 * k, 0, 6.28); ctx.fill();
      ctx.strokeStyle = rgba(cor, 0.85);
      ctx.strokeRect(px - 2.2 * k, py - 2.2 * k, 4.4 * k, 4.4 * k);
    }
  });
  // blocos
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i], a = ang(i), t = 11 * k * (1 - ((segs.length - 1 - i) / segs.length) * 0.45);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(6,8,22,0.9)'; ctx.strokeStyle = cor; ctx.lineWidth = 1.7 * k;
    ctx.beginPath(); ctx.roundRect(-t, -t, t * 2, t * 2, 3 * k); ctx.fill(); ctx.stroke();
    const c = t * 0.42, gg = t * 0.12;
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = r() < 0.55 ? cor : rgba(cor, 0.12);
      ctx.fillRect(b % 2 ? gg : -gg - c * 2, b < 2 ? -gg - c * 2 : gg, c * 2, c * 2);
    }
    ctx.restore();
  }
  // cabeca
  const h = segs.at(-1), a = ang(segs.length - 1), rr = 13 * k;
  ctx.strokeStyle = rgba(cor, 0.9); ctx.lineWidth = 1.4 * k;
  for (const lado of [-1, 1]) {
    const p = (fx, fy) => ({ x: h.x + Math.cos(a) * fx - Math.sin(a) * fy, y: h.y + Math.sin(a) * fx + Math.cos(a) * fy });
    const i0 = p(rr * 0.6, lado * rr * 0.4), m = p(rr * 1.8, lado * rr * 1.9), e = p(rr * 3.2, lado * rr * 1.5);
    ctx.beginPath(); ctx.moveTo(i0.x, i0.y); ctx.quadraticCurveTo(m.x, m.y, e.x, e.y); ctx.stroke();
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(e.x, e.y, 2.6 * k, 0, 6.28); ctx.fill();
  }
  ctx.fillStyle = 'rgba(6,8,22,0.95)';
  ctx.beginPath(); ctx.arc(h.x, h.y, rr, 0, 6.28); ctx.fill();
  ctx.strokeStyle = cor; ctx.lineWidth = 1.7 * k; ctx.stroke();
  ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(h.x, h.y, 2.4 * k, 0, 6.28); ctx.fill();
  ctx.font = `${Math.round(12 * k)}px Consolas, "JetBrains Mono", monospace`;
  ctx.fillStyle = rgba(cor, 0.9);
  ctx.fillText(ator.nome.toUpperCase(), h.x + 22 * k, h.y - 18 * k);
}
