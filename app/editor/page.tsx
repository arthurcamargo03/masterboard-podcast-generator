"use client";

import { useEffect, useState } from "react";
import { carregarConfig, restaurarConfigPadrao, salvarConfig } from "@/lib/storage";
import type { BlocoConfig, BlocosSeed } from "@/types/guia";

function slugificar(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `bloco-${Date.now()}`
  );
}

function linhas(texto: string): string[] {
  return texto.split("\n").filter((l) => l.trim().length > 0);
}

// Editor de blocos: cada mudança grava direto no localStorage (sem botão
// "salvar", sem versionamento — o desafio não pede histórico). É o
// mecanismo que prova que as perguntas são "realmente editáveis": qualquer
// alteração aqui muda o esqueleto usado na próxima chamada de montarPrompt.
export default function PaginaEditor() {
  const [config, setConfig] = useState<BlocosSeed | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de localStorage no mount, não cascateia
    setConfig(carregarConfig());
  }, []);

  if (!config) {
    return <p className="p-6 text-neutral-500">Carregando…</p>;
  }

  function atualizar(novo: BlocosSeed) {
    setConfig(novo);
    salvarConfig(novo);
  }

  function restaurar() {
    atualizar(restaurarConfigPadrao());
  }

  function atualizarBloco(id: string, patch: Partial<BlocoConfig>) {
    atualizar({
      ...config!,
      blocos: config!.blocos.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  function moverBloco(id: string, direcao: -1 | 1) {
    const ordenados = [...config!.blocos].sort((a, b) => a.ordem - b.ordem);
    const i = ordenados.findIndex((b) => b.id === id);
    const j = i + direcao;
    if (j < 0 || j >= ordenados.length) return;
    const ordemAtual = ordenados[i].ordem;
    ordenados[i].ordem = ordenados[j].ordem;
    ordenados[j].ordem = ordemAtual;
    atualizar({ ...config!, blocos: ordenados });
  }

  function removerBloco(id: string) {
    atualizar({ ...config!, blocos: config!.blocos.filter((b) => b.id !== id) });
  }

  function adicionarBloco() {
    const titulo = "Novo bloco";
    const maiorOrdem = Math.max(0, ...config!.blocos.map((b) => b.ordem));
    const novoBloco: BlocoConfig = {
      id: slugificar(titulo) + "-" + Date.now(),
      titulo,
      ordem: maiorOrdem + 1,
      intencao: "",
      guia_de_conducao: "",
      puxadas: [],
      exemplos_semente: [],
    };
    atualizar({ ...config!, blocos: [...config!.blocos, novoBloco] });
  }

  const blocosOrdenados = [...config.blocos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editor de blocos</h1>
        <button onClick={restaurar} className="text-sm text-neutral-500 hover:underline">
          Restaurar padrão
        </button>
      </div>
      <p className="mt-1 text-neutral-500">
        Muda aqui e a próxima geração já usa a versão nova. Guardado no seu navegador (localStorage).
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Regras globais</h2>
        <p className="text-sm text-neutral-500">Uma regra por linha.</p>
        <textarea
          className="campo mt-2 w-full"
          rows={4}
          value={config.regras_globais.join("\n")}
          onChange={(e) => atualizar({ ...config, regras_globais: linhas(e.target.value) })}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Tons</h2>
        <div className="mt-2 flex flex-col gap-4">
          {Object.entries(config.tons).map(([id, tom]) => (
            <div key={id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">{id}</span>
                <button
                  onClick={() => {
                    const tons = { ...config.tons };
                    delete tons[id];
                    atualizar({ ...config, tons });
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover
                </button>
              </div>
              <input
                className="campo mt-2 w-full"
                value={tom.rotulo}
                onChange={(e) =>
                  atualizar({ ...config, tons: { ...config.tons, [id]: { ...tom, rotulo: e.target.value } } })
                }
                placeholder="Rótulo (aparece no seletor)"
              />
              <textarea
                className="campo mt-2 w-full"
                rows={2}
                value={tom.registro}
                onChange={(e) =>
                  atualizar({ ...config, tons: { ...config.tons, [id]: { ...tom, registro: e.target.value } } })
                }
                placeholder="Registro: como isso muda a fala"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const id = `tom-${Date.now()}`;
            atualizar({ ...config, tons: { ...config.tons, [id]: { rotulo: "Novo tom", registro: "" } } });
          }}
          className="mt-3 text-sm font-medium text-neutral-500 hover:underline"
        >
          + Adicionar tom
        </button>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Blocos</h2>
        <div className="mt-2 flex flex-col gap-4">
          {blocosOrdenados.map((bloco, i) => (
            <div key={bloco.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">
                  id: {bloco.id} · ordem: {bloco.ordem}
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    disabled={i === 0}
                    onClick={() => moverBloco(bloco.id, -1)}
                    className="disabled:opacity-30 hover:underline"
                  >
                    ▲ subir
                  </button>
                  <button
                    disabled={i === blocosOrdenados.length - 1}
                    onClick={() => moverBloco(bloco.id, 1)}
                    className="disabled:opacity-30 hover:underline"
                  >
                    ▼ descer
                  </button>
                  <button onClick={() => removerBloco(bloco.id)} className="text-red-500 hover:underline">
                    remover
                  </button>
                </div>
              </div>

              <input
                className="campo mt-2 w-full font-semibold"
                value={bloco.titulo}
                onChange={(e) => atualizarBloco(bloco.id, { titulo: e.target.value })}
                placeholder="Título do bloco"
              />

              <label className="mt-3 block text-xs font-medium text-neutral-500">
                Intenção (função na conversa, não tema)
              </label>
              <textarea
                className="campo mt-1 w-full"
                rows={2}
                value={bloco.intencao}
                onChange={(e) => atualizarBloco(bloco.id, { intencao: e.target.value })}
              />

              <label className="mt-3 block text-xs font-medium text-neutral-500">Guia de condução</label>
              <textarea
                className="campo mt-1 w-full"
                rows={2}
                value={bloco.guia_de_conducao}
                onChange={(e) => atualizarBloco(bloco.id, { guia_de_conducao: e.target.value })}
              />

              <label className="mt-3 block text-xs font-medium text-neutral-500">
                Puxadas condicionais (uma por linha)
              </label>
              <textarea
                className="campo mt-1 w-full"
                rows={3}
                value={bloco.puxadas.join("\n")}
                onChange={(e) => atualizarBloco(bloco.id, { puxadas: linhas(e.target.value) })}
              />

              <label className="mt-3 block text-xs font-medium text-neutral-500">
                Exemplos semente (uma por linha)
              </label>
              <textarea
                className="campo mt-1 w-full"
                rows={2}
                value={bloco.exemplos_semente.join("\n")}
                onChange={(e) => atualizarBloco(bloco.id, { exemplos_semente: linhas(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <button onClick={adicionarBloco} className="mt-3 text-sm font-medium text-neutral-500 hover:underline">
          + Adicionar bloco
        </button>
      </section>
    </div>
  );
}
