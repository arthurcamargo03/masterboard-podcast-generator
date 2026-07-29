import type { BlocosSeed, GuiaGerado } from "@/types/guia";

// Parse "seguro" da resposta da IA: nunca deixa o formato incerto do modelo
// chegar cru na tela. Cobre o caso comum de o modelo envolver o JSON em
// ```json ... ``` mesmo quando instruído a não fazer isso.
//
// DECISÃO: validar contra os ids da config (não só "é um JSON válido").
// Se a IA inventar um bloco novo ou esquecer um, isso quebraria o encaixe
// intenção (config) + perguntas (IA) no modal — melhor falhar aqui e cair
// no mock do que renderizar um guia incompleto sem avisar ninguém.
export function parseRespostaIA(bruto: string, config: BlocosSeed): GuiaGerado {
  const semCercaMarkdown = bruto
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(semCercaMarkdown);
  } catch {
    throw new Error("A IA não devolveu um JSON válido.");
  }

  if (
    typeof json !== "object" ||
    json === null ||
    !Array.isArray((json as { blocos?: unknown }).blocos)
  ) {
    throw new Error('JSON da IA sem a chave "blocos".');
  }

  const idsEsperados = new Set(config.blocos.map((b) => b.id));
  const blocos = (json as { blocos: unknown[] }).blocos;

  for (const bloco of blocos) {
    if (
      typeof bloco !== "object" ||
      bloco === null ||
      typeof (bloco as { id?: unknown }).id !== "string" ||
      !idsEsperados.has((bloco as { id: string }).id) ||
      !Array.isArray((bloco as { perguntas?: unknown }).perguntas)
    ) {
      throw new Error("Bloco da IA com formato ou id inesperado.");
    }
    for (const pergunta of (bloco as { perguntas: unknown[] }).perguntas) {
      if (
        typeof pergunta !== "object" ||
        pergunta === null ||
        typeof (pergunta as { pergunta?: unknown }).pergunta !== "string" ||
        !Array.isArray((pergunta as { puxadas?: unknown }).puxadas)
      ) {
        throw new Error("Pergunta da IA com formato inesperado.");
      }
    }
  }

  return { ...(json as { blocos: GuiaGerado["blocos"] }), fonte: "ia" };
}
