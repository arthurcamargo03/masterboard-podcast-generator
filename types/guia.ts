// Tipos do "esqueleto" (config editável) e do "preenchido" (saída da IA).
// Separados de propósito: o esqueleto vem do localStorage, o preenchido vem do modelo.
// O contrato entre os dois é o campo `id` do bloco — é o que permite o frontend
// casar a intenção/puxadas (config) com as perguntas geradas (IA) sem depender de ordem ou texto.

export interface TomConfig {
  rotulo: string;
  registro: string;
}

export interface BlocoConfig {
  id: string;
  titulo: string;
  ordem: number;
  intencao: string;
  guia_de_conducao: string;
  puxadas: string[];
  exemplos_semente: string[];
}

export interface BlocosSeed {
  regras_globais: string[];
  tons: Record<string, TomConfig>;
  blocos: BlocoConfig[];
}

// --- Saída da IA (ou do mock) ---

export interface PerguntaGerada {
  pergunta: string;
  puxadas: string[];
}

export interface BlocoGerado {
  id: string;
  titulo: string;
  perguntas: PerguntaGerada[];
}

export interface GuiaGerado {
  blocos: BlocoGerado[];
  // De onde veio esse guia — a UI usa isso pra avisar quando caiu em mock
  // (sem key, erro, timeout, JSON malformado) mesmo tendo pedido "ia".
  fonte: "mock" | "ia";
  aviso?: string;
}

// --- Input do formulário gerador ---

export interface DadosGerador {
  convidado: string;
  tema: string;
  objetivo: string;
  tomId: string;
  usarReferenciaConcorrente: boolean;
  referenciaConcorrente?: string;
}
