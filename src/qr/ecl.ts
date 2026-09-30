import type { Ecl } from './types';

/** Escolha do seletor "Correção de erro": um nível fixo ou `AUTO`. */
export type EclChoice = Ecl | 'AUTO';

export interface EclContext {
  /** Corpo ou centro de olho desenhados pelo renderer próprio (módulos isolados). */
  customShapes: boolean;
  hasLogo: boolean;
}

export interface EclResult {
  ecl: Ecl;
  /** O nível manual foi elevado por causa do logo (a UI avisa a pessoa). */
  raised: boolean;
}

/**
 * Resolve o nível de correção efetivo (SPEC-002: CUS-N03, CUS-F14).
 * `AUTO`: M por padrão; Q com formas isoladas; H com logo.
 * Manual: respeita a escolha, mas com logo o mínimo é Q.
 */
export function resolveEcl(choice: EclChoice, ctx: EclContext): EclResult {
  if (choice === 'AUTO') {
    let ecl: Ecl = 'MEDIUM';
    if (ctx.customShapes) ecl = 'QUARTILE';
    if (ctx.hasLogo) ecl = 'HIGH';
    return { ecl, raised: false };
  }
  if (ctx.hasLogo && (choice === 'LOW' || choice === 'MEDIUM')) return { ecl: 'QUARTILE', raised: true };
  return { ecl: choice, raised: false };
}
