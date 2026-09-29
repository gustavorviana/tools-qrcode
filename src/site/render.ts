/*
 * Renderização das páginas estáticas do site (usada pelo build.mjs). Pura: recebe
 * o catálogo e os templates como strings e devolve HTML — sem fs, sem DOM —, o
 * que permite testar tudo com vitest.
 *
 * Sintaxe dos templates (mínima, sem dependência):
 *  - `{{chave}}`   → valor escapado para HTML;
 *  - `{{{chave}}}` → valor cru (HTML já montado aqui);
 *  - `<!--@include nome-->` → partial `nome` (templates/partials/nome.html).
 */
import type { SitePage, Faq } from './catalog';
import { PAGES, MAIN_TYPES, OTHER_TYPES, SITE_URL, SITE_NAME, typeById, typeHref, pageUrl } from './catalog';
import { iconSvg } from './icons';

// O build importa só este módulo: reexporta o catálogo de páginas.
export { PAGES };

/** Templates carregados do disco pelo build. */
export interface Templates {
  layout: string;
  /** Corpo por tipo de página (templates/pages/<kind>.html; `gen` = generator.html). */
  pages: Record<SitePage['kind'], string>;
  /** templates/partials/<nome>.html, pelo nome sem extensão. */
  partials: Record<string, string>;
  /** templates/fields/<tipo>.html, pelo id do tipo. */
  fields: Record<string, string>;
}

/** Escapa texto para conteúdo e atributos HTML. */
export const escHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Substitui includes e marcadores. Chave ausente → string vazia. */
export function fill(tpl: string, vars: Record<string, string>, partials: Record<string, string> = {}): string {
  let out = tpl;
  // Includes podem conter includes: expande até estabilizar (com limite contra ciclos).
  for (let i = 0; i < 5 && out.includes('<!--@include'); i++) {
    out = out.replace(/<!--@include ([\w-]+)-->/g, (_, name: string) => {
      if (!(name in partials)) throw new Error(`partial inexistente: ${name}`);
      return partials[name];
    });
  }
  return out
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => escHtml(vars[k] ?? ''));
}

/** `<script type="application/ld+json">` seguro (sem `</script>` possível no JSON). */
const jsonLd = (data: unknown): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const APP_LD = {
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL + '/',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript',
  inLanguage: 'pt-BR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
  author: { '@type': 'Person', name: 'Gustavo Viana' },
};

/** Dados estruturados da página: app (home), breadcrumb e FAQ (demais). */
export function structuredData(p: SitePage): string {
  const graph: unknown[] = [];
  if (p.kind === 'home') {
    graph.push({ ...APP_LD, description: p.description });
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: p.label, item: pageUrl(p) },
      ],
    });
  }
  if (p.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({
        '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return jsonLd({ '@context': 'https://schema.org', '@graph': graph });
}

/* ------------------------------------------------------------------ */
/* Blocos                                                              */
/* ------------------------------------------------------------------ */

/** Card de tipo (home). */
function typeCard(id: string): string {
  const t = typeById(id);
  if (!t) throw new Error(`tipo inexistente: ${id}`);
  return `      <a class="type-card" href="${typeHref(id)}">
        <span class="type-ico">${iconSvg(t.icon)}</span>
        <span class="type-txt"><span class="type-name">${escHtml(t.label)}</span><span class="type-desc">${escHtml(t.desc)}</span></span>
        <span class="type-arrow" aria-hidden="true">→</span>
      </a>`;
}

/** Campos do tipo da página (templates/fields/<tipo>.html). */
function fieldsFor(id: string, fields: Record<string, string>): string {
  const f = fields[id];
  if (!f) throw new Error(`campos inexistentes para o tipo: ${id}`);
  return f;
}

/** "Como fazer" + FAQ (texto visível, bom para SEO) + volta ao início. */
function guide(p: SitePage): string {
  const parts: string[] = [];
  if (p.steps?.length) {
    parts.push(`  <section class="guide" aria-labelledby="comoFazer">
    <h2 id="comoFazer" class="section-title">Como fazer</h2>
    <ol class="how-steps">
${p.steps.map((s, i) => `      <li><span class="how-num">${i + 1}</span><span>${escHtml(s)}</span></li>`).join('\n')}
    </ol>
  </section>`);
  }
  if (p.faq?.length) parts.push(faqBlock(p.faq));
  if (p.kind !== 'home') {
    parts.push('  <p class="back-home"><a href="/">← Voltar ao início</a></p>');
  }
  return parts.join('\n\n');
}

function faqBlock(faq: Faq[]): string {
  return `  <section class="guide" aria-labelledby="perguntas">
    <h2 id="perguntas" class="section-title">Perguntas frequentes</h2>
${faq.map((f) => `    <details class="faq"><summary>${escHtml(f.q)}</summary><p>${escHtml(f.a)}</p></details>`).join('\n')}
  </section>`;
}

/** Ícone do cabeçalho de uma página. */
function pageIcon(p: SitePage): string {
  if (p.kind === 'read') return iconSvg('read', 28);
  if (p.kind === 'privacy') return iconSvg('qr', 28);
  return iconSvg(typeById(p.type ?? '')?.icon ?? 'qr', 28);
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/**
 * Monta o HTML completo de uma página. `assetVersion` vai no `?v=` do app.js e do
 * app.css (o build passa o hash do conteúdo deles).
 */
export function renderPage(p: SitePage, t: Templates, assetVersion: string): string {
  const vars: Record<string, string> = {
    title: p.title,
    description: p.description,
    url: pageUrl(p),
    kind: p.kind,
    type: p.type ?? '',
    label: p.label,
    h1: p.h1,
    intro: p.intro,
    version: assetVersion,
    icon: pageIcon(p),
    logoIcon: iconSvg('qr', 20),
    readIcon: iconSvg('read'),
    jsonld: structuredData(p),
    navCreate: p.kind === 'home' || p.kind === 'gen' ? ' aria-current="page"' : '',
    navRead: p.kind === 'read' ? ' aria-current="page"' : '',
    guide: guide(p),
  };
  if (p.kind === 'home') {
    vars.cards = MAIN_TYPES.map(typeCard).join('\n');
    vars.otherCards = OTHER_TYPES.map(typeCard).join('\n');
  }
  if (p.kind === 'gen') {
    vars.fields = fieldsFor(p.type!, t.fields);
  }
  const body = fill(t.pages[p.kind], vars, t.partials);
  // O corpo entra por último, para não ser reprocessado como template.
  const MARK = '\u0000content\u0000';
  return fill(t.layout, { ...vars, content: MARK }, t.partials).replace(MARK, () => body);
}

/** `sitemap.xml` com todas as páginas do catálogo. */
export function renderSitemap(lastmod: string): string {
  const urls = PAGES.map((p) => `  <url>
    <loc>${pageUrl(p)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${p.kind === 'home' ? '1.0' : p.kind === 'privacy' ? '0.3' : '0.8'}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
