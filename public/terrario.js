// Terrario: fundo vivo, criaturas de blocos com pernas de grafo e a leitura
// das paginas que elas cacam. Tudo em canvas 2D, sem bibliotecas.
import { ELENCO } from './elenco.js';
import { Criatura, PERNA, rand, lerp, dist, suave, rgba, brilhar } from './criatura.js';

const CORES = ['#ffd23f', '#3ee6ff', '#ff5fd2', '#9dff57', '#ff8a3d', '#b18cff', '#5effc8', '#ff4f6d'];
const NOMES = ['Quiron', 'Lumen', 'Mirra', 'Tessela', 'Vespa', 'Orvalho', 'Fiandeira', 'Brasa', 'Nimbo', 'Sarca'];
const MAX = 20;

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
let W = 0, H = 0, DPR = 1, tempo = 0;
const mouse = { x: -999, y: -999 };
const pintaBrilho = (...a) => brilhar(ctx, ...a);


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


// ---------------------------------------------------------------- leitura
// A criatura le andando, sem folha na tela; passar o mouse mostra o cartao
// do que ela esta lendo (desenhaCartao).
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
let rotulos = [], ondas = [], orbes = [];
let naArea = false;
// o mundo que as criaturas enxergam
Criatura.padrao = { ctx, mouse, get W() { return W; }, get H() { return H; }, get tempo() { return tempo; },
  get ondas() { return ondas; } };

// cartao do que a criatura esta lendo: aparece com o mouse em cima dela
function desenhaCartao(c) {
  const { titulo, palavras, inicio, dura } = c.leitura;
  const prog = Math.min(1, (tempo - inicio) / dura);
  const ate = Math.floor(prog * palavras.length);
  const trecho = palavras.slice(Math.max(0, ate - 26), ate);
  const w = 330, x = Math.min(W - w - 20, Math.max(20, c.cabeca.x + 40));
  ctx.font = '12px "Inter", "Segoe UI", sans-serif';
  // quebra o trecho em ate 4 linhas
  const linhas = [];
  let linha = '';
  for (const p of trecho) {
    if (ctx.measureText(`${linha} ${p}`).width > w - 28) { linhas.push(linha); linha = p; } else linha = linha ? `${linha} ${p}` : p;
  }
  if (linha) linhas.push(linha);
  const vis = linhas.slice(-4), h = 70 + vis.length * 17;
  const y = Math.min(H - h - 20, Math.max(20, c.cabeca.y - h - 30));
  ctx.fillStyle = 'rgba(8,11,30,0.9)';
  ctx.strokeStyle = rgba(c.cor, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(c.cor, 0.95);
  ctx.font = '10px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`${c.nome.toUpperCase()} ESTA LENDO`, x + 14, y + 20);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '600 14px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(titulo.length > 38 ? titulo.slice(0, 37) + '…' : titulo, x + 14, y + 40);
  ctx.font = '12px "Inter", "Segoe UI", sans-serif';
  vis.forEach((l, i) => { ctx.fillStyle = `rgba(200,208,255,${0.45 + 0.5 * (i + 1) / vis.length})`; ctx.fillText(l, x + 14, y + 62 + i * 17); });
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 14, y + h - 12, w - 28, 3);
  ctx.fillStyle = c.cor; ctx.fillRect(x + 14, y + h - 12, (w - 28) * prog, 3);
}

function desenhaFora() {
  ctx.font = '12px "JetBrains Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,208,255,0.55)';
  ctx.fillText('as criaturas ligadas estao passeando na sua area de trabalho', W / 2, H * 0.42);
  ctx.textAlign = 'left';
}
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
  ponte?.ligadas(paraOApp());
}
// o app recebe as ligadas com nome, cor e jeito (para soltar na area de trabalho)
function paraOApp() {
  return elenco.filter(d => d.ativa).map(({ id, nome, cor, n, vel }) => ({ id, nome, cor, n, vel }));
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

// Atualiza os chips no lugar. Recriar tudo a cada mudanca trocava o botao
// entre o apertar e o soltar do mouse, e o clique se perdia.
const chips = new Map();
function desenhaLista() {
  for (const [id, ch] of chips) if (!elenco.some(d => d.id === id)) { ch.raiz.remove(); chips.delete(id); }
  for (const d of elenco) {
    let ch = chips.get(d.id);
    if (!ch) {
      const chave = el('button', { class: 'liga', type: 'button', role: 'switch' });
      chave.addEventListener('click', () => alternar(d.id));
      const legenda = el('small');
      const nome = el('button', { class: 'nome', type: 'button' }, el('span'), legenda);
      nome.addEventListener('click', () => { const v = criaturas.find(c => c.id === d.id); v ? escolher(v) : alternar(d.id, true); });
      const raiz = el('span', { class: 'chip', style: `--c:${d.cor}` }, chave, nome);
      lista.append(raiz);
      ch = { raiz, chave, nome, legenda };
      chips.set(d.id, ch);
    }
    const viva = criaturas.find(c => c.id === d.id);
    ch.raiz.className = `chip${viva ? '' : ' desligada'}`;
    ch.raiz.setAttribute('aria-current', String(!!viva && viva === escolhida));
    ch.chave.setAttribute('aria-checked', String(!!viva));
    ch.chave.setAttribute('aria-label', `${viva ? 'Desligar' : 'Ligar'} ${d.nome}`);
    ch.chave.title = viva ? 'desligar' : 'ligar';
    ch.nome.title = [d.papel, d.tema && `caca: ${d.tema}`].filter(Boolean).join(' · ');
    ch.nome.firstChild.textContent = viva?.nome ?? d.nome;
    ch.legenda.textContent = viva && viva.estado !== 'vagando' ? viva.legenda : '';
  }
  contagem.textContent = `${criaturas.length} de ${elenco.length} ligadas`;
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
  c.legenda = pedido.sozinha ? `escolheu: ${(pedido.tema || '').slice(0, 24)}` : 'farejando…';
  desenhaLista();
  const inicio = performance.now();
  let achado;
  try {
    achado = await pedirCaca(c, pedido);
  } catch (e) {
    c.estado = 'vagando'; c.legenda = ''; c.cancelada = false;
    c.proxima = tempo + INTERVALO;
    desenhaLista();
    if (!pedido.sozinha) c.cutucar({ x: c.cabeca.x + 10, y: c.cabeca.y });
    return avisar(`${c.nome} voltou sem nada: ${e.message}`);
  }
  // fareja pelo menos um pouquinho, para dar tempo de ver
  await new Promise(r => setTimeout(r, Math.max(0, 1600 - (performance.now() - inicio))));
  const soltos = [...(achado.termos ?? [])];
  for (const pagina of c.cancelada ? [] : achado.paginas.slice(0, 3)) {
    c.estado = 'lendo';
    c.legenda = `lendo: ${pagina.titulo.slice(0, 28)}`;
    desenhaLista();
    // le umas 9 palavras por segundo, entre 6 e 12 s por pagina
    const palavras = pagina.texto.split(/\s+/).filter(Boolean);
    const dura = Math.min(12, Math.max(6, palavras.length / 9));
    c.leitura = { titulo: pagina.titulo, url: pagina.url, palavras, inicio: tempo, dura };
    const fim = tempo + dura;
    let proximo = tempo + 1.2;
    await esperar(() => {
      // de tempos em tempos um termo sai da cabeca
      if (tempo > proximo && soltos.length) { rotulos.push(new Rotulo(soltos.shift(), c.cabeca.x, c.cabeca.y, c.cor)); proximo = tempo + 2.2; }
      return tempo >= fim || c.cancelada;
    });
    if (c.cancelada) break;
  }
  c.leitura = null;
  if (c.cancelada) { c.cancelada = false; c.leitura = null; c.estado = 'vagando'; c.legenda = ''; return; }
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
  // o que aprendeu vira curiosidade para a proxima caca
  c.historico = [achado.tema, ...c.historico].slice(0, 12);
  c.pistas = (achado.termos ?? []).filter(t => !c.historico.includes(t)).slice(0, 8);
  c.proxima = tempo + INTERVALO;
  c.estado = 'vagando'; c.legenda = '';
  desenhaLista();
}

// ---------------------------------------------------------------- caca sozinha
// Ligada e sem tema dado, a criatura escolhe o que quer pesquisar: ora uma
// curiosidade do seu papel, ora uma pista do que leu na ultima caca.
const INTERVALO = Number(new URLSearchParams(location.search).get('intervalo')) || 180;
let sozinhas = true;
try { sozinhas = localStorage.getItem('terrario.sozinhas') !== 'nao'; } catch {}

export function escolherTema(c, sorte = Math.random) {
  const ja = new Set(c.historico);
  const curiosas = (c.curiosidades?.length ? c.curiosidades : [c.tema].filter(Boolean)).filter(t => !ja.has(t));
  const pistas = (c.pistas ?? []).filter(t => !ja.has(t));
  if (pistas.length && (sorte() < 0.4 || !curiosas.length)) return pistas[Math.floor(sorte() * pistas.length)];
  if (curiosas.length) return curiosas[Math.floor(sorte() * curiosas.length)];
  // ja viu tudo: recomeca pelas curiosidades
  c.historico = [];
  return (c.curiosidades ?? [c.tema])[0] || 'curiosidades da natureza';
}

function cacasSozinhas() {
  if (!sozinhas) return;
  // uma caca por vez, para o terrario nao virar bagunca
  const ocupada = criaturas.some(c => c.estado !== 'vagando');
  for (const c of criaturas) {
    if (c.estado !== 'vagando' || tempo < c.proxima) continue;
    if (ocupada) { c.proxima = tempo + rand(4, 10); continue; }
    cacar(c, { tema: escolherTema(c), sozinha: true });
    return;
  }
}
setInterval(cacasSozinhas, 1000);

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
const botaoSozinhas = document.getElementById('btn-sozinhas');
function mostraSozinhas() {
  botaoSozinhas.setAttribute('aria-checked', String(sozinhas));
  botaoSozinhas.textContent = `caçam sozinhas: ${sozinhas ? 'sim' : 'não'}`;
}
botaoSozinhas.addEventListener('click', () => {
  sozinhas = !sozinhas;
  try { localStorage.setItem('terrario.sozinhas', sozinhas ? 'sim' : 'nao'); } catch {}
  for (const c of criaturas) c.proxima = tempo + rand(3, 8);
  mostraSozinhas();
  avisar(sozinhas ? `Sem tema dado, cada uma escolhe o seu e caça a cada ${Math.round(INTERVALO / 60)} min.` : 'Agora só caçam quando você der o tema.');
});
mostraSozinhas();
document.getElementById('btn-todas').addEventListener('click', () => todas(true));
document.getElementById('btn-nenhuma').addEventListener('click', () => todas(false));

// ---------------------------------------------------------------- modos do app
// area de trabalho, protetor de tela e imagem no bloqueio: chaves que so
// funcionam no app de Windows; no navegador a previa continua valendo.
const previa = document.getElementById('previa');
const moldura = document.getElementById('previa-quadro');
const CHAVES = {
  area: { botao: document.getElementById('btn-area'), ligar: l => ponte.area(l),
    sim: () => 'Criaturas soltas na area de trabalho. O clique passa por elas.', nao: () => 'Criaturas de volta so no terrario.' },
  protetor: { botao: document.getElementById('btn-protetor'), ligar: l => ponte.protetor(l),
    sim: e => `Protetor de tela ligado: entra depois de ${e?.protetorMinutos ?? 5} min parado e pede a senha ao sair.`, nao: () => 'Protetor de tela desligado.' },
  bloqueio: { botao: document.getElementById('btn-bloqueio'), ligar: l => ponte.bloqueio(l),
    sim: () => 'Imagem no bloqueio ligada: uma nova a cada Win+L.', nao: () => 'Imagem no bloqueio desligada.' },
};
function mostraEstado(e) {
  naArea = !!e.area;
  for (const [nome, k] of Object.entries(CHAVES)) k.botao.setAttribute('aria-checked', String(!!e[nome]));
}
for (const [nome, k] of Object.entries(CHAVES)) k.botao.addEventListener('click', async () => {
  if (!ponte) return avisar(nome === 'area' ? 'Soltar na area de trabalho so funciona no app de Windows.'
    : 'Isso so funciona no app de Windows. Aqui da para ver a previa.');
  const ligar = k.botao.getAttribute('aria-checked') !== 'true';
  k.botao.setAttribute('aria-checked', String(ligar));
  try {
    const e = await k.ligar(ligar);
    avisar(ligar ? k.sim(e) : k.nao(e));
  } catch (e) {
    k.botao.setAttribute('aria-checked', String(!ligar));
    avisar(`Nao consegui: ${e.message.replace(/^.*Error: /, '')}`);
  }
});
function abrirPrevia() {
  const semente = new Date().toISOString();
  moldura.src = `protetor.html?${new URLSearchParams({ semente })}`;
  document.getElementById('previa-legenda').textContent = 'protetor de tela · muda sozinho a cada meio minuto';
  previa.hidden = false;
}
document.getElementById('btn-previa').addEventListener('click', abrirPrevia);
document.getElementById('previa-outra').addEventListener('click', () => moldura.contentWindow.protetor?.proximo());
document.getElementById('previa-cheia').addEventListener('click', () => ponte ? ponte.verProtetor() : moldura.requestFullscreen?.());
document.getElementById('previa-fechar').addEventListener('click', () => { previa.hidden = true; moldura.src = 'about:blank'; });
mostraEstado({});
ponte?.estado().then(mostraEstado).catch(() => {});
ponte?.aoMudarEstado?.(mostraEstado);
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
  for (const r of rotulos) { r.atualizar(dt); r.desenhar(); }
  rotulos = rotulos.filter(r => r.vida > 0).slice(-80);
  for (const o of ondas) {
    o.r += 90 * (1 / 60); o.vida -= 1 / 60 * 1.1;
    ctx.strokeStyle = rgba(o.cor, Math.max(0, o.vida) * 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.28); ctx.stroke();
  }
  ondas = ondas.filter(o => o.vida > 0);
  // na area de trabalho elas passeiam fora; aqui fica so o aviso (sem duplicar)
  if (naArea) desenhaFora();
  else {
    for (const c of criaturas) { c.atualizar(dt); c.desenhar(c === escolhida); }
    const sob = maisPerto(mouse, 70);
    if (sob?.leitura) desenhaCartao(sob);
  }
  for (const o of orbes) { o.atualizar(dt); o.desenhar(); }
  orbes = orbes.filter(o => o.fim);
  desenhaVidro();
  requestAnimationFrame(quadro);
}

redimensionar();
elenco = carregar() ?? ELENCO.map(d => ({ ...d, ativa: LIGADAS_DE_INICIO.has(d.id) }));
// agente novo no Brain aparece desligado no elenco salvo; campos novos
// (como as curiosidades) chegam nos que ja estavam salvos
for (const d of ELENCO) {
  const salvo = elenco.find(x => x.id === d.id);
  if (salvo) for (const k of Object.keys(d)) salvo[k] ??= d[k];
  else elenco.push({ ...d, ativa: false });
}
criaturas = elenco.filter(d => d.ativa).map(d => new Criatura(d));
escolher(criaturas[0]);
ponte?.ligadas(paraOApp());
carregarConhecimento();
requestAnimationFrame(quadro);

// ?demo: a primeira criatura caca sozinha, para mostrar o efeito
if (new URLSearchParams(location.search).has('demo') && criaturas[0]) setTimeout(() => cacar(criaturas[0], { tema: 'centopeias' }), 1200);

// para testes automatizados
window.terrario = { get criaturas() { return criaturas; }, get elenco() { return elenco; }, cacar, chocar, alternar };
