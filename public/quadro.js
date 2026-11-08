// Quadro de curiosidades da TV da sala. Mostra as cacadas do terrario como
// fichas (foto, nome, duas frases, numero) e, se ninguem estiver no terrario,
// manda as proprias criaturas cacarem de tempos em tempos.
//   ?troca=60      segundos por curiosidade
//   ?intervalo=180 segundos entre cacadas (0 = nao caca)
//   ?noite=0       nao escurece das 22h as 6h
import { ELENCO } from './elenco.js';

const P = new URLSearchParams(location.search);
const TROCA = (Number(P.get('troca')) || 60) * 1000;
const INTERVALO = P.has('intervalo') ? Number(P.get('intervalo')) : 180;
const $ = id => document.getElementById(id);
const COR = Object.fromEntries(ELENCO.map(c => [c.nome, c.cor]));

let fichas = [], atual = -1, timer = 0;

function cor(f) { return COR[f.criatura] ?? '#ffc861'; }

// Foto da ficha (ou, sem foto, um fundo na cor da criatura com o nome)
function camadaFoto(f) {
  const d = document.createElement('div');
  if (f.imagem) d.className = 'img', d.style.backgroundImage = `url("${f.imagem}")`;
  else {
    d.className = 'img sem';
    d.style.background = `radial-gradient(120% 90% at 30% 20%, ${cor(f)}66, #141a2c 70%)`;
    d.textContent = f.titulo;
  }
  return d;
}

function fundo(f) {
  const d = document.createElement('div');
  d.className = 'fundo';
  d.style.background = f.imagem ? `center/cover url("${f.imagem}")` : `radial-gradient(80% 80% at 30% 30%, ${cor(f)}, #0c0f18)`;
  return d;
}

function preencher(f) {
  $('chip').textContent = f.categoria || 'Curiosidade';
  $('chip').style.background = cor(f);
  $('titulo').textContent = f.titulo;
  $('desc').textContent = f.texto;
  $('num').hidden = !f.numero;
  $('numero').textContent = f.numero;
  $('legenda').textContent = f.numeroLegenda;
  $('onde').hidden = !f.onde;
  $('onde').textContent = f.onde;
  $('cor').style.background = cor(f);
  $('por').textContent = `Caçado por ${f.criatura || 'uma criatura'} no Terrário` + (f.origem ? ` · fonte: ${f.origem.replace(/^pt\./, '')}` : '');
}

function proximas() {
  const s = $('seguir');
  s.querySelectorAll('.prox').forEach(e => e.remove());
  s.hidden = fichas.length < 2;
  for (let k = 1; k <= Math.min(3, fichas.length - 1); k++) {
    const f = fichas[(atual + k) % fichas.length];
    const d = document.createElement('div'); d.className = 'prox';
    const m = document.createElement('div');
    m.style.background = f.imagem ? `center/cover url("${f.imagem}")` : cor(f);
    const t = document.createElement('span'); t.textContent = f.titulo;
    d.append(m, t); s.append(d);
  }
}

function barra() {
  const b = $('barra');
  b.style.transition = 'none'; b.style.width = '0';
  void b.offsetWidth;
  b.style.transition = `width ${TROCA}ms linear`; b.style.width = '100%';
}

function mostrar(i) {
  if (!fichas.length) return;
  atual = i % fichas.length;
  const f = fichas[atual];
  const fotos = $('fotos'), velhas = [...fotos.querySelectorAll('.img')], fundos = [...$('fundos').children];
  const nova = camadaFoto(f), nf = fundo(f);
  fotos.insertBefore(nova, $('onde')); $('fundos').append(nf);
  requestAnimationFrame(() => requestAnimationFrame(() => { nova.classList.add('on'); nf.classList.add('on'); }));
  velhas.forEach(v => v.classList.remove('on')); fundos.forEach(v => v.classList.remove('on'));
  setTimeout(() => { velhas.forEach(v => v.remove()); fundos.forEach(v => v.remove()); }, 1700);
  $('texto').style.opacity = 0;
  setTimeout(() => { preencher(f); $('texto').style.opacity = 1; }, velhas.length ? 700 : 0);
  $('contagem').textContent = `${atual + 1} de ${fichas.length} curiosidade${fichas.length > 1 ? 's' : ''}`;
  $('ritmo').textContent = `nova a cada ${TROCA >= 60000 ? Math.round(TROCA / 60000) + ' min' : Math.round(TROCA / 1000) + ' s'}`;
  proximas(); barra();
  clearTimeout(timer); timer = setTimeout(() => mostrar(atual + 1), TROCA);
}

async function carregar() {
  try {
    const novas = await (await fetch('/api/quadro')).json();
    if (!Array.isArray(novas)) return;
    const eraVazio = !fichas.length, idAtual = fichas[atual]?.id;
    fichas = novas;
    if (eraVazio) { if (fichas.length) mostrar(0); }
    else { atual = Math.max(0, fichas.findIndex(f => f.id === idAtual)); proximas(); $('contagem').textContent = `${atual + 1} de ${fichas.length} curiosidades`; }
  } catch {}
}

async function cacar() {
  const c = ELENCO[Math.floor(Math.random() * ELENCO.length)];
  const tema = c.curiosidades[Math.floor(Math.random() * c.curiosidades.length)];
  try { await fetch('/api/cacar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ criatura: c.nome, tema }) }); } catch {}
  carregar();
}

function relogio() {
  const n = new Date();
  $('hora').textContent = n.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const w = n.toLocaleDateString('pt-BR', { weekday: 'long' });
  $('data').replaceChildren(w[0].toUpperCase() + w.slice(1), document.createElement('br'),
    n.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }));
  const h = n.getHours();
  $('tv').classList.toggle('noite', P.get('noite') !== '0' && (h >= 22 || h < 6));
}

async function clima() {
  try {
    const c = await (await fetch('/api/clima')).json();
    if (typeof c.temperatura !== 'number' || Number.isNaN(c.temperatura)) return;
    $('tempo').textContent = `${c.temperatura}°` + (c.texto ? ` · ${c.texto}` : '');
    $('sol').className = c.codigo >= 51 ? 'chuva' : c.codigo >= 3 ? 'nuvem' : c.dia ? '' : 'lua';
    $('clima').hidden = false;
  } catch {}
}

relogio(); setInterval(relogio, 10_000);
clima(); setInterval(clima, 30 * 60_000);
await carregar();
setInterval(carregar, 5 * 60_000);
if (INTERVALO > 0) { if (fichas.length < 3) cacar(); setInterval(cacar, INTERVALO * 1000); }
window.quadro = { get fichas() { return fichas; }, get atual() { return atual; }, mostrar };
