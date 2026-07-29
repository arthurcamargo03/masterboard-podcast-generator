# Gerador de Guia de Entrevista/Podcast — Masterboard

Ferramenta pra quem faz marketing gerar, em minutos, um guia de entrevista/podcast
organizado por blocos, pra consultar AO VIVO durante a gravação. Preenche 4 campos,
escolhe um tom, e a IA devolve perguntas com "puxadas" (follow-ups condicionais)
prontas pra usar — sem soar formulário.

Este projeto foi feito como desafio técnico de estágio. O enunciado deixa claro que
o que importa é a lógica de condução da entrevista, não a engenharia do app — por
isso o protótipo é propositalmente simples: sem banco de dados, sem login, sem
versionamento. Ver [Escopo e decisões](#escopo-e-decisões) no fim.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Chamada à IA numa Route Handler (`app/api/gerar-guia/route.ts`) — a API key só existe no servidor
- Persistência: `localStorage` do navegador (sem banco — o desafio não pede histórico)
- Deploy: Vercel

## Como rodar local

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000). Sem nenhuma configuração
extra, o app já funciona em **modo mock** (veja abaixo).

### Configurando a chave de IA

Copie `.env.example` pra `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```
AI_API_KEY=sua-chave-aqui
AI_MODEL=claude-sonnet-5
```

- **Sem `AI_API_KEY` configurada**: o app funciona 100% em modo mock, sempre. O botão
  "Gerar com API" degrada automaticamente e mostra um aviso — o app nunca quebra por
  falta de chave.
- **Com `AI_API_KEY` configurada**: o botão "Gerar com mock" continua disponível (útil
  pra testar layout sem gastar chamada de IA) e "Gerar com API" chama o modelo de
  verdade. Se a IA cair, der timeout ou devolver algo que não é um JSON válido, a
  resposta também degrada pra mock com um aviso — nunca aparece stack trace pra quem
  está usando.

## As 3 telas

1. **Gerador** (`/`) — Convidado, Tema, Objetivo da entrevista e Referência de tom (lida
   da config). Toggle opcional "usar referência de concorrente": é só um campo de texto
   livre — quem decide se e como usar é a pessoa que preenche, sem scraping automático.
   Botão "Ver prompt técnico" mostra o prompt exato que seria enviado à IA, pra
   transparência de como a saída é montada.
2. **Editor de blocos** (`/editor`) — o time de conteúdo edita a intenção, o guia de
   condução, as puxadas e os exemplos de cada bloco; adiciona, remove e reordena
   blocos; edita as regras globais e os tons disponíveis. Tudo grava no `localStorage`
   a cada mudança. Sem login, sem histórico de versões — editar aqui já vale pra
   próxima geração.
3. **Modal ao vivo** — a saída de verdade. Não é o prompt cru nem um texto corrido:
   cada bloco mostra a intenção no topo, as perguntas como cards grandes (fácil de
   bater o olho no meio da entrevista) e as puxadas recolhidas por padrão, como texto
   secundário.

## Como o time de conteúdo edita os blocos

`config/blocos-seed.json` é a fonte da verdade **só no primeiro load**. A partir daí o
app lê e escreve a cópia salva no `localStorage` — é esse mecanismo que faz uma edição
no `/editor` realmente valer pra próxima geração, sem precisar de banco de dados.
Quem quiser voltar ao ponto de partida tem o botão "Restaurar padrão" no editor.

## A lógica do tom natural (o coração da avaliação)

O diferencial deste projeto não é o app — é como as perguntas são pensadas pra soar
conversa e não formulário de RH. Essa lógica mora em dois lugares:

- `config/regras-de-conducao.ts`: as regras de condução, injetadas **verbatim** e
  **antes** de qualquer dado do usuário no prompt (ver `lib/montar-prompt.ts`).
- `config/blocos-seed.json`: a intenção de cada bloco (a função dele na conversa, não
  o tema) e os exemplos/puxadas que calibram o estilo.

Resumo das regras, pra quem for revisar sem abrir os arquivos:

**Fraseado.** Uma pergunta por vez, nunca composta — se tem duas ideias, a segunda
vira puxada. Teto de ~15 palavras. Sem preâmbulo educado ("se você se sentir à
vontade", "gostaria de saber") — vai direto no verbo. Nunca anuncia transição
("mudando de assunto"). Linguagem falada, não escrita: contração, fragmento, gíria
quando o tom permite. Aberta mas ancorada num concreto ("qual decisão te tirou o
sono?" em vez de "fala sobre liderança").

**Encadeamento — o coração de verdade.** Toda pergunta principal vem com puxadas
condicionais: "se responder genérico, puxa X; se abrir história, puxa Y". Puxar o
concreto é o follow-up padrão ("me dá um exemplo", "quando foi isso?", "e depois?").
Espelhar a última fala do convidado como ponte antes de avançar. Silêncio também é
ferramenta — às vezes o guia sugere não preencher o silêncio.

**Intenção de cada bloco é função na conversa, não tema.** Abertura baixa a guarda com
uma pergunta fácil sobre a pessoa, não sobre a tese. Aprofundar tira história e
exemplo, nunca opinião solta. Contraponto traz a objeção do público como tensão
produtiva, sem hostilidade. Fechamento busca síntese, legado e um gancho suave.

**Tom muda só o registro.** A referência de tom (descontraído, executivo, etc.) troca
como as falas soam — nunca troca os blocos nem as intenções de cada um. Isso está
explícito no prompt (regra D) exatamente pra evitar que o modelo "invente" uma
estrutura nova por causa do tom escolhido.

**Trava anti-robô.** Antes de soltar cada pergunta, a IA é instruída a rejeitar e
reescrever se ela: passa de ~15 palavras, tem preâmbulo educado, junta duas perguntas,
anuncia transição, ou poderia ser lida por uma URA de call center. Essa é a checagem
que separa "soa conversa" de "soa formulário".

Na prática, isso vira uma restrição estrutural no prompt (ver `montarPrompt` em
`lib/montar-prompt.ts`): regras primeiro, imutáveis; depois o esqueleto de blocos
(vindo da config editável); só depois os dados livres da entrevista. Assim um input
mal escrito no campo "tema" não consegue "pisar" nas regras de condução.

## Pipeline (visão técnica)

```
4 inputs + tom escolhido + config (regras + blocos)
  → montarPrompt() injeta REGRAS_DE_CONDUCAO verbatim + intenção de cada bloco
  → route handler chama a IA (ou cai em mock)
  → parseRespostaIA() valida o JSON contra os ids da config
  → modal ao vivo renderiza por bloco
```

Contrato de saída da IA (mesmos `id`/`titulo` da config, a IA só preenche `perguntas`):

```json
{
  "blocos": [
    {
      "id": "abertura",
      "titulo": "Abertura",
      "perguntas": [{ "pergunta": "...", "puxadas": ["..."] }]
    }
  ]
}
```

## Tratamento de erro

Sem stack trace pra quem usa, em nenhum caso: campo vazio, IA fora do ar, timeout
(20s), JSON malformado ou API key ausente — todos caem numa mensagem clara ou no
modo mock com aviso.

## Escopo e decisões

- **Sem banco de dados.** O desafio não pede histórico; `localStorage` é suficiente
  pra provar que a config é editável e persiste entre sessões no mesmo navegador.
- **Sem login/versionamento no editor.** Simplicidade pedida no enunciado — qualquer
  edição já vale pra próxima geração, sem necessidade de controle de quem mudou o quê.
- **Toggle de referência de concorrente é só texto livre.** Sem scraping automático:
  a pessoa que decide o que colar ali é a usuária, como o enunciado pede.
