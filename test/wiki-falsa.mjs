// Wikipedia de mentira para os testes (a nuvem nao alcanca a de verdade).
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';

export const PAGINAS = {
  Centopeia: 'Centopeias sao artropodes de corpo segmentado. Cada segmento tem um par de pernas. O primeiro par virou forcipulas com veneno. Vivem no solo humido e cacam a noite.',
  Miriapode: 'Miriapodes reunem centopeias e piolhos-de-cobra. Possuem muitas pernas e corpo segmentado. Respiram por traqueias.',
  // pagina longa, do tamanho de um resumo real da Wikipedia (enche as 7 linhas da folha)
  Artropode: 'Os artropodes formam o maior filo do reino animal, com mais de um milhao de especies descritas. '.repeat(6)
    + 'Possuem exoesqueleto de quitina, corpo segmentado e apendices articulados, e trocam de pele em mudas sucessivas.',
};

// foto de mentira: PNG 480x300 com ceu, sol e morros (PNG de verdade, para a captura)
function png(w, h, cor) {
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c >>> 1 ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const bloco = (tipo, dado) => { const t = Buffer.from(tipo); const n = Buffer.alloc(4); n.writeUInt32BE(dado.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dado]))); return Buffer.concat([n, t, dado, c]); };
  const cab = Buffer.alloc(13); cab.writeUInt32BE(w, 0); cab.writeUInt32BE(h, 4); cab[8] = 8; cab[9] = 2;
  const cru = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cru.set(cor(x / w, y / h), y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', cab), bloco('IDAT', deflateSync(cru)), bloco('IEND', Buffer.alloc(0))]);
}
const PNG = png(480, 300, (x, y) => {
  if (Math.hypot(x - 0.72, y - 0.3) < 0.08) return [255, 236, 170];
  if (y > 0.62 + 0.08 * Math.sin(x * 9)) return [70, 150, 95];
  return [120 + 100 * y, 190 + 40 * y, 255];
});

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
    // foto do artigo (quadro de curiosidades): so a Centopeia tem foto
    if (q.get('prop') === 'pageimages') {
      const t = q.get('titles');
      const thumb = t === 'Centopeia' ? { source: `http://${req.headers.host}/img/centopeia.png` } : undefined;
      return res.end(JSON.stringify({ query: { pages: { 1: { title: t, thumbnail: thumb } } } }));
    }
    if (u.pathname === '/img/centopeia.png') {
      res.setHeader('content-type', 'image/png');
      return res.end(PNG);
    }
    // clima de mentira, no formato do Open-Meteo
    if (u.pathname === '/v1/forecast') return res.end(JSON.stringify({ current: { temperature_2m: 27.4, weather_code: 0, is_day: 1 } }));
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
