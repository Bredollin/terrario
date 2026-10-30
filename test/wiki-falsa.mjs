// Wikipedia de mentira para os testes (a nuvem nao alcanca a de verdade).
import { createServer } from 'node:http';

export const PAGINAS = {
  Centopeia: 'Centopeias sao artropodes de corpo segmentado. Cada segmento tem um par de pernas. O primeiro par virou forcipulas com veneno. Vivem no solo humido e cacam a noite.',
  Miriapode: 'Miriapodes reunem centopeias e piolhos-de-cobra. Possuem muitas pernas e corpo segmentado. Respiram por traqueias.',
  // pagina longa, do tamanho de um resumo real da Wikipedia (enche as 7 linhas da folha)
  Artropode: 'Os artropodes formam o maior filo do reino animal, com mais de um milhao de especies descritas. '.repeat(6)
    + 'Possuem exoesqueleto de quitina, corpo segmentado e apendices articulados, e trocam de pele em mudas sucessivas.',
};

export function wikiFalsa() {
  return createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const q = u.searchParams;
    res.setHeader('content-type', 'application/json');
    if (q.get('list') === 'search') {
      const achou = q.get('srsearch').toLowerCase().includes('nada') ? [] : Object.keys(PAGINAS).map(title => ({ title }));
      return res.end(JSON.stringify({ query: { search: achou } }));
    }
    if (q.get('prop') === 'extracts') {
      const pages = Object.fromEntries(q.get('titles').split('|').map((t, i) => [i, { title: t, extract: PAGINAS[t] }]));
      return res.end(JSON.stringify({ query: { pages } }));
    }
    // busca da web de mentira, no formato do DuckDuckGo HTML
    if (u.pathname === '/html/') {
      res.setHeader('content-type', 'text/html');
      const host = `http://${req.headers.host}`;
      return res.end(`<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(host + '/longo')}&rut=x">Longo</a>`
        + `<a class="result__a" href="https://pt.wikipedia.org/wiki/X">Wiki</a>`);
    }
    if (u.pathname === '/longo') {
      res.setHeader('content-type', 'text/html');
      return res.end('<html><head><title>Guia das centopeias</title></head><body><p>' + 'Centopeias caçam insetos a noite e se escondem sob pedras. '.repeat(10) + '</p></body></html>');
    }
    if (u.pathname === '/artigo') {
      res.setHeader('content-type', 'text/html');
      return res.end('<html><head><title>Polvos</title><script>x()</script></head><body><p>Polvos tem tres coracoes.</p><p>E sangue azul.</p></body></html>');
    }
    res.statusCode = 404; res.end('{}');
  });
}
