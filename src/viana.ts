/*
 * Integração com o app Android Viana Utils, que abre este site num WebView em
 * tela cheia e injeta `window.VianaApp` (congelado) antes de qualquer script do
 * site. Opcional: fora do app o objeto não existe e nada muda.
 *
 * Dentro do app, o site esconde tudo que fala em "instalar como app" (lá não há
 * instalação) e mostra "‹ Voltar" no cabeçalho, que chama `VianaApp.exit()`.
 * A classe `in-viana` no <html> é aplicada já no <head> (script inline do
 * layout) para evitar que esses elementos pisquem; aqui ela é garantida de novo.
 */

/** API exposta pelo `bridge.js` do Viana Utils (versão 1). */
export interface VianaAppApi {
  readonly platform: 'android';
  readonly version: number;
  exit(): void;
}

declare global {
  interface Window {
    readonly VianaApp?: VianaAppApi;
  }
}

/** Classe no <html> que ativa o modo "dentro do Viana Utils" no CSS. */
export const VIANA_CLASS = 'in-viana';

/** O site está aberto dentro do Viana Utils? */
export const inVianaApp = (w: Pick<Window, 'VianaApp'> = window): boolean =>
  typeof w.VianaApp !== 'undefined' && w.VianaApp !== null;

/** Marca o documento quando dentro do app. Retorna se está no app. */
export function setupViana(doc: Pick<Document, 'documentElement'>, w: Pick<Window, 'VianaApp'> = window): boolean {
  const on = inVianaApp(w);
  if (on) doc.documentElement.classList.add(VIANA_CLASS);
  return on;
}

/** Fecha o app web e volta ao hub do Viana Utils (sem efeito fora do app). */
export function vianaExit(w: Pick<Window, 'VianaApp'> = window): void {
  w.VianaApp?.exit();
}
