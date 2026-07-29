"use client";

import { useState } from "react";
import type { BlocosSeed, GuiaGerado } from "@/types/guia";

interface Props {
  guia: GuiaGerado;
  config: BlocosSeed;
  aoFechar: () => void;
}

// A tela que a pessoa de marketing realmente olha DURANTE a gravação.
// DECISÃO: não é o prompt cru nem texto corrido — cada bloco mostra a
// intenção no topo (o "porquê" daquele bloco na conversa) e as perguntas
// como cards grandes; puxadas ficam recolhidas por padrão (texto
// secundário) pra não competir visualmente com a pergunta principal
// enquanto ela bate o olho rápido no meio da entrevista.
export function GuiaAoVivo({ guia, config, aoFechar }: Props) {
  const blocosOrdenados = [...config.blocos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-2 sm:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <div>
            <h2 className="text-lg font-semibold">Guia ao vivo</h2>
            {guia.aviso && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{guia.aviso}</p>
            )}
          </div>
          <button
            onClick={aoFechar}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Fechar ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {blocosOrdenados.map((blocoConfig) => {
            const blocoGerado = guia.blocos.find((b) => b.id === blocoConfig.id);
            if (!blocoGerado) return null;
            return (
              <BlocoAoVivo key={blocoConfig.id} titulo={blocoConfig.titulo} intencao={blocoConfig.intencao} perguntas={blocoGerado.perguntas} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlocoAoVivo({
  titulo,
  intencao,
  perguntas,
}: {
  titulo: string;
  intencao: string;
  perguntas: GuiaGerado["blocos"][number]["perguntas"];
}) {
  return (
    <section className="mb-8 last:mb-2">
      <header className="mb-3">
        <h3 className="text-xl font-bold">{titulo}</h3>
        <p className="text-sm italic text-neutral-500 dark:text-neutral-400">{intencao}</p>
      </header>

      <div className="flex flex-col gap-3">
        {perguntas.map((p, i) => (
          <CardPergunta key={i} pergunta={p.pergunta} puxadas={p.puxadas} />
        ))}
      </div>
    </section>
  );
}

function CardPergunta({ pergunta, puxadas }: { pergunta: string; puxadas: string[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <p className="text-lg font-medium leading-snug">{pergunta}</p>

      {puxadas.length > 0 && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            {aberto ? "Ocultar puxadas ▲" : `Puxadas (${puxadas.length}) ▼`}
          </button>
          {aberto && (
            <ul className="mt-2 space-y-1 border-t border-neutral-200 pt-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              {puxadas.map((p, i) => (
                <li key={i}>— {p}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
