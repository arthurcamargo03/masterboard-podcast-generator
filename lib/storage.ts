import seed from "@/config/blocos-seed.json";
import type { BlocosSeed } from "@/types/guia";

const CHAVE = "masterboard:config";

// DECISÃO: blocos-seed.json é a fonte da verdade só no PRIMEIRO load. A
// partir daí o app lê/escreve a cópia no localStorage — é o que faz uma
// edição no editor de blocos valer pras próximas gerações, sem banco.
export function carregarConfig(): BlocosSeed {
  const bruto = localStorage.getItem(CHAVE);
  if (!bruto) {
    localStorage.setItem(CHAVE, JSON.stringify(seed));
    return seed as BlocosSeed;
  }
  try {
    return JSON.parse(bruto) as BlocosSeed;
  } catch {
    // localStorage corrompido: reseta pro seed em vez de quebrar o app.
    localStorage.setItem(CHAVE, JSON.stringify(seed));
    return seed as BlocosSeed;
  }
}

export function salvarConfig(config: BlocosSeed): void {
  localStorage.setItem(CHAVE, JSON.stringify(config));
}

export function restaurarConfigPadrao(): BlocosSeed {
  localStorage.setItem(CHAVE, JSON.stringify(seed));
  return seed as BlocosSeed;
}
