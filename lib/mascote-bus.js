// ===========================================================================
// Barramento do Mascote ("Méti, o Inspetor")
// ---------------------------------------------------------------------------
// Desacopla o app do mascote: qualquer parte do código emite um estado e o
// componente <Mascote/> reage. Usa um CustomEvent no window — assim a
// integração em qualquer lugar é uma linha, sem importar contexto/provider.
//
// Estados: "idle" | "greeting" | "scanning" | "thinking" | "success"
//          | "warning" | "error"
//
// Exemplos de uso:
//   import { mascoteReact } from "@/lib/mascote-bus";
//   mascoteReact("scanning");                 // começou a ler a embalagem
//   mascoteReact("success", "Tudo certo!");   // análise aprovada
// ===========================================================================

export const MASCOTE_EVENT = "metalab:mascote";

/** Emite um estado para o mascote (no-op fora do browser). */
export function mascoteReact(state, message = null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MASCOTE_EVENT, { detail: { state, message } })
  );
}
