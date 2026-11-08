// Quadro de curiosidades da TV da sala. Mostra as cacadas do terrario como
// fichas (fotos, nome, duas frases, numero) e, se ninguem estiver no terrario,
// manda as proprias criaturas cacarem temas variados, sem repetir.
//   ?troca=30      segundos por curiosidade
//   ?intervalo=150 segundos entre cacadas (0 = nao caca)
//   ?noite=0       nao escurece das 22h as 6h
import { ELENCO } from './elenco.js';
import { LISTA_SALA } from './temas-sala.js';

const P = new URLSearchParams(location.search);
const TROCA = (Number(P.get('troca')) || 30) * 1000;
const INTERVALO = P.has('intervalo') ? Number(P.get('intervalo')) : 150;
const $ = id => document.getElementById(id);
const COR = Object.fromEntries(ELENCO.map(c => [c.nome, c.cor]));
const chave = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let fichas = [], atual = -1, timer = 0, fotoTimer = 0;
const tentados = new Set();

const cor = f => COR[f.criatura] ?? '#ffc861';
const fotos = f => (f.imagens?.length ? f.imagens : f.imagem ? [f.imagem] : []);

// Uma camada de foto (ou, sem foto, um fundo na cor da criatura com o nome)
function camadaFoto(f, src, duracao) {
  const d = document.createElement('div');
  d.style.setProperty('--kb', `${Math.round(duracao / 1000) + 2}s`);
  d.style.setProperty('--dx', `${(Math.random() * 4 - 2).toFixed(1)}%`);
  d.style.setProperty('--dy', `${(Math.random() * 3 - 1.5).toFixed(1)}%`);
  if (src) d.className = 'img', d.style.backgroundImage = `url("${src}")`;
  else {
    d.className = 'img sem';
    d.style.background = `radial-gradient(120% 90% at 30% 20%, ${cor(f)}77, #141a2c 70%)`;
    d.textContent = f.titulo;
  }
  return d;
}

function trocarCamada(pai, nova, antes = null) {
  const velhas = [...pai.querySelectorAll(':scope > .img, :scope > .fundo')];
  pai.insertBefore(nova, antes);
  requestAnimationFrame(() => requestAnimationFrame(() => nova.classList.add('on')));
  velhas.forEach(v => v.classList.remove('on'));
  setTimeout(() => velhas.forEach(v => v.remove()), 2100);
}

function mostrarFoto(f, k) {
  const lista = fotos(f), src = lista[k] ?? '', dur = TROCA / Math.max(1, lista.length);
  trocarCamada($('fotos'), camadaFoto(f, src, dur), $('fotos').querySelector('.sombra'));
  const fundo = document.createElement('div');
  fundo.className = 'fundo';
  fundo.style.background = src ? `center/cover url("${src}")` : `radial-gradient(80% 80% at 30% 30%, ${cor(f)}, #0a0d16)`;
  trocarCamada($('fundos'), fundo);
  [...$('miniaturas').children].forEach((m, i) => m.classList.toggle('on', i === k));
  clearTimeout(fotoTimer);
  if (lista.length > 1) fotoTimer = setTimeout(() => mostrarFoto(f, (k + 1) % lista.length), dur);
}

function preencher(f) {
  $('tv').style.setProperty('--tom', cor(f));
  $('chip').textContent = f.categoria || 'Curiosidade';
  $('titulo').textContent = f.titulo;
  $('desc').textContent = f.texto;
  $('num').hidden = !f.numero;
  $('numero').textContent = f.numero;
  $('legenda').textContent = f.numeroLegenda;
  $('onde').hidden = !f.onde;
  $('onde').textContent = f.onde;
  $('por').textContent = `Caçado por ${f.criatura || 'uma criatura'} no Terrário` + (f.origem ? ` · fonte: ${f.origem.replace(/^pt\./, '')}` : '');
  const mini = $('miniaturas'); mini.replaceChildren();
  if (fotos(f).length > 1) for (const src of fotos(f)) {
    const s = document.createElement('span'); s.style.backgroundImage = `url("${src}")`; mini.append(s);
  }
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
    const p = document.createElement('p');
    const e = document.createElement('em'); e.textContent = f.categoria || 'Curiosidade'; e.style.color = cor(f);
    const t = document.createElement('span'); t.textContent = f.titulo;
    p.append(e, t); d.append(m, p); s.append(d);
  }
}

function barra() {
  const b = $('barra');
  b.style.transition = 'none'; b.style.width = '0';
  void b.offsetWidth;
  b.style.transition = `width ${TROCA}ms linear`; b.style.width = '100%';
}

function contagem() {
  $('contagem').textContent = `${atual + 1} de ${fichas.length} curiosidade${fichas.length > 1 ? 's' : ''}`;
}

function mostrar(i) {
  if (!fichas.length) return;
  const primeira = atual < 0;
  atual = i % fichas.length;
  const f = fichas[atual], texto = $('texto');
  mostrarFoto(f, 0);
  texto.classList.add('saindo');
  setTimeout(() => {
    preencher(f);
    texto.classList.remove('saindo'); texto.classList.add('entrando');
    requestAnimationFrame(() => requestAnimationFrame(() => texto.classList.remove('entrando')));
  }, primeira ? 0 : 700);
  $('ritmo').textContent = `nova a cada ${TROCA >= 60000 ? Math.round(TROCA / 60000) + ' min' : Math.round(TROCA / 1000) + ' s'}`;
  contagem(); proximas(); barra();
  clearTimeout(timer); timer = setTimeout(() => mostrar(atual + 1), TROCA);
}

async function carregar() {
  try {
    const novas = await (await fetch('/api/quadro')).json();
    if (!Array.isArray(novas)) return;
    const idAtual = fichas[atual]?.id;
    fichas = novas;
    if (atual < 0 || !idAtual) { if (fichas.length) mostrar(0); return; }
    atual = Math.max(0, fichas.findIndex(f => f.id === idAtual));
    contagem(); proximas();
  } catch {}
}

// Tema da sala que ainda nao virou ficha nem foi tentado nesta sessao.
export function escolherTema(lista, feitos) {
  const livres = lista.filter(t => !feitos.has(chave(t.tema)));
  const de = livres.length ? livres : lista;
  return de[Math.floor(Math.random() * de.length)];
}

async function cacar() {
  const feitos = new Set([...fichas.map(f => chave(f.tema || f.titulo)), ...tentados]);
  const t = escolherTema(LISTA_SALA, feitos);
  tentados.add(chave(t.tema));
  const c = ELENCO[Math.floor(Math.random() * ELENCO.length)];
  try { await fetch('/api/cacar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ criatura: c.nome, tema: t.tema }) }); } catch {}
  await carregar();
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
if (INTERVALO > 0) {
  // poucas fichas: caca algumas em seguida para o quadro encher logo
  (async () => { for (let k = 0; k < 4 && fichas.length < 8; k++) await cacar(); })();
  setInterval(cacar, INTERVALO * 1000);
}
window.quadro = { get fichas() { return fichas; }, get atual() { return atual; }, mostrar };
