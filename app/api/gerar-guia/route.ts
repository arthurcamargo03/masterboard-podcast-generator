import { montarPrompt } from "@/lib/montar-prompt";
import { gerarMock } from "@/lib/gerar-mock";
import { parseRespostaIA } from "@/lib/parse-resposta-ia";
import { chamarIA } from "@/lib/chamar-ia";
import type { BlocosSeed, DadosGerador, GuiaGerado } from "@/types/guia";

interface CorpoRequisicao {
  dados: DadosGerador;
  config: BlocosSeed;
  modo: "mock" | "ia";
}

// Erro de negócio (input inválido) x erro técnico (IA fora do ar) são
// tratados diferente: o primeiro é 400 (a pessoa precisa corrigir algo),
// o segundo cai em mock com 200 + aviso (ela não pode ficar travada
// esperando a IA "porque o desafio pede degradação, não bloqueio").
class RequisicaoInvalida extends Error {}

function validarCorpo(corpo: unknown): CorpoRequisicao {
  if (typeof corpo !== "object" || corpo === null) {
    throw new RequisicaoInvalida("Requisição vazia ou mal formada.");
  }
  const { dados, config, modo } = corpo as Partial<CorpoRequisicao>;

  if (!dados || !dados.convidado?.trim() || !dados.tema?.trim() || !dados.objetivo?.trim() || !dados.tomId) {
    throw new RequisicaoInvalida("Preencha convidado, tema, objetivo e tom antes de gerar.");
  }
  if (!config || !Array.isArray(config.blocos) || config.blocos.length === 0) {
    throw new RequisicaoInvalida("Config de blocos ausente ou vazia.");
  }
  if (!config.tons?.[dados.tomId]) {
    throw new RequisicaoInvalida(`Tom "${dados.tomId}" não existe na config.`);
  }
  if (modo !== "mock" && modo !== "ia") {
    throw new RequisicaoInvalida('Campo "modo" precisa ser "mock" ou "ia".');
  }

  return { dados, config, modo };
}

export async function POST(request: Request): Promise<Response> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Não foi possível ler a requisição." }, { status: 400 });
  }

  let requisicao: CorpoRequisicao;
  try {
    requisicao = validarCorpo(corpo);
  } catch (erro) {
    if (erro instanceof RequisicaoInvalida) {
      return Response.json({ erro: erro.message }, { status: 400 });
    }
    throw erro;
  }

  const { dados, config, modo } = requisicao;

  // Pedido explícito de mock (botão "Gerar com mock"): nunca chama a IA.
  if (modo === "mock") {
    return Response.json(gerarMock(config));
  }

  // Sem API key configurada: degrada pra mock automaticamente, app nunca quebra.
  if (!process.env.AI_API_KEY) {
    const guia = gerarMock(config);
    guia.aviso = "Sem API key configurada — exibindo exemplo mock.";
    return Response.json(guia);
  }

  // Modo "ia" com key presente: tenta de verdade; qualquer falha (fora do ar,
  // timeout, JSON malformado) degrada pra mock com aviso, sem stack trace pro usuário.
  try {
    const prompt = montarPrompt(dados, config);
    const textoBruto = await chamarIA(prompt);
    const guia: GuiaGerado = parseRespostaIA(textoBruto, config);
    return Response.json(guia);
  } catch (erro) {
    // Log server-side pra diagnóstico; usuário só vê o aviso genérico abaixo.
    console.error("Falha ao gerar guia com IA:", erro);
    const guia = gerarMock(config);
    guia.aviso = "Não deu pra gerar com a IA agora (fora do ar, timeout ou formato inesperado) — exibindo exemplo mock.";
    return Response.json(guia);
  }
}
