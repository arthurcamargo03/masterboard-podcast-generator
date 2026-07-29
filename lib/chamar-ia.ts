// Chamada à IA via fetch puro (sem SDK) — protótipo simples, uma chamada,
// não justifica dependência extra. Usa a Messages API da Anthropic.
//
// DECISÃO: timeout curto (20s) com AbortController. Sem isso, uma IA lenta
// deixaria a pessoa de marketing esperando na tela sem saber se travou —
// preferimos falhar rápido e cair no mock (ver route handler).
const TIMEOUT_MS = 20_000;

export async function chamarIA(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const modelo = process.env.AI_MODEL || "claude-sonnet-5";

  if (!apiKey) {
    throw new Error("AI_API_KEY não configurada.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 2048,
        // Tarefa é geração de JSON estruturado, não raciocínio — desliga o
        // thinking adaptativo (ligado por padrão no Sonnet 5) pra resposta
        // mais rápida e barata.
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!resposta.ok) {
      throw new Error(`IA respondeu com status ${resposta.status}.`);
    }

    const dados = await resposta.json();
    // DECISÃO: Sonnet 5 roda com thinking adaptativo ligado por padrão, então
    // o bloco de texto pode não ser o content[0] (o primeiro pode ser "thinking").
    // Por isso procura o bloco certo em vez de indexar direto.
    type Bloco = { type: string; text?: string };
    const blocoTexto = (dados?.content as Bloco[] | undefined)?.find((b) => b.type === "text");
    if (!blocoTexto?.text) {
      throw new Error("Resposta da IA sem conteúdo de texto.");
    }
    return blocoTexto.text;
  } finally {
    clearTimeout(timeout);
  }
}
