"use client";

import { useEffect, useState } from "react";
import { carregarConfig } from "@/lib/storage";
import { montarPrompt } from "@/lib/montar-prompt";
import { GuiaAoVivo } from "@/components/GuiaAoVivo";
import type { BlocosSeed, DadosGerador, GuiaGerado } from "@/types/guia";

const DADOS_INICIAIS: DadosGerador = {
  convidado: "",
  tema: "",
  objetivo: "",
  tomId: "",
  usarReferenciaConcorrente: false,
  referenciaConcorrente: "",
};

export default function PaginaGerador() {
  const [config, setConfig] = useState<BlocosSeed | null>(null);
  const [dados, setDados] = useState<DadosGerador>(DADOS_INICIAIS);
  const [mostrarPrompt, setMostrarPrompt] = useState(false);
  const [carregando, setCarregando] = useState<"mock" | "ia" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [guia, setGuia] = useState<GuiaGerado | null>(null);

  // Config só existe no browser (localStorage) — carrega depois do mount
  // pra não dar mismatch de SSR/hidratação. Roda uma vez só (não é cascata).
  useEffect(() => {
    const c = carregarConfig();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de localStorage no mount, não cascateia
    setConfig(c);
    setDados((d) => ({ ...d, tomId: Object.keys(c.tons)[0] ?? "" }));
  }, []);

  if (!config) {
    return <p className="p-6 text-neutral-500">Carregando…</p>;
  }

  const camposValidos = Boolean(
    dados.convidado.trim() && dados.tema.trim() && dados.objetivo.trim() && dados.tomId
  );

  async function gerar(modo: "mock" | "ia") {
    if (!camposValidos) {
      setErro("Preencha convidado, tema, objetivo e tom antes de gerar.");
      return;
    }
    setErro(null);
    setCarregando(modo);
    try {
      const resposta = await fetch("/api/gerar-guia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dados, config, modo }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Não foi possível gerar o guia.");
        return;
      }
      setGuia(corpo as GuiaGerado);
    } catch {
      setErro("Não foi possível falar com o servidor. Tenta de novo.");
    } finally {
      setCarregando(null);
    }
  }

  const promptTecnico = camposValidos ? montarPrompt(dados, config) : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Gerador de guia de entrevista</h1>
      <p className="mt-1 text-neutral-500">
        Preencha os campos abaixo. A IA monta um guia por blocos pra você consultar ao vivo na gravação.
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <Campo label="Convidado">
          <input
            className="campo"
            value={dados.convidado}
            onChange={(e) => setDados({ ...dados, convidado: e.target.value })}
            placeholder="Nome de quem vai ser entrevistado"
          />
        </Campo>

        <Campo label="Tema">
          <input
            className="campo"
            value={dados.tema}
            onChange={(e) => setDados({ ...dados, tema: e.target.value })}
            placeholder="Sobre o que é a conversa"
          />
        </Campo>

        <Campo label="Objetivo da entrevista">
          <textarea
            className="campo"
            rows={2}
            value={dados.objetivo}
            onChange={(e) => setDados({ ...dados, objetivo: e.target.value })}
            placeholder="O que essa entrevista precisa entregar pro ouvinte"
          />
        </Campo>

        <Campo label="Referência de tom">
          <select
            className="campo"
            value={dados.tomId}
            onChange={(e) => setDados({ ...dados, tomId: e.target.value })}
          >
            {Object.entries(config.tons).map(([id, tom]) => (
              <option key={id} value={id}>
                {tom.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dados.usarReferenciaConcorrente}
            onChange={(e) => setDados({ ...dados, usarReferenciaConcorrente: e.target.checked })}
          />
          Usar referência de concorrente
        </label>

        {dados.usarReferenciaConcorrente && (
          <Campo label="Cole aqui a referência (texto livre)">
            <textarea
              className="campo"
              rows={3}
              value={dados.referenciaConcorrente}
              onChange={(e) => setDados({ ...dados, referenciaConcorrente: e.target.value })}
              placeholder="Ex: trecho de um episódio que você gosta do estilo"
            />
          </Campo>
        )}
      </div>

      {erro && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => gerar("mock")}
          disabled={carregando !== null}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {carregando === "mock" ? "Gerando…" : "Gerar com mock"}
        </button>
        <button
          onClick={() => gerar("ia")}
          disabled={carregando !== null}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {carregando === "ia" ? "Gerando…" : "Gerar com API"}
        </button>
        <button
          onClick={() => setMostrarPrompt((v) => !v)}
          className="ml-auto text-sm font-medium text-neutral-500 hover:underline"
        >
          {mostrarPrompt ? "Ocultar prompt técnico" : "Ver prompt técnico"}
        </button>
      </div>

      {mostrarPrompt && (
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-950 p-4 text-xs text-neutral-100">
          {promptTecnico ?? "Preencha os campos pra montar o prompt."}
        </pre>
      )}

      {guia && <GuiaAoVivo guia={guia} config={config} aoFechar={() => setGuia(null)} />}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
