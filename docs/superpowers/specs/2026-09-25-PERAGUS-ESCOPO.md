# PERAGUS — ESCOPO DE EXECUÇÃO

**Para:** programador(s) que vai(ão) implementar
**Origem:** Colosseum Solana Hackathon — World's Fair (deadline **2026-10-12**)
**Prazo:** 17 dias, 2 programadores com apoio de IA
**Documento de referência completo (não é preciso ler para começar, mas existe):** `docs/superpowers/specs/2026-09-25-peragus-colosseum-solana-hackathon-design.md` — 45 seções, 2.598 linhas

> **Como usar este documento.** Ele é o escopo executável. Toda decisão de produto e de arquitetura já está tomada e registrada aqui — **não reabra essas decisões**. Se algo não estiver especificado neste documento, verifique a spec completa antes de inventar. Se ainda assim não estiver lá, perguntar em vez de assumir.
>
> **Este documento não contém código de implementação.** Ele contém contratos, invariantes e critérios de aceite. O código é o trabalho do programador.

---

## 1. O que está sendo construído

Um **motor de liquidação tokenizada cross-border** na Solana, para adquirentes que recebem PIX em BRL no Brasil e precisam pagar em guaraní (PYG) no Paraguai.

O consumidor paga PIX off-chain numa maquininha no Paraguai. O adquirente registra a venda na API. O sistema tokeniza o BRL lastreado, e depois liquida as duas pernas da conversão em **uma única transação atômica** na Solana. O acquirer recebe `pyPYG` e decide quando converter para PYG real.

**O produto não emite moeda.** É infraestrutura para uma instituição autorizada. Isso é deliberado e é uma decisão de estrutura de risco — ver §11.

### 1.1 A propriedade que o projeto vende

> Uma transação, duas pernas. Se a segunda falha, a primeira é revertida. **Nenhum valor de liquidação fica em mãos de nenhuma das partes em momento algum.**

Toda a arquitetura existe para tornar essa frase demonstrável ao vivo. Se a implementação enfraquecer essa propriedade, o projeto falhou — mesmo que todos os testes passem.

### 1.2 Por que blockchain é genuinely necessário aqui

Não é "um token sobre um sistema tradicional". A propriedade depende de **atomicidade entre duas transferência de tokens pertencentes a mint authorities diferentes, com um intermediário que só o programa pode movimentar**. Isso não é reproduzível com um banco de dados transacional, porque o "vault intermediário" precisa ser um token account cujo signer é uma PDA do programa, e a queima da perna 1 precisa ser irreversível no mesmo contexto atômico da emissão da perna 2.

A prova é o rollback: injete falta de liquidez na segunda perna e a primeira reverte. Se isso pudesse ser feito off-chain com um lock pessimista, a blockchain seria enfeite.

---

## 2. Verdade do terreno — leia antes de escrever qualquer linha

Classificação obrigatória de **todo** componente. Nada de misturar. Nada de esconder.

| Classificação | Significado |
|---|---|
| **REAL** | Executado de verdade, em devnet, com código próprio |
| **MOCK** | Simulado, com interface real, **rotulado na UI** |
| **INTEGRAÇÃO** | Depende de terceiro; interface especificada, pode não estar construída |
| **FUTURO** | Fora do escopo do hackathon, registrado como evolução |

### 2.1 Mapa

| Componente | Classe | Nota |
|---|---|---|
| Programa `peragus_settlement` (Rust/Anchor) | **REAL** | 8 instruções |
| Mints `pgBRL`, `pyPYG`, `tsUSD` (Token-2022) | **REAL** | |
| Verificação de assinatura ed25519 on-chain | **REAL** | |
| Emissão e queima tokenizada | **REAL** | |
| Settlement atômico de duas pernas | **REAL** | |
| `transfer_hook` de compliance | **REAL** | |
| Backend (API, estado, idempotência) | **REAL** | |
| Assinatura de atestações off-chain | **REAL** | |
| Máquina de estados | **REAL** | |
| Settlement coordinator at-most-once | **REAL** | Portar padrão existente |
| Dashboard, timeline, explorer | **REAL** | |
| Painel de reserva | **REAL** | |
| **Cobrança PIX** | **MOCK** | BR Code gerado, webhook HMAC |
| **Off-ramp PYG** | **MOCK** | Conversão e payout simulados, latência artificial de 3s |
| **Reserva de fiat** | **MOCK** | Não há dinheiro real em lugar nenhum |
| **Rate oracle** | **MOCK** | Cotação vem de fonte simulada, é assinada de verdade |
| Integração OZAV (PIX) | **INTEGRAÇÃO** | Especificada, não construída |
| Integração dLocal (payout PYG) | **INTEGRAÇÃO** | API real e documentada; onboarding comercial pendente |
| Mainnet, Squads, PLD/AML, KYC completo | **FUTURO** | |
| Flashloan, netting multilateral | **FUTURO** | Ver §12.2 — decidido, não esquecido |

### 2.2 Regra de honestidade

Se um valor é MOCK, a interface que o entrega diz isso. Não no código — na **tela**. Um painel que mostra "R$ 10.000,00 lastreados" sem marca de simulado é uma mentira, e um júri técnico vai perceber.

---

## 3. Decisões fechadas — não reabra, não "melhore"

Estas 30 decisões estão registradas na spec §45. As que mais costumam ser questionadas por um programador:

| # | Decisão | Motivo (curto) |
|---|---|---|
| D-01 | **Um único programa Anchor**, 8 instruções | Escopo. Oito é o número que cabe em 17 dias |
| D-02 | **Sem preço on-chain.** Cotação vai por atestação assinada | Feed on-chain é complexidade sem retorno aqui |
| D-03 | **Não reimplementar ledger de saldos.** O SPL já é o ledger | Reimplementar é bug esperando |
| D-04 | **`request_id` é a chave de idempotência** | O banco é a fronteira da API; a chain é a fronteira do valor |
| D-05 | **`pgBRL` e `pyPYG` em Token-2022 com Transfer Hook** | SPL Token simples **contorna o programa** — compliance impossível |
| D-06 | **Permanent Delegate só no `revoke`** | No `settle`, a queima é feita com assinatura do pagador |
| D-07 | **Vault é PDA.** Só o programa move fundos | |
| D-08 | **Admin ≠ attester.** São chaves diferentes | Separação de deveres |
| D-09 | **Acquirente assina `settle`.** O consumidor não tem wallet | O consumidor paga PIX off-chain |
| D-10 | **6 decimais em todos os tokens, uniforme** | |
| D-11 | **Campos monetaryos sufixados `*Atomic`**, nunca `*Minor` | 6 decimais ≠ centavos. O nome errado causa bug |
| D-12 | **`rate_q9: i128`** = taxa × 10⁹ | Nunca `f64` em lugar nenhum |
| D-13 | **`token_program: Pubkey` por ativo, lido em todo CPI** | Ver §4.3 — é a decisão que mais vai te poupar de dor |
| D-14 | **Devnet apenas.** Nenhum caminho de mainnet no repo | |
| D-15 | **Sem flashloan** | Atomicidade já resolve; decisão registrada, não esquecida |
| D-16 | **Sem netting multilateral** | Complexidade sem ganho no MVP |
| D-32 | **A perna stablecoin roda no canal da Res. BCB 521** | Ver §11 |
| D-33 | **Parceiro de produção = VASP licenciado** | Hipótese adotada, **não validada juridicamente** |
| D-34 | **Grafo de parceiros adiado para depois da demo** | Falta informação que ainda não existe |

---

## 4. Contratos que não podem ser redesenhados

Esta é a parte mais importante do documento para quem implementa. Estes são os limites entre componentes. Alterar qualquer um deles é decisão de produto, não de implementação.

### 4.1 Contas do programa

| Conta | Seeds | Campos |
|---|---|---|
| `Corridor` | `[b"corridor", code]` | `admin`, `attester`, `rate_cap_bps: u16`, `fee_bps: u16`, `paused: bool`, `version: u8`, `bump` |
| `SettlementAsset` | `[b"asset", corridor, iso]` | `mint`, `token_program`, `vault`, `decimals: u8`, `enabled: bool`, `is_fiat: bool`, `max_supply: u64`, `bump` |
| `Settlement` | `[b"settlement", operation_id]` | `operation_id: [u8;16]`, `payer`, `recipient`, `asset_in`, `amount_in: u64`, `asset_out`, `amount_out: u64`, `rate_q9: i128`, `spread_bps: u16`, `fee: u64`, `attestation_hash: [u8;32]`, `status: u8`, `created_at: i64`, `bump` |
| `Attestation` | `[b"attestation", hash]` | `kind: u8`, `payload_hash: [u8;32]`, `signer`, `consumed_at: i64`, `bump` |
| `WalletRegistry` | `[b"wallet", owner]` | `status: u8`, `role: u8`, `kyc_ref: [u8;32]`, `registered_at: i64`, `bump` |

Regras estruturais:

- `Corridor` é keyed por `code` desde o MVP → multi-corredor vira **configuração**, não código novo.
- `Settlement` é **imutável** após criação. A única mutação possível é marcar `Revoked`.
- O `Attestation` PDA **existe para ser o guarda anti-replay**. Criado com `init`: se já existir, reverte. É replay-impossível por construção, não por checagem.

### 4.2 Enumerações

**WalletStatus:** `NONE=0`, `ALLOWED=1` (pode transacionar), `BLOCKED=2` (rejeitado), `REVOKED=3` (revogado; saldo elegível a burn)

**WalletRole:** `NONE=0`, `PERAGUS=1`, `ACQUIRER=2`, `TREASURY=3`

**SettlementStatus:** `ACTIVE=0`, `REVOKED=1`

**AttestationKind:** `ATTEST_MINT=0`, `ATTEST_RATE=1`, `ATTEST_WALLET=2`

### 4.3 `token_program` por ativo — a armadilha principal

O rail tem ativos em **dois token programs**:

| Ativo | Token program | ID |
|---|---|---|
| `pgBRL`, `pyPYG`, `tsUSD` (devnet) | Token-2022 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| `USDT` (produção) | SPL Token **legado** | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |

O `SettlementAsset.token_program` é gravado no registro e **todo CPI de token lê o programa a partir dele**. Nunca hardcode.

**Por que isso importa:** em devnet **não existe USDT nem USDC canônico**. O pivô de settlement em devnet é o `tsUSD`, um token de teste criado pelo próprio time, com metadados que declaram explicitamente que **não** é USDT e **não** tem redemption. O USDT real da mainnet é SPL legado — e portanto **não tem** TransferFeeConfig, TransferHook, PermanentDelegate nem DefaultAccountState.

> **Consequência prática, e a razão de D-13:** um validador de mint "tem que ser Token-2022" parece correto e **rejeitaria o USDT de produção**. `register_settlement_asset` valida que o owner do mint é um token program **registrado** (Token-2022 ou SPL legado) — nunca qualquer outro programa, mas também nunca apenas Token-2022.

### 4.4 Ativos

| Ativo | ISO | Papel | Devnet |
|---|---|---|---|
| `pgBRL` | BRL | Fiat tokenizado de entrada | Emitido pelo time |
| `pyPYG` | PYG | Fiat tokenizado de saída | Emitido pelo time |
| `tsUSD` | USD | **Pivô de settlement** | Emitido pelo time (teste) |
| `USDT` | USD | Pivô de settlement em produção | **FUTURO** — não existe em devnet |

Todos com **6 decimais**, uniforme.

### 4.5 Extensões Token-2022 (só nos mints próprios)

| Extensão | Onde | Por quê |
|---|---|---|
| **Transfer Hook** | `pgBRL`, `pyPYG` | Compliance em 100% das transferências. Sem isso, SPL Token simples contorna o programa |
| Metadata Pointer + Token Metadata | todos | Lastro e avisos on-chain |
| Permanent Delegate | `pgBRL`, `pyPYG` | Usado **só** no `revoke` |
| Default Account State | — | **Rejeitada** |
| Transfer Fee | — | **Rejeitada** |
| Confidential Transfer | — | **Rejeitada** |
| Non-Transferable | — | **Rejeitada** |

`tsUSD` não precisa de Transfer Hook nem Permanent Delegate — é o pivô intermediário, não um ativo de<float user-facing.

### 4.6 Conteúdo obrigatório dos metadados on-chain

Os metadados **declaram a ausência de lastro**. Não é opcional:

- `pgBRL` e `pyPYG`: `fullyBacked: false` e o texto **"NOT BACKED BY ANY REAL FIAT. DEVNET TEST TOKEN. NO REDEMPTION."**
- `tsUSD`: além disso, `testStablecoin: true` e **"NOT USDT. NO REDEMPTION."**

### 4.7 As 8 instruções

| # | Instrução | Autoridade | Contrato |
|---|---|---|---|
| I-1 | `initialize_corridor(code, attester, rate_cap_bps, fee_bps)` | Deployer | Cria `Corridor`. Idempotente por PDA — segunda chamada reverte |
| I-2 | `register_settlement_asset(iso_code, mint, vault, decimals, is_fiat, max_supply)` | `Corridor.admin` | Valida owner do mint ∈ {Token-2022, SPL legado}; `vault` é token account do mesmo mint **e mesmo token program**; `decimals` bate. Grava `token_program` |
| I-3 | `mint_from_attestation(destination, amount, payload, signature)` | **Nenhuma** (permissionless, inútil sem atestação) | Ver §4.8 |
| I-4 | `settle(operation_id, payer, recipient, asset_in, amount_in, asset_out, min_out, rate_payload, rate_signature)` | `payer` externo **ou** PDA via `invoke_signed` | Ver §4.9 — a mais importante |
| I-5 | `transfer_hook` | Invocado pelo Token-2022 | Ver §4.10 |
| I-6 | `revoke(operation_id, reason_hash, signature)` | Atestação do `attester` | Usa **permanent delegate**. Marca `Settlement.status = REVOKED` |
| I-7 | `set_wallet_status(owner, status, role, kyc_ref, signature)` | Atestação do `attester` | **Única forma** de adicionar participante ao rail |
| I-8 | `pause` / `unpause` | `Corridor.admin` | Bloqueia `settle` e transferências. Inclusive de emergência |

### 4.8 `mint_from_attestation` — ordem de validação

1. Verifica assinatura ed25519 do `payload` contra `Corridor.attester`, com rehash e verificação de claim
2. Valida `claim.expiry > clock()`, `claim.amount > 0`, `claim.amount <= max_supply - mint.supply`
3. Valida `kind == MINT`, `claim.mint == asset.mint`, `claim.destination == destination`
4. **Cria** o `Attestation` PDA com `init` → se já existir, reverte
5. CPI `Token-2022::mint_to` com a PDA de mint authority, via `invoke_signed`
6. Consome o nonce gravando `consumed_at`

### 4.9 `settle` — as duas pernas e a armadilha da authority

**Esta é a parte que mais vai custar tempo se não for lida antes de codar.**

Uma transação, **duas** instruções `settle`:

```
TX (uma única assinatura: wallet corporativa do adquirente)
│
├─ SettleInstruction #1
│   operation_id = uuid1   (BRL → stable)
│   payer      = adquirente        ← signer EXTERNO
│   recipient  = vault tsUSD
│   asset_in   = pgBRL,  amount_in = R$ 10.000,00
│   asset_out  = tsUSD,  min_out = calculado
│   burn authority = assinatura do adquirente
│
└─ SettleInstruction #2
    operation_id = uuid2   (stable → PYG)
    payer      = vault tsUSD        ← PDA do programa, invoke_signed
    recipient  = adquirente
    asset_in   = tsUSD,   amount_in = saída de #1
    asset_out  = pyPYG,  min_out = calculado
    burn authority = invoke_signed da PDA

→ 2 Settlement PDAs, tudo atômico
```

> **A assimetria que causa bug:** a perna 1 exige assinatura externa do adquirente. A perna 2 é executada pelo próprio programa via `invoke_signed`. **Uma única assinatura cobre as duas** porque estão na mesma transação. Implementar `settle` com um único caminho de authority é bug garantido — os dois caminhos precisam ser explícitos e cada um com seu teste. (spec §21.2 e §10.4 I-4.)

**Ordem de execução dentro de `settle` — a ordem importa:**

1. Deriva e valida `Settlement` PDA com `init` → **segundo settle do mesmo `operation_id` reverte**
2. `Corridor.paused == false`; ambos os ativos `enabled`
3. Verifica atestação de cotação (mesmo mecanismo de I-3): assinatura, `kind == RATE`, não consumida
4. `rate_payload.expiry > clock()`; `spread_bps <= Corridor.rate_cap_bps`
5. `payer` e `recipient` estão `STATUS_ALLOWED` no `WalletRegistry`
6. `asset_out.vault` tem saldo ≥ `amount_out` calculado
7. **QUEIMA ANTES DE TRANSFERIR.** CPI `burn` do token de entrada. Authority = `payer` quando externo (`invoke` normal), = a própria PDA quando interno (`invoke_signed`)
8. Calcula `amount_out` de `rate_q9` com aritmética `checked_*` em `i128`/`u64`; aplica `fee_bps`; valida `amount_out >= min_out`
9. CPI `TransferChecked` de `asset_out.vault` para o recebedor, **para `asset_out.token_program`** e com `asset_out.vault` como authority via `invoke_signed`
10. Grava `Settlement` imutável com `rate_q9` e spread efetivamente aplicados

> **Por que queimar antes:** na ordem inversa, uma falha parcial deixa um buraco de reserva. Queimar primeiro e depois transferir garante que, se a transferência falhar, a queima é revertida junto — nada é destruído, nada é criado.

Se qualquer passo após o 7 falhar, a transação inteira reverte. **É isso que a demo evidencia.**

### 4.10 `transfer_hook` — read-only, inviolavelmente

1. Valida que o mint é um `SettlementAsset` registrado
2. Valida `Corridor.paused == false`
3. Valida `source.owner` **e** `destination.owner` estão `STATUS_ALLOWED`
4. **Falha fechada:** qualquer erro de registro bloqueia a transferência

> **REGRA DE PROJETO INVARIANTE:** o `transfer_hook` é **estritamente read-only**. Não muta nenhum estado.
>
> Isso não é estilo — é uma exigência de segurança. O hook é invocado via CPI **de dentro do nosso próprio `settle`** (Token-2022 → hook → Peragus). Se o hook mutasse estado, teríamos reentrância num caminho que controlamos. O teste correspondente **deve falhar** se o hook mutar. Não é um teste que se ajusta até passar.

### 4.11 Interfaces off-chain (o contrato entre backend e parceiros)

**`FiatRailProvider`** — on-ramp (PIX). Duas implementações: `OzavFiatRailProvider` (INTEGRAÇÃO) e `MockFiatRailProvider` (MOCK). Métodos: `createCharge`, `getChargeStatus`, `verifyWebhookSignature`.

**`OffRampProvider`** — saída (PYG). Duas implementações: `DLocalOffRampProvider` (INTEGRAÇÃO) e `MockOffRampProvider` (MOCK, latência artificial de 3s). Métodos: `quote`, `payOut` (idempotente por `operation_id`), `getPayoutStatus`.

**`RateOracle`** — cotação. `getRate` → produz payload de atestação assinado.

As duas pontas são **INTEGRAÇÃO**, e nenhuma está construída no MVP. Mas a interface é real e o mock implementa a interface real — não um `if (mock)` espalhado pelo código.

### 4.12 Máquina de estados off-chain

```
created → awaiting_pix → pix_confirmed → tokenized → settling
        → settled → offramping → paid_out

terminais: failed | revoked
```

Toda transição grava em `operation_events`. Nenhuma transição pode ser pulada. Estados intermediários nunca são pulados por otimização — se um estado é desnecessário, ele é removido da máquina, não contornado.

### 4.13 Ciclo de vida de uma transação on-chain

```
T0  Backend monta a instrução
T1  Backend assina com payer = conta de taxas (admin ou treasury dev)
T2  [se houver assinatura do adquirente] → transmita para a wallet; aguarde
T3  Adquirente assina
T4  Backend envia
T5  Runtime executa: valida seeds/owners → valida atestação → valida
    allowlist → valida spread e slippage → burn → TransferChecked (→ hook) → grava Settlement
T6  Runtime verifica
T7  Backend persiste o hash da transação      ← ANTES de aguardar confirmação
T8  Worker aguarda confirmação
T9  Receipt: success → settled | error → failed | erro de RPC → mantém settling + hash
```

> **T7 é-load-bearing.** O hash é persistido **antes** de aguardar confirmação. Se o processo morrer entre T4 e T8, o hash está no banco e o worker retoma. Sem isso, operação se perde ou duplica.

Se a transação falhar por `BlockhashNotFound`, regenerar e reenviar com o **mesmo** `operation_id`. A proteção anti-duplicação é o PDA `Settlement`, não a transação.

### 4.14 Idempotência — o padrão a portar

A Peragus já tem um coordinator at-most-once provado neste repositório (`supabase/functions/_shared/settlement-coordinator.ts`). **Portar o padrão, não reinventar:**

```
claim → broadcast → persist → reconcile
```

Com os estados de erro `SETTLEMENT_RECONCILIATION_REQUIRED` e `SETTLEMENT_PENDING`.

O padrão se aplica a: criação de operação, webhook, mint, settle, payout. `request_id` é a chave em todos.

---

## 5. Stack — decided, não negociável

| Camada | Escolha |
|---|---|
| Blockchain | Rust · Anchor · **devnet** |
| Backend | TypeScript · Node 20 · Fastify |
| Banco | Postgres via projeto Supabase **novo** (projeto separado do app existente) |
| Fila/jobs | **pg-boss** (sem Redis — não adicionar dependência) |
| Frontend | React 19 · Vite · Tailwind · wallet-adapter |
| Deploy | Devnet apenas. Nenhum caminho de mainnet no repo |

> **Não reutilizar o app Supabase existente.** O hackathon é greenfield Solana-first, mas **com auth e API keys desde o dia 1** — não é um refinamento pós-MVP.

---

## 6. Escopo por fase

17 dias. Os dias 15–17 são **buffer e demo**, não cortáveis. Cortar escopo só acontece *antes* disso.

| Fase | Dias | Dev | Objetivo | Critério de saída |
|---|---|---|---|---|
| **F0 — Fundação** | 1–2 | A+B | Workspace, Anchor, chaves, deploy vazio na devnet | Programa implantado; `npm run bootstrap` roda |
| **F1 — Programa** | 2–8 | A | 8 instruções, mints, hook, invariantes | T-01 a T-20 verdes |
| **F2 — Backend núcleo** | 3–8 | B | Schema, auth, API keys, estado, atestações | API CRUD funcionando com auth |
| **F3 — Backend chain** | 6–11 | A+B | BlockchainClient, coordinator, adaptadores, workers | **Fluxo headless: API → mint → settle** |
| **F4 — Frontend** | 7–13 | B | Wallet, telas, timeline, painel de reserva | Demo navegável com dados reais |
| **F5 — Integração e testes** | 11–15 | A+B | E2E, testes de segurança, pré-demo | E2E verde; roteiro ensaiado |
| **F6 — Demo e entrega** | 15–17 | A+B | Gravação, README, docs, repo público | Submissão pronta |

### 6.1 Regras de phase gate

1. **Não avançar fase com a anterior incompleta.** Cortar escopo de fases futuras, nunca comprometer a anterior.
2. **O caminho E2E headless é o gate de F3.** Se API → mint → settle não funciona, o frontend não começa.
3. **F1 é o caminho crítico.** Se o programa não ficar pronto até o dia 8, cortar `revoke` e declarar como Future Scope.
4. **F6 não é cortável.**

### 6.2 Ordem de corte

Se precisar cortar, nesta ordem. A 5ª não é recomendada.

| Ordem | O que cortar | Impacto |
|---|---|---|
| 1º | Painel de reserva detalhado → histórico simples em `/reserve` | Baixo |
| 2º | `revoke` e permanent delegate | Médio — tira o argumento de chargeback |
| 3º | `pyPYG` (entregar o pivô direto) | Médio — volta a discussão de token utilitário |
| 4º | Auth e API keys (header estático) | Médio — tira o Persona 4 |
| 5º | E2E automatizado (roteiro manual) | **Alto — não recomendado** |

---

## 7. As 30 tarefas

Formato de cada: **ID · nome · objetivo · dependências · onde fica · o que faz · como sabe que terminou.**

### F0 — Fundação

**SOL-001 — Bootstrap do workspace**
Criar a estrutura do repositório do hackathon. Sem dependências.
Componentes: `programs/peragus_settlement`, `backend/`, `web/`, `scripts/`, `.env.example`, `README.md`.
Workspace Anchor, `package.json` com workspaces, `Anchor.toml` com `cluster = "devnet"`.
Segurança: `.env` no `.gitignore`; nenhum segredo em variável `VITE_*`.
**Aceite:** `npm install && anchor build && anchor test` passa do zero.

**SOL-002 — Configuração de ambiente e chaves**
Setup determinístico de devnet. Depende de SOL-001.
Componentes: `scripts/check-env.ts`, `.env.example`, `scripts/keygen.ts`.
Valida `ANCHOR_PROGRAM_ID`, `ADMIN_KEYPAIR`, `ATTESTER_KEYPAIR`, `DEPLOYER_KEYPAIR` via Zod; falha se ausente; confirma que o cluster é devnet.
Segurança: `ATTESTER` e `ADMIN` em caminhos distintos; **bootstrap falha se forem a mesma chave**.
Testes: env incompleto e chaves duplicadas.
**Aceite:** `npm run check:env` passa; bootstrap falha com mensagem clara em cluster ≠ devnet.

**SOL-003 — Bootstrap do programa**
IDL, lib.rs, export das 8 instruções (stubs OK nesta fase). Depende de SOL-001.
**Aceite:** programa implanta na devnet e o IDL é gerado e commitado.

### F1 — Programa (Dev A, caminho crítico)

**SOL-004 — Contas `Corridor` e `SettlementAsset`**
Estruturas de conta, seeds, validação de PDA canônico. Depende de SOL-003.
Contratos em §4.1. `token_program` gravado e lido em todo CPI (§4.3).
**Aceite:** `initialize_corridor` e `register_settlement_asset` funcionais; PDA derivation com bump canônico testada; re-derivação com seed errado falha.

**SOL-005 — `WalletRegistry` e `set_wallet_status`**
Registry de participantes, verificado por atestação do attester. Depende de SOL-004.
**Aceite:** I-7 implementada; wallet não registrada não pode transacionar em 100% dos caminhos.

**SOL-006 — Criação dos mints Token-2022**
`pgBRL`, `pyPYG`, `tsUSD` com as extensões corretas (§4.5) e metadados obrigatórios (§4.6). Depende de SOL-004.
**Aceite:** mints criados com Transfer Hook apenas onde previsto; metadados contêm literalmente as strings de "no backing"; `tsUSD` declara `testStablecoin: true` e "NOT USDT".

**SOL-007 — `mint_from_attestation`**
Emissão contra atestação ed25519. Depende de SOL-004, SOL-006.
Lógica completa em §4.8.
**Aceite:** emite com atestação válida; **replay reverte**; atesto expirada reverte; amount acima de `max_supply` reverte; assinatura de chave errada reverte.

**SOL-008 — `settle`**
Liquidação atômica de duas pernas. Depende de SOL-007.
Lógica completa e ordem em §4.9. **Os dois caminhos de authority, ambos explícitos.**
**Aceite:** settle simples funciona; **dois-legs na mesma TX funciona**; second settle do mesmo `operation_id` reverte; slippage reverte com pagador intacto; vault insuficiente reverte com pagador intacto; `spread_bps` acima do cap reverte.

**SOL-009 — `transfer_hook`**
Compliance em toda transferência. Depende de SOL-005, SOL-006.
Lógica em §4.10. **Read-only, inviolavelmente.**
**Aceite:** transferência para wallet não registrada reverte; **teste falha se o hook mutar estado** (o teste é para falhar se a regra for quebrada — não para ser ajustado até passar).

**SOL-010 — `revoke`**
Queima via permanent delegate + marcação. Depende de SOL-005, SOL-006.
**Aceite:** revoga saldo de wallet `REVOKED` sem assinatura do dono; marca `Settlement` como revogado; `Settlement` continua imutável nos demais campos.

**SOL-011 — `pause` / `unpause`**
Kill switch. Depende de SOL-004.
**Aceite:** com `paused == true`, `settle` e todas as transferências falham; `unpause` restaura.

**SOL-012 — Testes de integração do programa**
T-01 a T-20 verdes. Depende de SOL-007..SOL-011.
Casos obrigatórios: §4.7 e §4.9. Cobrir os **dois** caminhos de authority explicitamente.
**Aceite:** os 20 testes passam; nenhum marcado skip ou ignored.

**SOL-013 — CLI de bootstrap**
Script que faz deploy, cria mints, registra assets, registra wallets, inicializa corridor. Depende de SOL-004..SOL-007.
**Aceite:** `npm run bootstrap` leva um cluster devnet limpo até um settle possível, do zero, em um comando.

### F2 — Backend núcleo (Dev B)

**SOL-014 — Schema do banco**
Tabelas: `organizations`, `api_keys`, `corridors`, `operations`, `operation_events`, `attestations`, `reserve_snapshots`, `rate_quotes`, `payouts`. Depende de nada.
Regras: `rate` guardado como `numeric(20,10)` **apenas para exibição**; RLS negando cross-organização; audit log.
**Aceite:** migrations aplicáveis do zero; RLS testada e negando acesso entre organizações.

**SOL-015 — Auth e API keys**
API key com SHA-256, escopo por organização, rotação. Depende de SOL-014.
Reutilizar o padrão de `supabase/migrations` já existente no repositório.
**Aceite:** request sem key → 401; key de org A não acessa recurso de org B; resposta de erro não vaza detalhe interno.

**SOL-016 — Máquina de estados e repositório**
Estados em §4.12. Toda transição grava `operation_events`. Depende de SOL-014.
**Aceite:** transição inválida rejeitada; nenhuma transição pula estado; `failed` e `revoked` são terminais.

**SOL-017 — Canonicalização e assinatura de atestações**
Payload canônico → hash → assinatura ed25519. Depende de SOL-014.
**Aceite:** o mesmo payload produz o mesmo hash; payload alterado muda o hash; assinatura verifica; conversão `numeric` → `i128` (escala 10⁹) coberta por vetor de teste.

### F3 — Backend chain

**SOL-018 — `BlockchainClient`**
Wrapper sobre o IDL, devnet. Depende de SOL-013.
Todo CPI de token usa `token_program` do registro (§4.3).
**Aceite:** envia e confirma transação; persiste hash antes de aguardar confirmação; erro de RPC não perde a operação.

**SOL-019 — `RateOracle` e atestação de cotação**
Cotação (MOCK na fonte) → payload assinado. Depende de SOL-017.
Produz `ATTEST_RATE` com `expiry` e `spread_bps`.
**Aceite:** expiração é respeitada on-chain; spread acima de `rate_cap_bps` reverte.

**SOL-020 — Adaptador de rail de fiat (on-ramp PIX)**
`FiatRailProvider` com `MockFiatRailProvider` e `OzavFiatRailProvider`. Depende de SOL-014, SOL-015.
**Aceite:** BR Code gerado; webhook HMAC verificado; webhook duplicado não processa duas vezes; rail indisponível deixa a operação em `awaiting_pix` e **nunca emite**.

**SOL-021 — Adaptador de off-ramp (PYG)**
`OffRampProvider` com `MockOffRampProvider` e `DLocalOffRampProvider`. Depende de SOL-014.
Mock com latência artificial de 3s (para o estado `offramping` ficar visível na demo).
Payload de referência da dLocal em §14.2.
**Aceite:** payout idempotente por `operation_id`; latência do mock presente; falha do off-ramp não perde a operação.

**SOL-022 — Settlement coordinator**
Padrão at-most-once. Depende de SOL-016, SOL-018.
**Portar `supabase/functions/_shared/settlement-coordinator.ts`.** Fluxo `claim → broadcast → persist → reconcile`. Estados `SETTLEMENT_RECONCILIATION_REQUIRED` e `SETTLEMENT_PENDING`.
**Aceite:** operação em `settling` sem hash vai para reconciliação; reenvio com mesmo `operation_id` não duplica; `BlockhashNotFound` regenera e reenvia sem duplicar.

**SOL-023 — API HTTP**
Endpoints conforme contrato da spec §26. Depende de SOL-015, SOL-016, SOL-019, SOL-020.
**Aceite:** todos os endpoints respondem conforme contrato; erros sanitizados; `request_id` garante idempotência na criação.

**SOL-024 — Workers de reconciliação**
Job diário de reserva + retoma de operações pendentes. Depende de SOL-022.
**Aceite:** job executa; divergência de lastro detectada e escalada; operação `settling` sem hash é retomada.

### F4 — Frontend (Dev B)

**SOL-025 — Fundação do frontend**
React 19 + Vite + Tailwind + wallet-adapter. Depende de nada.
**Aceite:** build de produção sem erro; selo `DEVNET` presente em toda tela que toca a chain.

**SOL-026 — Conexão de wallet**
Conectar e assinar. Depende de SOL-025, SOL-018.
**Aceite:** conecta conta corporativa; assinatura produz transação que o backend consegue submeter.

**SOL-027 — Criação de operação**
Formulário de operação + cotação. Depende de SOL-023, SOL-026.
**Aceite:** operação criada; cobrança PIX gerada; estado `awaiting_pix` visível.

**SOL-028 — Detalhe da operação e assinatura**
Timeline de estados, links de explorer, botão de assinar. Depende de SOL-027.
**Aceite:** todos os estados visíveis com timestamp; links com `cluster=devnet` corretos; assinatura leva ao estado `settling`.

**SOL-029 — Painel de reserva**
Supply on-chain vs. atestação, delta, injeção de divergência. Depende de SOL-024.
Invariante de lastro por ativo (spec §22.1). **Nunca somar entre ativos diferentes.**
**Aceite:** painel mostra supply, atestação e delta; divergência injetada aparece; MOCK rotulado.

### F5–F6 — Integração, teste e entrega

**SOL-030 — E2E e roteiro da demo**
`demo-happy-path` e `demo-rollback`. Depende de tudo.
Roteiro de 10 passos na spec §35.1. As três demonstrações obrigatórias e as quatro declarações de honestidade.
**Aceite:** caminho completo em menos de 5 minutos; rollback atômico demonstrável sob demanda; replay rejeitado demonstrável; divergência de reserva detectada demonstrável; as quatro declarações no roteiro; roteiro ensaiado ao menos 3 vezes.

---

## 8. Critérios de aceite

### 8.1 Programa

- [ ] `anchor test` com T-01 a T-20 verdes, nenhum skipped
- [ ] Replay de atestação reverte
- [ ] Double-settle reverte
- [ ] Slippage reverte com o pagador intacto
- [ ] Vault insuficiente reverte com o pagador intacto
- [ ] Transferência para wallet não registrada reverte em 100% dos caminhos
- [ ] `transfer_hook` não muta estado (verificado por teste)
- [ ] `max_supply` respeitado
- [ ] Upgrade authority distinta de toda chave operacional
- [ ] Os **dois** caminhos de authority de `settle` cobertos por teste

### 8.2 Backend

- [ ] Idempotência em criação, webhook, mint, settle e payout
- [ ] Hash de tx persistido **antes** de aguardar confirmação
- [ ] `settling` sem hash → `SETTLEMENT_RECONCILIATION_REQUIRED`
- [ ] Nenhum mint sem confirmação assinada
- [ ] Erros sem detalhe interno
- [ ] RLS nega cross-organização
- [ ] Reconciliação diária executa e escala divergência

### 8.3 Frontend

- [ ] Wallet conecta e assina
- [ ] Timeline mostra todos os estados com timestamp
- [ ] Links do explorer corretos com `cluster=devnet`
- [ ] Painel de reserva mostra supply, atestação e delta
- [ ] Selo `DEVNET` em todas as telas que tocam a chain
- [ ] Todo componente MOCK está rotulado na tela

### 8.4 Demo

- [ ] Caminho completo E2E em menos de 5 minutos
- [ ] Rollback atômico demonstrável sob demanda
- [ ] Replay rejeitado demonstrável
- [ ] Divergência de reserva detectada demonstrável
- [ ] As quatro declarações de honestidade no roteiro

### 8.5 Definition of Done

1. **Programa** — todas as critérios de §8.1 verdes, em `main`, sem warnings relevantes
2. **Backend** — todas as de §8.2; migrations do zero; erros sanitizados
3. **Frontend** — todas as de §8.3; build de produção sem erro
4. **E2E** — `demo-happy-path` e `demo-rollback` verdes; roteiro ensaiado 3×
5. **Documentação** — README com setup do zero, decisões de arquitetura **com a justificativa**, e a matriz REAL/MOCK/INTEGRAÇÃO explícita
6. **Honestidade** — a matriz §2.1 refletida na UI **e** no README
7. **Repositório** — público, com `Anchor.toml`, IDL commitado, sem segredos, sem caminho de mainnet
8. **Vídeo** — gravado, ≤ 5 minutos

**Não é Definition of Done:** funcionar em mainnet, ter lastro real, ter integração OZAV real, ou ter integração real com dLocal. Nada disso está no escopo.

---

## 9. Regras invioláveis

As seis coisas que, se violadas, invalidam o projeto mesmo com tudo verde:

1. **`transfer_hook` é read-only.** Nunca. É reentrante por construção e o teste deve falhar se mutar.
2. **Nunca hardcode um token program.** Leia de `SettlementAsset.token_program` em todo CPI.
3. **Nunca usar `f64` para dinheiro.** `i128`/`u64`, aritmética `checked_*`, `rate_q9` = taxa × 10⁹.
4. **Queimar antes de transferir, sempre.** Ordem inversa cria buraco de reserva.
5. **Hash da transação persistido antes de aguardar confirmação.** Sem isso, operação se perde.
6. **Nunca apresentar MOCK como REAL.** Na tela, não no código.

### 9.1 Segurança on-chain

- Todo PDA validado com `seeds` e `bump` canônicos, **nunca** aceito da entrada
- Nenhum account em `remaining_accounts` sem validação de owner e signer
- Nenhum `unwrap()` em caminho alcançável por entrada de usuário
- Upgrade authority separada de **toda** chave operacional
- `transfer_hook` falha fechada

### 9.2 Separação de contas (devnet)

| Papel | Quem |
|---|---|
| Deployer | Assina o deploy |
| Admin | Controla `Corridor`, pausa, registra ativos. **Nunca assina atestação** |
| Attester | Assina atestações de mint, cota��ão e wallet. **Nunca é admin** |
| Acquirer | Wallet corporativa. Assina `settle` |
| Treasury | Conta de taxas |

`ADMIN` e `ATTESTER` **precisam** ser chaves diferentes. O bootstrap falha se forem a mesma.

---

## 10. Pontos de atenção — o que vai teiggerar

| # | Armadilha | O que fazer |
|---|---|---|
| 1 | Assumir que existe USDT em devnet | **Não existe.** O pivô em devnet é `tsUSD`, token de teste do time. Ver §4.3 |
| 2 | Validar "mint tem que ser Token-2022" | O USDT de produção é SPL legado. Um validador hardcoded rejeita produção. Valide owner ∈ {Token-2022, SPL legado} |
| 3 | Implementar `settle` com um caminho de authority só | São dois. Ver §4.9 |
| 4 | Transferir antes de queimar | Cria buraco de reserva em falha parcial |
| 5 | Guardar taxa como `f64` | `rate_q9: i128` = taxa × 10⁹ |
| 6 | Chamar campos de `*Minor` | São 6 decimais, não centavos. Use `*Atomic` |
| 7 | Somar supply entre ativos diferentes no painel de reserva | Invariante de lastro é **por ativo** |
| 8 | Anexar a transação antes de persistir o hash | Operação se perde se o processo morrer |
| 9 | Assumir que `token_program` é sempre o mesmo para todos os ativos | O rail tem ativos em dois programas |
| 10 | Colar `if (mock)` espalhado pelo código | Duas implementações da mesma interface |
| 11 | Colocar segredo em variável `VITE_*` | Frontend é público |
| 12 | Assumir que existe stablecoin lastreado em devnet | Não existe. O pivô é token de teste sem lastro, e os metadados declaram isso |

---

## 11. Enquadramento regulatório — para o README e para o pitch

O positioning **não** é opcional. Ele responde à pergunta mais provável de um júri técnico.

**A Peragus não emite moeda.** É **fornecedora de infraestrutura** para uma instituição autorizada. Isso é uma decisão de estrutura de risco, não um detalhe de positioning — a alternativa exigiria estrutura societária, capital e supervisão que não existem.

**Regulatório aplicável ao corredor:**

- **Res. BCB 561** (publicada 2026-04-30, **em vigor desde 2026-10-01**) — proíbe instituições de pagamento, emissores de e-money e adquirentes de liquidar a **perna offshore** com stablecoin. A liquidação com contraparte estrangeira deve ser por FX tradicional ou conta em reais de não residente.
- **Res. BCB 521** (em vigor desde 2026-02-02) — traz serviços de ativos virtuais para o mercado de câmbio e cria o **canal supervisionado** em que a perna em stablecoin é permitida.

**Adotado:** o parceiro de produção será um **VASP licenciado, sob a Res. 521**. É o único perfil em que a perna em stablecoin continua permitida, e é o único compatível com a arquitetura B'.

> ⚠️ **Isso é hipótese adotada pelo time, não parecer validado.** Antes de qualquer conversa comercial, quatro perguntas vão para o advogado:
> 1. A Res. 521 cobre de fato a operação descrita?
> 2. Há exigência de capital ou segregação que a inviabilize?
> 3. O parceiro pretendido tem essa autorização?
> 4. A contraparte paraguaia aceita stablecoin como compensação, ou exige fiat convencional?
>
> **Não usar a Res. 521 como base legal em material externo, pitch ou proposta antes disso.**

**Efeito colateral que importa:** um VASP não é automaticamente uma instituição de pagamento. A coleta de PIX em BRL pode continuar exigindo uma instituição de pagamento — por isso a OZAV provavelmente **não** é redundante, e por isso o grafo de parceiros está adiado (D-34).

**Como falar disso sem exagero:** a economia do corredor pede um pivô em stablecoin (guaraní é dolarizado, volume alto em USD/BRL→PYG). A regra vigente proíbe que isso aconteça no canal de câmbio eletrônico. O canal que sobra é o de ativos virtuais supervisionados — e é ali que um rail de liquidação se instala. A Peragus não contorna a regra; ela se posiciona no único canal que a regra permite.

---

## 12. Fora de escopo

Não é para fazer. Não é para planejar. Não é "pra já deixar pronto".

**Produto:** mainnet · Squads/multisig para adquirente e upgrade authority · USDC como pivô · segundo corredor · driver de maquininha/POS · aquisição de cartão (é o negócio do cliente) · fluxo reverso PYG→BRL · KYC/KYB completo · PLD/AML reporting · i18n além de pt-BR/en · mobile · telas de admin do attester (é CLI).

**Arquitetura:** flashloan · netting multilateral · confirmação de preço on-chain · reimplementação de ledger de saldos.

### 12.1 Sobre o flashloan — decisão, não esquecimento

Descartado **com fundamento**, não por falta de tempo. O objetivo declarado — "evitar que o stablecoin fique na mão de nenhuma das partes" — é **integralmente entregue pela atomicidade da transação**, sem custo adicional. Flashloan acrescentaria fee, dependência de terceiro e consumo de CU sem alterar a propriedade desejada.

**Gatilho para reconsiderar, registrado:** ativar quando **simultaneamente** (a) existir janela assíncrona entre as pernas (settlement em T+1 em vez de atômico) **e** (b) o saldo do vault ficar abaixo do piso de liquidez operacional. Nesse cenário o flashloan deixa de ser redundante e passa a ser crédito operacional — produto distinto, com requisitos de capital próprios.

### 12.2 Roadmap pós-hackathon (contexto, não compromisso)

| Horizonte | Foco |
|---|---|
| 0–90 dias | Integração OZAV real; onboarding dLocal; mainnet; Squads |
| 90–180 dias | Multi-corredor; KYC/KYB; PLD/AML; reconciliação automatizada |
| 180–365 dias | Netting multilateral; coverage como serviço; USDC; mais de 2 participantes |

---

## 13. A demo

5 minutos. Roteiro completo na spec §35.1. O que **tem** que acontecer:

**As três demonstrações obrigatórias:**

1. **Rollback atômico** — injeta falta de liquidez na perna 2, a transação reverte inteira, `pgBRL` do adquirente fica intacto. **É o momento que converte o jurado.**
2. **Replay rejeitado** — reenvia atestação consumida, reverte
3. **Divergência de reserva detectada** — injeta divergência, o painel acusa

**As quatro declarações obrigatórias em voz alta:**

- "Estamos na **devnet**."
- "Os tokens **não têm lastro** — o lastro é simulado."
- "O off-ramp para guaraní é **simulado**; a integração com a dLocal está especificada e não construída."
- "A **PIX está num adaptador**; a integração com a OZAV está especificada e não construída."

Dizer essas quatro frases é o que separa uma demo séria de uma demo de mentira. **Não as pule.**

**Risco conhecido:** a demonstração de falha ao vivo é o ponto mais frágil da demo. Testar exaustivamente antes e ter **gravação de backup do run feliz**.

---

## 14. Referências

### 14.1 Spec completa

`docs/superpowers/specs/2026-09-25-peragus-colosseum-solana-hackathon-design.md` — 45 seções. Quando este documento não bastar, ir lá. Se lá também não bastar, perguntar.

### 14.2 Referência da dLocal (payout PYG)

`docs.dlocal.com/docs/paraguay-payouts-v3`

| Parâmetro | Valor |
|---|---|
| `country` | `PY` |
| `currency` | `PYG` — ou `USD` como origem, payout em moeda local |
| `currency_to_pay` | Opcional. Ausente ⇒ paga em PYG. `USD` explícito para pagar em dólar |
| `payment_method_id` | `BANK_TRANSFER` |
| `flow_type` | `B2C`, `B2B`, `P2P` |
| `purpose` | Obrigatório (tabela de purpose codes) |
| `beneficiary.document.type` | `CI` (7–8 dígitos) ou `RUC` (6–9) |
| `beneficiary.bank_account.account` | SIPAP, 16 dígitos |
| `beneficiary.bank_account.code` | Tabela de 30 bancos |

No fluxo `B2B` — que é o nosso caso — exige `beneficiary.business_name` e **não** exige dados do pagador. Isso simplifica o payload.

**Não integrado no MVP.** A interface e o mock bastam.

### 14.3 Código existente a portar

| Arquivo | O que tem |
|---|---|
| `supabase/functions/_shared/settlement-coordinator.ts` | Coordinator at-most-once provado. **Portar, não reinventar.** |
| `supabase/functions/_shared/operation-idempotency.ts` | Padrão de idempotência |
| `supabase/functions/_shared/state-machine.ts` | Máquina de estados existente (a nova substitui) |
| `supabase/migrations/` | Padrão de `api_keys`, RLS, audit log, auth |
| `supabase/functions/_shared/treasury-transfer.ts` | Settlement EVM/Polygon — **substituído** pelo adapter Solana |
| `supabase/functions/_shared/pix.ts` | Gerador de BR Code — **substituído** pela integração OZAV |
| `src/pages/app/Operations.tsx` | Dashboard de operações a reconstruir |
| `src/types/operation.ts` | Vocabulário de status a reconstruir |

### 14.4 Specs anteriores

| Documento | Relação |
|---|---|
| `2026-08-23-peragus-sandbox-mvp-design.md` | **Substituído** — era o sandbox PIX-simulado → MockUSDT |
| `2026-08-30-treasury-settlement-hardening-design.md` | **Carregar** — padrões de segurança financeira a trazer |

---

## 15. Perguntas ainda abertas

Não bloqueiam a implementação. O programador **não deve** inventar respostas para elas.

| ID | Pergunta | Encaminhamento |
|---|---|---|
| Q-02 | O `attester` de produção é OZAV, um banco ou uma ATH? | Decisão com o parceiro regulado |
| Q-03 | O saldo de BRL fica em conta segregada de quem? | Jurídico + parceiro |
| Q-04 | A mutação de `Corridor.attester` deve exigir timelock? | Decisão de arquitetura de segurança |
| Q-05 | O adquirente é contraparte da Peragus ou há terceiro pagador? | Comercial + jurídico |
| Q-06 | A Peragus precisa de autorização no Paraguai (BCP)? | Jurídico. **Não pesquisado** |
| Q-07 | `USDT` na Solana tem liquidez suficiente? | USDC é alternativa (registro trivial) |
| Q-08 | A taxa e o spread são da Peragus ou do adquirente? | Comercial |
| Q-09 | A demo precisa de fluxo reverso? | **Cortável** |
| Q-10 | O que o mock de histórico mostra? | Avaliar com o time |
| Q-11 | OZAV + dLocal, ou dLocal como contraparte única? | **Adiado para depois da demo** |
| Q-13 | Validação jurídica do canal (4 perguntas) | **Jurídico, antes de qualquer conversa comercial** |

**As três que mais importam para o programador:** Q-07 (define se o pivô de produção é viável — o programa já é agnóstico, então é um registro, não código), Q-09 (é a única que pode virar corte de escopo) e Q-03 (determina se a Peragus é custodiante — muda o desenho do saldo segregado).
