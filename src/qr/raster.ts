/*
 * Preparo do SVG para rasterização (usado na exportação PNG). Pura: recebe o
 * markup e as dimensões-alvo e devolve o SVG ajustado, sem tocar em DOM/canvas.
 */

/**
 * Prepara o SVG para rasterização sem os "risquinhos" entre módulos.
 *
 * A qr-code-styling não pinta cada módulo diretamente: ela agrupa as formas
 * num `<clipPath>` e recorta um retângulo grande da cor. Ao rasterizar, o
 * anti-aliasing da máscara de recorte cobre só parcialmente os pixels da
 * borda compartilhada entre módulos vizinhos — o fundo vaza ali e vira uma
 * grade de linhas claras sobre as áreas escuras (o `crispEdges` original
 * também não resolve: com módulos de tamanho fracionário, o encaixe na grade
 * de pixels deixa vãos de 1px). A correção desfaz o recorte: cada grupo
 * recortado vira um `<g>` com as próprias formas pintadas na cor, mais um
 * `stroke` fino da mesma cor para vizinhos se sobreporem — sem borda
 * compartilhada, sem costura. Isso só afeta a rasterização; o SVG exportado
 * permanece intacto.
 *
 * Além disso, forçamos o `width`/`height` do próprio SVG para a resolução final
 * (ss× o alvo): o navegador rasteriza o SVG no tamanho intrínseco e só então
 * escala, então sem isso o desenho sairia de 1000px e seria ampliado (borrado).
 */
export function rasterizeSVG(svg: string, w: number, h: number): string {
  const clips = new Map<string, string>();
  for (const m of svg.matchAll(/<clipPath id="([^"]+)">([\s\S]*?)<\/clipPath>/g)) clips.set(m[1], m[2]);
  return svg
    .replace(/shape-rendering="[^"]*"/g, 'shape-rendering="geometricPrecision"')
    .replace(/<rect\b[^>]*clip-path="url\('?#([^'")]+)'?\)"[^>]*\/>/g, (tag, id: string) => {
      const shapes = clips.get(id);
      const fill = /\bfill="([^"]*)"/.exec(tag)?.[1];
      if (!shapes || !fill) return tag; // recorte desconhecido/gradiente: mantém como está
      return `<g fill="${fill}" stroke="${fill}" stroke-width="1" stroke-linejoin="round">${shapes}</g>`;
    })
    .replace(/(<svg\b[^>]*?)\swidth="[^"]*"/i, `$1 width="${w}"`)
    .replace(/(<svg\b[^>]*?)\sheight="[^"]*"/i, `$1 height="${h}"`);
}
