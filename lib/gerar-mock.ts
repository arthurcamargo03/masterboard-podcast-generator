import type { BlocosSeed, GuiaGerado } from "@/types/guia";

// Gera o guia mock A PARTIR da própria config (exemplos_semente + puxadas de
// cada bloco), em vez de um texto hardcoded à parte.
//
// DECISÃO: se o mock fosse um JSON estático separado, editar um bloco no
// editor não mudaria nada visível sem gastar uma chamada de IA — ruim pra
// demonstrar que "a config é a fonte da verdade". Derivando do config, o
// mock também serve de prova ao vivo de que editar exemplo/puxada
// realmente propaga pro guia gerado.
export function gerarMock(config: BlocosSeed): GuiaGerado {
  const blocosOrdenados = [...config.blocos].sort((a, b) => a.ordem - b.ordem);

  return {
    fonte: "mock",
    blocos: blocosOrdenados.map((bloco) => ({
      id: bloco.id,
      titulo: bloco.titulo,
      perguntas: [
        {
          pergunta: bloco.exemplos_semente[0] ?? bloco.intencao,
          puxadas: bloco.puxadas.length > 0 ? bloco.puxadas : ["Puxa um exemplo concreto."],
        },
      ],
    })),
  };
}
