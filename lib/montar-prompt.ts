import { REGRAS_DE_CONDUCAO } from "@/config/regras-de-conducao";
import type { BlocosSeed, DadosGerador } from "@/types/guia";

// Monta o prompt final enviado à IA.
//
// DECISÃO: as REGRAS_DE_CONDUCAO entram verbatim e ANTES de qualquer dado do
// usuário. Convidado/tema/objetivo são texto livre digitado por quem faz
// marketing — se as regras viessem depois, um input malicioso ou só mal
// escrito poderia "pisar" nas instruções. Regras primeiro = elas mandam.
//
// DECISÃO: o "tom" nunca aparece como bloco ou tema novo — ele só troca o
// registro (formal/informal) das falas. Isso é a regra D das regras de
// condução, e por isso o prompt separa claramente "o que muda" (registro)
// de "o que não muda" (intenção de cada bloco, ordem, número de blocos).
//
// DECISÃO: o esqueleto de blocos (id, intenção, guia, puxadas, exemplos)
// vem da config editável (localStorage), não do seed fixo. É o que garante
// que editar o bloco no editor realmente muda a próxima geração.
export function montarPrompt(dados: DadosGerador, config: BlocosSeed): string {
  const tom = config.tons[dados.tomId];
  if (!tom) {
    throw new Error(`Tom "${dados.tomId}" não existe na config.`);
  }

  const blocosOrdenados = [...config.blocos].sort((a, b) => a.ordem - b.ordem);

  const blocosDescritos = blocosOrdenados
    .map((bloco) => {
      const puxadas = bloco.puxadas.map((p) => `    - ${p}`).join("\n");
      const exemplos = bloco.exemplos_semente.map((e) => `    - ${e}`).join("\n");
      return [
        `- id: "${bloco.id}" | título: "${bloco.titulo}"`,
        `  intenção (função na conversa, não tema): ${bloco.intencao}`,
        `  guia de condução: ${bloco.guia_de_conducao}`,
        `  puxadas típicas deste bloco:`,
        puxadas,
        `  exemplos de estilo (não copiar literal, só calibrar tom/tamanho):`,
        exemplos,
      ].join("\n");
    })
    .join("\n\n");

  const regrasGlobais = config.regras_globais.map((r) => `- ${r}`).join("\n");

  const referenciaConcorrente =
    dados.usarReferenciaConcorrente && dados.referenciaConcorrente?.trim()
      ? `\nREFERÊNCIA DE CONCORRENTE (usar só como inspiração de estilo, se fizer sentido):\n${dados.referenciaConcorrente.trim()}\n`
      : "";

  return `Você monta roteiros de entrevista/podcast para uma pessoa de marketing consultar AO VIVO durante a gravação.

${REGRAS_DE_CONDUCAO}

REGRAS GLOBAIS ADICIONAIS DESTA CONFIG:
${regrasGlobais}

TOM ESCOLHIDO: ${tom.rotulo}
REGISTRO (isso muda a FALA, nunca os blocos nem as intenções abaixo): ${tom.registro}

DADOS DA ENTREVISTA:
- Convidado: ${dados.convidado}
- Tema: ${dados.tema}
- Objetivo da entrevista: ${dados.objetivo}
${referenciaConcorrente}
ESTRUTURA DE BLOCOS (respeite id, ordem e intenção de cada um; não invente bloco novo, não remova bloco):

${blocosDescritos}

TAREFA:
Para cada bloco acima, gere de 2 a 3 perguntas principais. Cada pergunta vem com 2 a 3 puxadas
condicionais (no estilo "se responder X, puxa Y"), seguindo a regra B (encadeamento) e a
trava anti-robô (regra E) das REGRAS DE CONDUÇÃO.

FORMATO DE SAÍDA — responda SOMENTE com JSON válido, sem texto antes ou depois, sem markdown,
usando exatamente os mesmos "id" e "titulo" de cada bloco listados acima, neste formato:

{
  "blocos": [
    {
      "id": "abertura",
      "titulo": "Abertura",
      "perguntas": [
        { "pergunta": "...", "puxadas": ["...", "..."] }
      ]
    }
  ]
}`;
}
