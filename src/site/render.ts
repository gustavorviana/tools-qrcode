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
import { PAGES, TYPES, MAIN_TYPES, SITE_URL, SITE_NAME, typeById, typeHref, pageUrl } from './catalog';
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

/** Chip de tipo secundário (home) — leva a `/mais/?tipo=`. */
function typeChipLink(id: string): string {
  const t = typeById(id)!;
  return `      <a class="type-chip" href="${typeHref(id)}">${iconSvg(t.icon, 18)}<span>${escHtml(t.label)}</span></a>`;
}

/** Seletor de tipos da página `/mais/` (o primeiro vem ativo). */
function typePicker(types: string[]): string {
  const btns = types.map((id, i) => {
    const t = typeById(id)!;
    return `        <button type="button" class="type-tab${i === 0 ? ' active' : ''}" data-type="${id}" onclick="setType('${id}')">`
      + `<span class="tt-ico">${iconSvg(t.icon, 20)}</span><span>${escHtml(t.label)}</span></button>`;
  }).join('\n');
  return `      <div class="type-tabs" id="typeChips">\n${btns}\n      </div>`;
}

/** Campos de um ou mais tipos; em listas, só o primeiro fica visível. */
function fieldsFor(ids: string[], fields: Record<string, string>): string {
  return ids.map((id, i) => {
    const f = fields[id];
    if (!f) throw new Error(`campos inexistentes para o tipo: ${id}`);
    return i === 0 ? f : f.replace(/(<div class="fgroup" data-fields="[\w-]+")/, '$1 hidden');
  }).join('\n');
}

/** "Como fazer" + FAQ + links para outros tipos (texto visível, bom para SEO). */
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
  if (p.kind === 'gen') {
    const others = MAIN_TYPES.filter((id) => id !== p.type);
    parts.push(`  <section class="guide" aria-labelledby="outrosTipos">
    <h2 id="outrosTipos" class="section-title">Outros tipos de QR Code</h2>
    <div class="type-chips">
${others.map(typeChipLink).join('\n')}
      <a class="type-chip" href="/mais/">${iconSvg('more', 18)}<span>Mais tipos</span></a>
    </div>
  </section>`);
  }
  return parts.join('\n\n');
}

function faqBlock(faq: Faq[]): string {
  return `  <section class="guide" aria-labelledby="perguntas">
    <h2 id="perguntas" class="section-title">Perguntas frequentes</h2>
${faq.map((f) => `    <details class="faq"><summary>${escHtml(f.q)}</summary><p>${escHtml(f.a)}</p></details>`).join('\n')}
  </section>`;
}

/** Links do rodapé (todas as páginas de gerador + leitor). */
function footerLinks(): string {
  return PAGES.filter((p) => p.kind === 'gen' || p.kind === 'read')
    .map((p) => `        <a href="${p.path}">${escHtml(p.kind === 'gen' && p.type ? 'QR Code de ' + p.label : p.label)}</a>`)
    .join('\n');
}

/** Ícone do cabeçalho de uma página. */
function pageIcon(p: SitePage): string {
  if (p.kind === 'read') return iconSvg('read', 28);
  if (p.kind === 'privacy') return iconSvg('qr', 28);
  if (p.type) return iconSvg(typeById(p.type)!.icon, 28);
  return iconSvg('more', 28);
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

/** Monta o HTML completo de uma página. */
export function renderPage(p: SitePage, t: Templates, version: string): string {
  const vars: Record<string, string> = {
    title: p.title,
    description: p.description,
    url: pageUrl(p),
    kind: p.kind,
    type: p.type ?? (p.types?.[0] ?? ''),
    label: p.label,
    h1: p.h1,
    intro: p.intro,
    version,
    icon: pageIcon(p),
    logoIcon: iconSvg('qr', 20),
    readIcon: iconSvg('read'),
    jsonld: structuredData(p),
    navCreate: p.kind === 'home' || p.kind === 'gen' ? ' aria-current="page"' : '',
    navRead: p.kind === 'read' ? ' aria-current="page"' : '',
    footerLinks: footerLinks(),
    guide: guide(p),
  };
  if (p.kind === 'home') {
    vars.cards = MAIN_TYPES.map(typeCard).join('\n');
    vars.moreChips = TYPES.filter((x) => !MAIN_TYPES.includes(x.id)).map((x) => typeChipLink(x.id)).join('\n');
  }
  if (p.kind === 'gen') {
    const ids = p.types ?? [p.type!];
    vars.typePicker = p.types ? typePicker(p.types) : '';
    vars.fields = fieldsFor(ids, t.fields);
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
