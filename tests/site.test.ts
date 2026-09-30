import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PAGES, TYPES, MAIN_TYPES, OTHER_TYPES, SITE_URL, typeHref } from '../src/site/catalog';
import { renderPage, renderSitemap, fill, escHtml, structuredData } from '../src/site/render';
import type { Templates } from '../src/site/render';

const TPL = path.resolve(__dirname, '../src/templates');
const readDir = (dir: string): Record<string, string> =>
  Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), readFileSync(path.join(dir, f), 'utf8')]));
const pages = readDir(path.join(TPL, 'pages'));
const templates: Templates = {
  layout: readFileSync(path.join(TPL, 'layout.html'), 'utf8'),
  pages: { home: pages.home, gen: pages.generator, read: pages.reader, privacy: pages.privacy },
  partials: readDir(path.join(TPL, 'partials')),
  fields: readDir(path.join(TPL, 'fields')),
};
const html = (p: string): string => renderPage(PAGES.find((x) => x.path === p)!, templates, '9.9.9');

describe('catálogo do site', () => {
  it('caminhos são únicos, começam e terminam com barra', () => {
    const paths = PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    paths.forEach((p) => expect(p).toMatch(/^\/([a-z-]+\/)?$/));
  });

  it('todo tipo tem arquivo de campos e exatamente uma página própria', () => {
    for (const t of TYPES) {
      expect(templates.fields[t.id], t.id).toBeTruthy();
      expect(PAGES.filter((p) => p.type === t.id), t.id).toHaveLength(1);
      expect(typeHref(t.id)).toMatch(/^\/[a-z-]+\/$/);
    }
  });

  it('não existe mais a página /mais/', () => {
    expect(PAGES.find((p) => p.path === '/mais/')).toBeUndefined();
  });

  it('títulos e descrições cabem nos limites usuais de SEO', () => {
    for (const p of PAGES) {
      expect(p.title.length, p.path).toBeLessThanOrEqual(75);
      expect(p.description.length, p.path).toBeLessThanOrEqual(165);
    }
  });
});

describe('fill', () => {
  it('escapa {{x}}, mantém {{{x}}} cru e expande includes', () => {
    const out = fill('<p>{{a}}</p>{{{b}}}<!--@include p-->', { a: '<b>&', b: '<i>ok</i>' }, { p: '[{{a}}]' });
    expect(out).toBe('<p>&lt;b&gt;&amp;</p><i>ok</i>[&lt;b&gt;&amp;]');
  });

  it('partial inexistente é erro de build', () => {
    expect(() => fill('<!--@include nada-->', {})).toThrow(/nada/);
  });

  it('escHtml cobre aspas simples e duplas', () => {
    expect(escHtml(`"a" 'b'`)).toBe('&quot;a&quot; &#39;b&#39;');
  });
});

describe('renderPage', () => {
  it('cada página tem título, canonical e H1 próprios, sem marcadores sobrando', () => {
    for (const p of PAGES) {
      const h = html(p.path);
      expect(h).toContain(`<title>${escHtml(p.title)}</title>`);
      expect(h).toContain(`<link rel="canonical" href="${SITE_URL}${p.path}">`);
      expect(h.match(/<h1[\s>]/g)?.length, p.path).toBe(1);
      expect(h, p.path).not.toMatch(/\{\{|<!--@include/);
      expect(h).toContain('/app.js?v=9.9.9');
    }
  });

  it('página de tipo traz só os campos daquele tipo, visíveis', () => {
    for (const t of TYPES) {
      const h = html(typeHref(t.id));
      expect(h).toContain(`data-page="gen" data-type="${t.id}"`);
      expect(h).toContain(`data-fields="${t.id}">`);
      expect(h.match(/data-fields="/g), t.id).toHaveLength(1);
    }
  });

  it('páginas internas não listam outros tipos: só um caminho para o início', () => {
    for (const p of PAGES.filter((x) => x.kind !== 'home')) {
      const h = html(p.path);
      expect(h, p.path).not.toContain('Outros tipos');
      expect(h, p.path).not.toContain('class="type-card"');
      for (const t of TYPES) {
        if (t.id !== p.type) expect(h, `${p.path} → ${t.id}`).not.toContain(`href="${typeHref(t.id)}"`);
      }
    }
    expect(html('/wifi/')).toContain('Voltar ao início');
  });

  it('a home tem um card por tipo, a visualização de link compartilhado e o #sobre', () => {
    const h = html('/');
    [...MAIN_TYPES, ...OTHER_TYPES].forEach((id) => expect(h).toContain(`<a class="type-card" href="${typeHref(id)}">`));
    expect(h).toContain('<details class="more-types divider-toggle">');
    expect(h).not.toContain('Outros tipos');
    expect(h).toContain('id="view-share"');
    expect(h).toContain('id="homeMain"');
    expect(h).toContain('id="sobre"');
  });

  it('toda página marca in-viana no <head> e tem o "‹ Voltar" do Viana Utils oculto por padrão', () => {
    for (const p of PAGES) {
      const h = html(p.path);
      const head = h.slice(0, h.indexOf('</head>'));
      expect(head, p.path).toContain("if(window.VianaApp)document.documentElement.classList.add('in-viana')");
      expect(h, p.path).toMatch(/<a class="viana-back" id="vianaBack" href="\/" hidden /);
    }
  });

  it('toda menção a instalar como app some dentro do Viana Utils (classe no-viana)', () => {
    const home = html('/');
    expect(home).toContain('class="card no-viana" id="aboutInstallCard"');
    expect(home).toContain('class="install-bar no-viana"');
    expect(home).toContain('<span class="no-viana">Instale como app e use</span>');
  });

  it('não carrega script nem estilo de outra origem', () => {
    for (const p of PAGES) {
      const h = html(p.path);
      expect(h).not.toMatch(/<script[^>]+src="https?:/);
      expect(h).not.toMatch(/<link[^>]+stylesheet[^>]+href="https?:/);
    }
  });
});

describe('dados estruturados e sitemap', () => {
  it('JSON-LD é JSON válido e não pode fechar a tag <script>', () => {
    for (const p of PAGES) {
      const tag = structuredData({ ...p, faq: [{ q: '</script><x>', a: 'ok' }] });
      const json = tag.replace(/^<script type="application\/ld\+json">/, '').replace(/<\/script>$/, '');
      expect(json).not.toContain('</script');
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });

  it('sitemap lista todas as páginas', () => {
    const xml = renderSitemap('2026-01-01');
    PAGES.forEach((p) => expect(xml).toContain(`<loc>${SITE_URL}${p.path}</loc>`));
  });
});
