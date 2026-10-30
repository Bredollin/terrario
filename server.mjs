// Servidor local do terrario: entrega a tela e deixa as criaturas cacarem.
// Escuta so em 127.0.0.1. Sem dependencias.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCacador, paraMarkdown, slug } from './src/cacador.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(RAIZ, 'public');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json' };

export function criarServidor({ saida = join(RAIZ, 'conhecimento'), cacar = criarCacador() } = {}) {
  const pasta = resolve(saida);

  async function corpoJson(req) {
    let txt = '';
    for await (const c of req) { txt += c; if (txt.length > 20000) throw new Error('Pedido grande demais.'); }
    return JSON.parse(txt || '{}');
  }

  function json(res, status, dado) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dado));
  }

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    try {
      if (req.method === 'POST' && url.pathname === '/api/cacar') {
        const { criatura = 'Sem nome', tema = '', link = '' } = await corpoJson(req);
        const achado = await cacar({ tema: String(tema), link: String(link) });
        const nome = String(criatura).slice(0, 40);
        const data = new Date();
        const arquivo = `${data.toISOString().slice(0, 10)}-${slug(nome)}-${slug(achado.tema)}.md`;
        await mkdir(pasta, { recursive: true });
        await writeFile(join(pasta, arquivo), paraMarkdown({ ...achado, criatura: nome }, data));
        return json(res, 200, { ...achado, arquivo });
      }
      if (req.method === 'GET' && url.pathname === '/api/conhecimento') {
        const nomes = (await readdir(pasta).catch(() => [])).filter(n => n.endsWith('.md')).sort().reverse();
        const itens = await Promise.all(nomes.slice(0, 50).map(async n => ({ arquivo: n, texto: await readFile(join(pasta, n), 'utf8') })));
        return json(res, 200, itens);
      }
      if (req.method !== 'GET') return json(res, 405, { erro: 'Metodo nao aceito.' });
      const caminho = resolve(PUBLICO, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      if (!caminho.startsWith(PUBLICO)) return json(res, 403, { erro: 'Fora do terrario.' });
      const dado = await readFile(caminho);
      res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] ?? 'application/octet-stream' });
      res.end(dado);
    } catch (e) {
      if (e.code === 'ENOENT') return json(res, 404, { erro: 'Nao achei.' });
      json(res, url.pathname.startsWith('/api/') ? 422 : 500, { erro: e.message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const porta = Number(process.env.PORT ?? 4747);
  const cacar = criarCacador({
    wiki: process.env.TERRARIO_WIKI || undefined,
    busca: process.env.TERRARIO_BUSCA || undefined,
    chave: process.env.ANTHROPIC_API_KEY || '',
    modelo: process.env.TERRARIO_MODELO || undefined,
    permitirPrivado: process.env.TERRARIO_PERMITIR_PRIVADO === '1',
  });
  criarServidor({ saida: process.env.TERRARIO_SAIDA || undefined, cacar }).listen(porta, '127.0.0.1', () => {
    console.log(`Terrario aberto em http://127.0.0.1:${porta}`);
    console.log(process.env.ANTHROPIC_API_KEY ? 'Resumos com IA (Claude).' : 'Sem ANTHROPIC_API_KEY: resumos extrativos.');
  });
}
