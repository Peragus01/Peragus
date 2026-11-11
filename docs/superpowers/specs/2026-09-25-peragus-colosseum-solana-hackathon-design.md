# PERAGUS — COLOSSEUM SOLANA HACKATHON
## Technical & Product Specification

**Data:** 2026-09-25
**Status:** Especificação para revisão do dono
**Prazo de submissão:** 2026-10-12 (Colosseum Crypto World's Fair)
**Ambiente:** Solana Devnet
**Idioma do repositório de origem:** pt-BR

---

## 1. Executive Summary

A Peragus constrói um **rail de liquidação cross-border permissionado sobre Solana para adquirentes na América Latina**, começando pelo corredor Brasil → Paraguai.

O problema: um adquirente que opera maquininhas no Paraguai e aceita PIX em BRL de turistas brasileiros não tem como liquidar esse BRL em guaraní sem relacionamento bancário cross-border, conta em dólar ou uma semana de espera. A Peragus resolve isso intermediateando a liquidação: recebe a exposição em BRL, emite uma representação tokenizada lastreada (`pgBRL`), e liquida atomicamente contra stablecoin e contra um token de fiat do destino (`pyPYG`),:lastrando cada token 1:1 contra reserva segregada verificada por atestação criptográfica assinada.

A blockchain não é um enfeite. Ela resolve o problema central do produto — **a atomicidade entre a perna de captação e a perna de liquidação** —, e ela resolve com uma propriedade que sistemas legados de liquidação não têm: se a segunda perna falhar por falta de liquidez, a primeira reverte junto. O adquirente nunca fica segurando stablecoin que não pediu.

O programa Rust é agnóstico ao ativo e não emite moeda: a autoridade de mint é uma PDA do próprio programa e só emite contra uma atestação ed25519 assinada pelo atester, anti-replay por construção. Isso coloca a Peragus na posição de **fornecedora de infraestrutura** e não de instituição emissora — que é a única posição defensável tanto em produto quanto em conformidade regulatória brasileira.

**Entregável do hackathon:** uma operação cross-border completa, ponta a ponta, com programa em Rust na devnet, dois tokens Token-2022 permissionados, settlement atômico de duas pernas, painel de reserva com verificação de lastro, e assinatura on-chain do adquirente.

---

## 2. Problem

### 2.1 O problema do adquirente cross-border

Um adquirente (ou PSP) que opera maquininhas no Paraguai e quer aceitar PIX brasileiro enfrenta quatro barreiras simultâneas:

1. **Não tem lastro cross-border.** Recebe BRL de um PIX brasileiro, mas opera em guaraní. Precisa de uma conta em dólar ou de um banco estrangeiro.
2. **Liquidação assíncrona.** O PIX é instantâneo, mas o settlement bancário cross-border é T+1 ou mais.
3. **Câmbio opaco.** A taxa de conversão BRL→PYG passa por 2-3 intermediários, cada um com seu spread. O guaraní é uma moeda referenciada ao dólar, e qualquer desvio da referência de mercado aparece multiplicado.
4. **Sem trilha auditável.** A conciliação entre o que o adquirente recebeu e o que foi liquidado é feita em planilhas.

### 2.2 Por que as alternativas existentes não resolvem

| Alternativa | Por que não resolve |
|---|---|
| SWIFT / transferência internacional | 3-5 dias, custo alto, sem liquidação em fim de semana |
| Codec de stablecoin (dLocal, BitPay, Transak) | Não tokeniza o fiat local; entrega stablecoin, não moeda do destino |
| Conta em USD em banco americano | Custo de manutenção, KYC pesado, e o adquirente ainda tem risco de câmbio próprio |
| BaaS white-label (OZAV e similares) | Resolve o on/off-ramp, mas não a liquidação atômica multi-parte nem o rail permissionado |
| Fazer a tokenização internamente | Exige estrutura societária e licenciamento que não existem |

### 2.3 Dados de mercado que sustentam o par

- **USD/PYG ≈ 5.929** (25 set 2026); guaraní **fortaleceu ~16% em 12 meses**.
- **BRL/PYG ≈ 1.158**.
- Referência do BCP para fim de 2026: ~6.700.
- O Paraguai é **dolarizado**: contratos de alto valor, imóveis e bens duráveis são precificados em dólar.

**Consequência de projeto:** o guaraní é uma moeda referenciada ao dólar, logo **USDT é o ativo de liquidação natural do par**. O caminho `BRL → USDT → PYG` não é um artifício técnico — é a estrutura real do mercado. A Peragus não inventa o caminho intermediário; ela o industrializa.

> **Ressalva regulatória (ver §37.3).** A economia do corredor sustenta o pivô em stablecoin, mas a **Res. BCB 561**, em vigor desde 2026-10-01, impede que essa liquidação ocorra no canal de câmbio eletrônico. O pivô só é lícito no canal supervisionado de ativos virtuais da **Res. BCB 521**. Isso não altera a tese de mercado; altera **quem pode executá-la**, e reforça o posicionamento da Peragus como fornecedora de infraestrutura para uma instituição autorizada.

---

## 3. Solution

A Peragus opera um **motor de liquidação tokenizada** na Solana que converte exposição em fiat de origem em moeda do destino, de forma atômica, permissionada e auditável.

Quatro componentes:

| # | Componente | Função |
|---|---|---|
| 1 | **Ativos tokenizados** (`pgBRL`, `pyPYG`) | Representam a exposição em fiat. Lastro 1:1 verificado por atestação. |
| 2 | **Programa `peragus_settlement`** | Emite só contra atestação; liquida atomicamente; impõe compliance em toda transferência. |
| 3 | **Cofres (PDA)** | Hospedam a liquidez. Nenhuma chave humana os move. |
| 4 | **Adaptadores de rail** | Conectam fiat de entrada (OZAV) e fiat de saída (off-ramp paraguaio). |

### 3.1 A propriedade central: atomicidade de duas pernas

O produto inteiro se resume a esta propriedade:

```
Uma única transação on-chain:
  queima pgBRL do adquirente
  transfere tsUSD do cofre → conta de liquidação
  transfere pyPYG do cofre → wallet do adquirente
  grava dois Settlement PDA imutáveis
```

Se a perna tsUSD→PYG falhar, **tudo reverte**. Não existe estado em que o adquirente fique com stablecoin que não pediu. Nenhum flashloan, nenhum financiador intermediário, nenhum livro-razão paralelo — a atomicidade da transação já entrega o que a Peragus precisa.

### 3.2 Por que permissionado

Os participantes são **adquirentes licenciados**, com KYC/KYB. A allowlist não é enfeite: ela é o produto. Um rail de liquidação para instituições reguladas que aceita qualquer wallet seria um rail aberto, não uma infraestrutura.

A implementação é a extensão **Transfer Hook** do Token-2022. Num mint com transfer hook, uma instrução `Transfer` simples **falha** com `MissingRequiredTransferHook`. Só passa via `TransferChecked` carregando as contas do hook. Não existe caminho de transferência que evite o programa da Peragus.

### 3.3 Por que o programa não emite moeda

A autoridade de mint é uma **PDA do próprio programa**, que só emite ao verificar uma atestação ed25519 do atester. Nenhum humano, em nenhum momento, possui chave capaz de emitir. Em produção, o atester é um parceiro regulado; a Peragus fornece a tecnologia.

Isso é uma decisão de estrutura de risco, não apenas de arquitetura. A Resolução BCB 520 (arts. 32-42) permite que instituição licenciada terceirize custódia, liquidez, market making e BaaS permanecendo integralmente responsável. A Resolução BCB 521 (art. 76-B) exige que, no fluxo de FX com cripto, o provedor seja entidade supervisionada e que **a instituição licenciada, não o provedor, seja a contraparte regulada do cliente**. A Peragus na posição de fornecedora de infraestrutura é a única posição compatível com o escopo de um hackathon sem estrutura societária e sem capital regulatório.

---

## 4. Product Scope

### 4.1 Dentro do escopo

- Programa Anchor/Rust único com 8 instruções
- Dois mints Token-2022 permissionados: `pgBRL`, `pyPYG`
- Emissão gated por atestação ed25519, anti-replay por construção
- Liquidação atômica de duas pernas
- Compliance on-chain em toda transferência (transfer hook + allowlist)
- Revogação para chargeback (permanent delegate)
- Backend: auth, API keys, máquina de estados, adaptadores, worker de reconciliação
- Frontend: conexão de wallet, criação de operação, timeline com explorer, painel de reserva
- Devnet completa, end-to-end, roteirizada

### 4.2 Fora do escopo do hackathon (Future Scope)

- Deploy em mainnet
- Multisig / Squads para o adquirente e para o upgrade authority
- USDC como ativo de settlement
- Segundo corredor além de BR→PY
- Flashloan como mecanismo de origem de liquidez
- Netting multilateral entre múltiplos participantes
- Interest-bearing tokens
- Confidential transfers
- Onboarding comercial e integração real com o PSP paraguaio (dLocal)
- COAF/PLD reporting

### 4.3 Regra de YAGNI aplicada

Toda funcionalidade acima da linha 4.1 foi testada contra a pergunta *"isso precisa existir no MVP?"*. As que não passaram estão em Future Scope com o gatilho que as justificaria.

---

## 5. Hackathon MVP

**O que estará funcionando na apresentação:**

Uma operação cross-border completa, ponta a ponta, com as seguintes propriedades verificáveis ao vivo:

| Verificável | Como |
|---|---|
| Programa em Rust implantado na devnet | Endereço de programa exibido |
| Dois tokens permissionados criados | Endereços de mint exibidos |
| Emissão condicionada a atestação assinada | Demonstrar que emission sem atestação reverte |
| Replay bloqueado | Reenviar a mesma atestação e mostrar `revert` |
| Liquidação atômica de duas pernas | Uma única assinatura de transação |
| Rollback atômico | Injetar falta de liquidez e mostrar a transação inteira revertendo |
| Compliance | Transferir para wallet não registrada e mostrar `revert` |
| Assinatura do adquirente | Wallet corporativa assina a liquidação |
| Lastro verificável | Supply on-chain contra atestação de reserva, com divergência injetada |
| Auditoria | Bundle de prova por operação com todas as assinaturas e links do explorer |

**O que NÃO estará funcionando (e será declarado):** lastro real, off-ramp real em guaraní, PIX real em sandbox de produção, Deploy em mainnet.

---

## 6. User Personas

### Persona 1 — Mariana, diretora financeira, exportadora brasileira *(demo, papel secundário)*
Recebe em BRL de clientes, precisa pagar fornecedor no exterior ou converter tesouraria. Hoje: 2-5 dias, spread opaco, sem trilha. **Rota na demo:** não participa ativamente; representa o MpContext que gera a exposição em BRL.

### Persona 2 — Roberto, geek de viagem / turista brasileiro no Paraguai *(demo, gatilho da demanda)*
Não tem wallet Solana e não deveria ter. Paga a compra com PIX brasileiro direto na maquininha. **Rota na demo:** 100% off-chain. Não assina nada on-chain.

### Persona 3 — Sandra, controladora de tesouraria do adquirente paraguaio *(demo, ator principal on-chain)*
Recebe a exposição em BRL, precisa de float em guaraní. Assina a liquidação com a wallet corporativa. Decide quando converter `pyPYG` em guaraní real. **Rota na demo:** assina a transação de settlement.

### Persona 4 — Desenvolvedor integrador *(demo, motivo do API)*
Consome a Peragus via API key. É o que justifica auth + API keys desde o início e o bundle `/proof`.

### Persona 5 — Operador Peragua *(implícito)*
Assina atestações de lastro e cotação, opera o attester, monitora a reserva.

---

## 7. End-to-End User Flow

```
TURISTA (off-chain)              ADQUIRENTE                 PERAGUS                      SOLANA
        │                            │                        │                            │
        │ paga PIX BRL              │                        │                            │
        ├───────────────────────────►│ registra a venda       │                            │
        │                            │ POST /v1/operations    │                            │
        │                            ├───────────────────────►│                            │
        │                            │                        │ (a) FiatRailProvider       │
        │                            │                        │     gera cobrança PIX       │
        │                            │◄───────────────────────┤                            │
        │                            │                        │ (b) confirma PIX             │
        │                            │                        │     → assina atestação      │
        │                            │                        │     de lastro ed25519        │
        │                            │                        │                            │
        │                            │                        │ (c) mint_from_attestation   │
        │                            │                        ├───────────────────────────►│ verifica sig
        │                            │                        │                            │ consome nonce PDA
        │                            │                        │                            │ emite pgBRL
        │                            │                        │                            │
        │                            │ recebe pgBRL           │                            │
        │                            │◄──────────────────────────────────────────────────────┤
        │                            │                        │                            │
        │                            │ GET /v1/quote          │                            │
        │                            ├───────────────────────►│ assina atestação           │
        │                            │                        │     de cotação ed25519      │
        │                            │◄───────────────────────┤                            │
        │                            │                        │                            │
        │                            │ ASSINA a liquidação    │                            │
        │                            │        │               │                            │
        │                            │        └───────────────►│ settle (2 pernas)          │
        │                            │                        ├───────────────────────────►│ 1. queima pgBRL
        │                            │                        │                            │ 2. vault→tsUSD
        │                            │                        │                            │ 3. vault→pyPYG
        │                            │                        │                            │ 4. grava 2 Settlement
        │                            │                        │                            │
        │                            │ recebe pyPYG           │                            │
        │                            │◄──────────────────────────────────────────────────────┤
        │                            │                        │                            │
        │                            │ POST payout            │                            │
        │                            ├───────────────────────►│ OffRampProvider            │
        │                            │                        │ (mock)                      │
        │                            │◄───────────────────────┤ pyPYG → PYG                │
        │                            │ recebe PYG             │                            │
        │                            │◄───────────────────────┤                            │
```

### 7.1 Tabela de etapas

| # | Etapa | Ator | Natureza |
|---|---|---|---|
| 1 | Turista paga PIX BRL na maquininha | Consumidor | **MOCK** (BR Code + webhook HMAC) |
| 2 | Adquirente registra venda e cria operação | Adquirente | **REAL** — API + Postgres |
| 3 | Backend gera cobrança PIX | Peragus | **INTEGRAÇÃO** — OZAV |
| 4 | Confirmação do PIX por webhook assinado | OZAV | **INTEGRAÇÃO** |
| 5 | Backend assina atestação de lastro ed25519 | Peragus | **REAL** |
| 6 | `mint_from_attestation` emite `pgBRL` | Programa | **REAL** — on-chain |
| 7 | Adquirente consulta cotação | Adquirente | **REAL** |
| 8 | Backend assina atestações de cotação | Peragus | **REAL** |
| 9 | **Uma transação, duas instruções `settle`** | Adquirente + Programa | **REAL** — on-chain |
| 10 | Backend solicita payout; `pyPYG` → PYG | Peragus | **MOCK** |
| 11 | Dashboard: timeline, assinaturas, tx, explorer, lastro | Todos | **REAL** |

---

## 8. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CONSUMIDOR (off-chain)                                                  │
│  Turista brasileiro paga PIX em maquininha no Paraguai                    │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ Pix
┌────────────────────────────────▼─────────────────────────────────────────┐
│  ADQUIRENTE / PSP  (sistema do cliente, fora do nosso repo)              │
│  Registra venda · POST /v1/operations · ASSINA o settlement               │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ API key (HTTPS)
┌────────────────────────────────▼─────────────────────────────────────────┐
│  PERAGUS BACKEND  (TypeScript · Fastify · Postgres)                      │
│                                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ API + Auth │  │ State Machine│  │  Adaptadores  │  │   Attester   │  │
│  │ Supabase + │  │ idempotência │  │  Rail / Off-  │  │  ed25519     │  │
│  │ API keys   │  │ at-most-once │  │  Ramp / Rate  │  │  (H1)        │  │
│  └────────────┘  └──────────────┘  └───────────────┘  └──────┬───────┘  │
│                                                              │ atesta   │
│  ┌──────────────────────────────────────────┐               │          │
│  │ BlockchainClient (Anchor IDL · devnet)   │               │          │
│  └────────────────────┬─────────────────────┘               │          │
└───────────────────────┼─────────────────────────────────────┼──────────┘
                        │                                     │
              ┌─────────▼─────────────────────────────────────▼──────────┐
              │  SOLANA DEVNET                                              │
              │  ┌────────────────────────────────────────────────────┐   │
              │  │  peragus_settlement  (Anchor · Rust)               │   │
              │  │  initialize_corridor · register_settlement_asset    │   │
              │  │  mint_from_attestation · settle                    │   │
              │  │  transfer_hook · revoke                            │   │
              │  │  set_wallet_status · pause / unpause               │   │
              │  └───────┬─────────────────────────────┬──────────────┘   │
              │          │                             │                  │
              │  ┌───────▼────────┐            ┌───────▼────────┐         │
              │  │ pgBRL (6 dec)  │            │ pyPYG (6 dec)  │         │
              │  │ Token-2022     │            │ Token-2022     │         │
              │  │ hook+metadata  │            │ hook+metadata  │         │
              │  │ +p.delegate    │            │ +p.delegate    │         │
              │  └────────────────┘            └────────────────┘         │
              │                                                                  │
              │  ┌──────────────────────┐                                      │
              │  │ tsUSD (vault,  │  ← pivô de settlement           │
              │  │ stablecoin    │
              │  │ de teste)     │
              │  │ party SPL Token)     │                                      │
              │  └──────────────────────┘                                      │
              └──────────────────────────────────────────────────────────────┘
                        │
                        │ attested reserve
              ┌─────────▼────────────────────────────────────────────────────┐
              │  PARCEIRO REGULADO  (fiat, off-chain, fora do repo)          │
              │  BRL em conta segregada · atesta saldo → mint authority      │
              └──────────────────────────────────────────────────────────────┘
```

---

## 9. Blockchain Architecture

| Aspecto | Decisão | Justificativa |
|---|---|---|
| Rede | **Devnet** | Escopo explícito do hackathon; nenhum caminho de mainnet no repo |
| Runtime | **Agave / Anchor** | Padrão do ecossistema, IDL gerado, tooling oficial |
| Programa | **Um** (`peragus_settlement`) | YAGNI. Dois programas duplicariam autoridade sem ganho |
| Token standard | **Token-2022** | SPL Token clássico **não permite** compliance: a transferência ocorre direto entre token accounts e o programa nunca é chamado |
| Autoridade de mint | **PDA do programa** | Nenhuma chave humana pode emitir |
| Custódia | **PDA vault** | Nenhuma chave humana move fundos |
| Preço on-chain | **Nenhum** | A cotação vem na atestação assinada. Feed on-chain é complexidade sem ganho |
| Ledger de saldos | **Nenhum** | SPL já é o ledger. Não reimplementar saldos |

### 9.1 A regra que torna a compliance real

Em Token-2022, um mint com transfer hook **exige** `TransferChecked` com as contas do hook. Uma instrução `Transfer` convencional falha com `MissingRequiredTransferHook`. Logo: **não existe caminho de transferência que evite `peragus_settlement::transfer_hook`**. Não é uma convenção; é uma impossibilidade estrutural do runtime.

---

## 10. Solana Programs

### 10.1 Programa: `peragus_settlement`

**ID (devnet):** `PERAGUS_SETTLEMENT_ID` — placeholder, definido em `Anchor.toml` no bootstrap.
**Upgrade authority:** chave de desenvolvimento (devnet). **Nunca** deve poder mover fundos.
**IDL:** `target/idl/peragus_settlement.json`, consumido pelo backend e pelo frontend.

### 10.2 Contas

| Conta | Seeds | Campos | Quem cria |
|---|---|---|---|
| `Corridor` | `[b"corridor", code]` | `admin: Pubkey`, `attester: Pubkey`, `rate_cap_bps: u16`, `fee_bps: u16`, `paused: bool`, `version: u8`, `bump: u8` | `initialize_corridor` |
| `SettlementAsset` | `[b"asset", corridor, iso]` | `mint: Pubkey`, `token_program: Pubkey`, `vault: Pubkey`, `decimals: u8`, `enabled: bool`, `is_fiat: bool`, `max_supply: u64`, `bump: u8` | `register_settlement_asset` |
| `Settlement` | `[b"settlement", operation_id]` | `operation_id: [u8;16]`, `payer`, `recipient`, `asset_in`, `amount_in: u64`, `asset_out`, `amount_out: u64`, `rate_q9: i128`, `spread_bps: u16`, `fee: u64`, `attestation_hash: [u8;32]`, `status: u8`, `created_at: i64`, `bump: u8` | `settle` |
| `Attestation` | `[b"attestation", hash]` | `kind: u8`, `payload_hash: [u8;32]`, `signer: Pubkey`, `consumed_at: i64`, `bump: u8` | `mint_from_attestation`, `settle`, `set_wallet_status` |
| `WalletRegistry` | `[b"wallet", owner]` | `status: u8`, `role: u8`, `kyc_ref: [u8;32]`, `registered_at: i64`, `bump: u8` | `set_wallet_status` |

`Corridor` é keyed por `code` desde o MVP → multi-corredor é **configuração**, não código novo.

`Settlement` é **imutável** após a criação: nunca é sobrescrito, apenas marcado `Revoked`.

**`token_program` por ativo.** O rail tem ativos em **dois token programs**: os mints próprios (`pgBRL`, `pyPYG`, `tsUSD`) pertencem ao Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`); o `USDT` de produção pertence ao SPL Token legado (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`). O campo é gravado no registro e **todo CPI de token lê o programa a partir dele** — nunca hardcoded. Ver §12.1.1.

**Escala de `rate_q9`.** A taxa nunca é `f64` em lugar nenhum. A atestação carrega `rate_q9: i128` = taxa × `10^9` (9 casas decimais). `Settlement.rate_q9` é o valor efetivamente aplicado. O Postgres guarda `rate numeric(20,10)` apenas para exibição; a conversão para `i128` acontece na fronteira de assinatura e é coberta por vetor de teste.

### 10.3 Enumerações

```rust
// WalletStatus
const STATUS_NONE: u8 = 0;
const STATUS_ALLOWED: u8 = 1;   // pode transacionar
const STATUS_BLOCKED: u8 = 2;   // transação rejeitada
const STATUS_REVOKED: u8 = 3;   // revogado; saldo elegível a burn

// WalletRole
const ROLE_NONE: u8 = 0;
const ROLE_PERAGUS: u8 = 1;
const ROLE_ACQUIRER: u8 = 2;
const ROLE_TREASURY: u8 = 3;

// SettlementStatus
const SETTLEMENT_ACTIVE: u8 = 0;
const SETTLEMENT_REVOKED: u8 = 1;

// AttestationKind
const ATTEST_MINT: u8 = 0;
const ATTEST_RATE: u8 = 1;
const ATTEST_WALLET: u8 = 2;
```

### 10.4 Instruções

#### I-1 `initialize_corridor(code, attester, rate_cap_bps, fee_bps)`
Autoridade: deployer. Cria o `Corridor`. Idempotente por PDA (segunda chamada reverte).

#### I-2 `register_settlement_asset(iso_code, mint, vault, decimals, is_fiat, max_supply)`
Autoridade: `Corridor.admin`. Valida que o **owner** de `mint` é um token program **registrado** (Token-2022 `TokenzQd…` ou SPL legado `Tokenkeg…` — nunca qualquer outro programa), que `vault` é um token account do mesmo mint **e do mesmo token program**, e que `decimals` bate com o mint. Grava `token_program` no registro. **Não exigir Token-2022**: o `USDT` de produção é SPL legado e seria rejeitado por um validador hardcoded. Ver §12.1.1.

#### I-3 `mint_from_attestation(destination, amount, payload, signature)`
Autoridade: **nenhuma** (permissionless, mas useless sem atestação válida).
1. Verifica assinatura ed25519 do `payload` contra `Corridor.attester`, com rehash e verificação de claim
2. Valida `claim.expiry > clock()`, `claim.amount > 0`, `claim.amount <= max_supply - mint.supply`
3. Valida `kind == MINT`, `claim.mint == asset.mint`, `claim.destination == destination`
4. **Cria** o `Attestation` PDA com `init` → se já existir, reverte (**anti-replay por construção**)
5. CPI `Token-2022::mint_to` com a PDA de mint authority via `invoke_signed`
6. Consome o nonce gravando `consumed_at`

#### I-4 `settle(operation_id, payer, recipient, asset_in, amount_in, asset_out, min_out, rate_payload, rate_signature)`
**Signer externo:** `payer` — quando `payer` é uma carteira externa. Quando `payer` é uma PDA do próprio programa (perna intermediária, §21.2), nenhum signer externo é exigido; a autorização vem de `invoke_signed`.
1. Deriva e valida o `Settlement` PDA com `init` → **um segundo settle para o mesmo `operation_id` reverte**
2. Valida `Corridor.paused == false`, ambos os ativos `enabled`
3. Verifica atestação de cotação (mesmo mecanismo de I-3): assinatura, `kind == RATE`, não consumida
4. Valida `rate_payload.expiry > clock()`, `spread_bps <= Corridor.rate_cap_bps`
5. Valida `payer` e `recipient` estão `STATUS_ALLOWED` em `WalletRegistry`
6. Valida `asset_out.vault` tem saldo ≥ `amount_out` calculado
7. **Ordem crítica: queima ANTES de transferir.** CPI `burn` do token de entrada a partir da conta do pagador. A autoridade de burn é `payer` quando externo (`invoke` normal) e a própria PDA quando interno (`invoke_signed`)
8. Calcula `amount_out` a partir de `rate_q9` com aritmética `checked_*` em `i128`/`u64`, aplica `fee_bps`; valida `amount_out >= min_out` (proteção contra slippage)
9. CPI `TransferChecked` de `asset_out.vault` para a conta do recebedor, **para `asset_out.token_program`** (não hardcoded) e com `asset_out.vault` como authority via `invoke_signed`
10. Grava `Settlement` imutável com `rate_q9` e o spread efetivamente aplicados

Se qualquer passo após 7 falhar, a transação inteira reverte e o estado anterior é restaurado. **É essa a propriedade que a demo evidencia.**

**Duas authorities diferentes, e por quê.** A perna 1 queima `pgBRL` da wallet do adquirente (authority = assinatura externa do adquirente); a perna 2 queima `tsUSD` do vault intermediário (authority = PDA, via `invoke_signed`). Uma única assinatura do adquirente cobre as duas porque ambas as instruções vivem na **mesma transação**. Implementar `settle` com um único caminho de authority seria bug; os dois caminhos são explícitos em §21.3 e cobertos por T-21.

#### I-5 `transfer_hook`
Invocado pelo Token-2022 em toda transferência de mint registrado.
1. Valida que o mint é um `SettlementAsset` registrado
2. Valida `Corridor.paused == false`
3. Valida `source.owner` **e** `destination.owner` estão `STATUS_ALLOWED`
4. Falha fechada: qualquer erro de registro bloqueia a transferência

**REGRA DE PROJETO INVARIANTE:** `transfer_hook` é **estrictamente read-only**. Não muta nenhum estado. Isso o torna reentrante-seguro por construção, o que é obrigatório porque ele é invocado via CPI de dentro do nosso próprio `settle` (Token-2022 → hook → Peragus). Ver §27.3.

#### I-6 `revoke(operation_id, reason_hash, signature)`
Autoridade: assinatura do `attester` via `Attestation` PDA.
1. Valida atestação de kind `WALLET`, não consumida
2. Usa o **permanent delegate** para queimar saldo sem assinatura do dono
3. Marca `Settlement.status = REVOKED` (única mutação permitida em `Settlement`)
4. **Limitação documentada:** se o off-ramp já pagou, o `revoke` queima o saldo pyPYG mas o crédito com o recebedor permanece. O resultado é um crédito a receber sem garantia. Ver §22.4.

#### I-7 `set_wallet_status(owner, status, role, kyc_ref, signature)`
Autoridade: assinatura do `attester`. Cria ou atualiza `WalletRegistry`. **Única forma de adicionar participante ao rail.**

#### I-8 `pause` / `unpause`
Autoridade: `Corridor.admin`. Bloqueia todos os `settle` e todas as transferências. Inclusive de emergência.

---

## 11. Smart Contract / Program Requirements

### 11.1 Requisitos funcionais

| ID | Requisito |
|---|---|
| PR-01 | Emitir token de fiat somente contra atestação ed25519 válida |
| PR-02 | Impedir replay de atestação por construção (PDA `init`) |
| PR-03 | Impedir double-settle por construção (PDA `Settlement` `init`) |
| PR-04 | Liquidar duas pernas atomicamente em uma transação |
| PR-05 | Aplicar teto de spread e expiração **on-chain** |
| PR-06 | Proteger contra slippage via `min_out` |
| PR-07 | Impor compliance em 100% das transferências |
| PR-08 | Permitir revogação para chargeback |
| PR-09 | Manter `Settlement` imutável após criação |
| PR-10 | Permitir pausa de emergência |

### 11.2 Requisitos não-funcionais

| ID | Requisito |
|---|---|
| NFR-01 | Toda aritmética monetária com `checked_add`/`checked_sub`/`checked_mul` |
| NFR-02 | Nenhum `unwrap()` em caminho alcançável por entrada de usuário |
| NFR-03 | CA consumível: `settle` completo ≤ 200k CU |
| NFR-04 | Nenhum account "remaining accounts" sem validação de owner e signer |
| NFR-05 | Todo PDA validado com `seeds` e `bump` canônicos, nunca aceito da entrada |
| NFR-06 | `token_program` validado no registro e lido em todo CPI — nunca hardcoded (Token-2022 ≠ SPL legado) |
| NFR-07 | `transfer_hook` não muta estado (ver PR-07 / §27.3) |
| NFR-08 | Upgrade authority separada de toda chave operacional |

### 11.3 Piso de CU por caminho

| Caminho | CU estimadas | Limite |
|---|---|---|
| `mint_from_attestation` | ~55k | 100k |
| `settle` (2 pernas, 2 TransferChecked + 2 hooks + burn) | ~140k | 200k |
| `transfer_hook` isolado | ~8k | 20k |
| `revoke` | ~35k | 80k |

---

## 12. Token Architecture

### 12.1 Ativos

| Ativo | Token program | Decimais | Papel | Emissor (dev) | Lastro (dev) |
|---|---|---|---|---|---|
| `pgBRL` | Token-2022 | 6 | Exposição em BRL do adquirente | PDA do programa | Simulado |
| `pyPYG` | Token-2022 | 6 | Float do adquirente na moeda do destino | PDA do programa | Simulado |
| `tsUSD` | Token-2022 | 6 | Ativo de settlement intermediário (pivô) | PDA do programa | Simulado |
| `USDT` | **SPL Token legado** | 6 | **Produção:** pivô de settlement | Tether (3rd party) | US$ |

### 12.1.1 O pivô de settlement em devnet: `tsUSD`, não USDT

**Achado verificado em 2026-09-25 contra o RPC público.** Este é o único ponto do spec em que a pesquisa de campo contraria a premissa original, e ele é bloqueador de implementação.

O que a verificação retornou:

```
mainnet-beta  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
  owner   = TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA   (SPL Token legado)
  decimals= 6 · supply = 3.839.903.676.857.834

devnet      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
  owner   = 11111111111111111111111111111111   (System Program)
  → NÃO É UM MINT. Conta de sistema, sem supply.
```

Duas consequências, ambas materiais:

**1. Não existe USDT canônico em devnet.** O endereço popular resolve para uma conta do System Program. Qualquer plano de demo que dependa dele falha no primeiro `settle`. Não há faucet de USDT em devnet de forma confiável.

**2. O USDT real em mainnet é SPL Token legado, não Token-2022.** Consequentemente, o mint do USDT **não tem** `TransferFeeConfig`, **não tem** `TransferHook`, **não tem** `PermanentDelegate` e **não tem** `DefaultAccountState`. CPI para ele é um `TransferChecked` limpo.

**Decisão:** em devnet, o pivô é `tsUSD` — **stablecoin de teste** criada pelo bootstrap, com mint authority PDA do programa, lastro simulado e declarado. Mantém-se a estrutura de duas pernas (`pgBRL → tsUSD → pyPYG`), que é o que demonstra a atomicidade. O símbolo `tsUSD` ("test USD") existe precisamente para que ninguém confunda com USDT real.

**Impacto arquitetural (o ponto positivo):** como o rail tem ativos de **dois token programs diferentes**, o programa **precisa** ser program-agnostic a nível de token program, e isso é exatamente a propriedade de robustez que um asset-agnostic rail precisa ter. Ver §10.2 (`token_program` por ativo), §10.4 I-2 e §10.4 I-4.

### 12.2 Por que 6 decimais em tudo

Dezimais divergentes entre as pernas são fonte clássica de bug de precisão e de erro de arredondamento silencioso. O USDT canônico na Solana também é 6. Uniformizar 6/6/6 elimina uma classe inteira de bugs a custo da semântica de "centavos" do real. **Tradeoff aceito conscientemente e documentado.**

### 12.3 Extensões Token-2022

| Extensão | `pgBRL` | `pyPYG` | Justificativa |
|---|---|---|---|
| **Transfer Hook** | Sim | Sim | Compliance. Obrigatória. Sem ela o projeto não tem propósito |
| **Metadata Pointer** | Sim | Sim | Permite identidade do ativo on-chain |
| **Token Metadata** | Sim | Sim | Nome/símbolo/URI + política de reserva |
| **Permanent Delegate** | Sim | Sim | Usado **apenas** em `revoke` |
| ~~Default Account State~~ | Não | Não | Redundante com o hook e adiciona risco de deadlock no onboarding |
| ~~Transfer Fee~~ | Não | Não | Semântica errada para ativo de settlement; taxa vai na config do settlement |
| ~~Confidential Transfer~~ | Não | Não | Não está ativo em mainnet |
| ~~Non-Transferable~~ | Não | Não | Anula o propósito |
| ~~Interest Bearing~~ | Não | Não | Fora de escopo |

### 12.4 Conteúdo dos metadados on-chain

Os metadados de `pgBRL` e `pyPYG` devem declarar, de forma legível por máquina:

```json
{
  "name": "Peragus BRL (Devnet)",
  "symbol": "pgBRL",
  "assetClass": "permissioned-fiat-representation",
  "fullyBacked": false,
  "environment": "devnet",
  "notice": "NOT BACKED BY ANY REAL FIAT. DEVNET TEST TOKEN. NO REDEMPTION.",
  "reserveAttestationAuthority": "<attester pubkey>",
  "transferPolicy": "allowlist-only; enforced by peragus_settlement::transfer_hook",
  "revocableBy": "peragus_settlement::revoke (permanent delegate)"
}
```

Esta é uma **decisão de compliance operacional**: o token declara na chain que não tem lastro. Um token de teste em devnet que fingisse ser lastreado é um risco de imagem e de leitura regulatória.

---

## 13. Fiat Tokenization Model

### 13.1 O modelo

`pgBRL` é uma **representação tokenizada de exposição em BRL_lastreada 1:1 contra BRL retido em conta segregada** por um parceiro regulado. Não é uma stablecoin pública. É um ativo permissionado de circuito fechado.

Três propriedades definem o modelo:

1. **Permissionado.** Apenas carteiras em `WalletRegistry` com `STATUS_ALLOWED` podem transacionar. Não há caminho de saída do circuito.
2. **Lastreado fora da chain.** O lastro é fiat off-chain. A chain carrega a *representação* e o *mecanismo de verificação* do lastro, não o fiat.
3. **Emissão condicionada.** A mint authority é o programa, e o programa só emite contra atestação ed25519 do atester, com `amount` e `expiry` verificados on-chain.

### 13.2 Por que não é "só mais um token"

Sem uma razão de mercado, `pgBRL` seria um token inútil. Ele tem três:

| Razão | Concretização |
|---|---|
| É o **ativo de liquidação do rail** | O programa é asset-agnostic; `pgBRL` é a primeira linha da tabela. Registra `pyPYG` como a segunda |
| É a **unidade de lastro auditável** | Supply on-chain é comparável a uma atestação de reserva assinada, publicamente verificável |
| É o **veículo de compliance** | A allowlist e a revogação só são implementáveis porque o ativo é um mint Token-2022 controlado |

### 13.3 O que muda em produção

| Aspecto | Devnet (MVP) | Produção |
|---|---|---|
| Atester | Chave de desenvolvimento da Peragus | Parceiro regulado, chave em HSM |
| Lastro | Simulado, declarado nos metadados | Conta segregada real, atestação diária |
| `max_supply` | Alto, para não travar a demo | Teto refletindo capital e licença |
| Emissor jurídico | Peragus (desenvolvimento) | Instituição licenciada; Peragus é fornecedora de tecnologia |
| Deploy | Devnet | Mainnet, após §37 |

---

## 14. Mint/Burn Logic

### 14.1 Mint

```
gatilho: confirmação de crédito BRL pelo parceiro regulado
  ↓
backend monta payload canônico:
  { kind: MINT, corridor, mint, destination, amount, op_ref, expiry, nonce }
  ↓
attester assina em ed25519
  ↓
backend envia mint_from_attestation
  ↓
PROGRAMA verifica, on-chain:
  ✓ assinatura do attester (pubkey do Corridor)
  ✓ expiry > now
  ✓ amount > 0
  ✓ amount <= max_supply - supply_atual
  ✓ mint e destination conferem com o payload
  ✓ PDA Attestation NÃO EXISTE  ← anti-replay
  ↓
CPI mint_to com a PDA de mint authority
```

**Pré-condições de negócio (fora da chain, mas obrigatórias):** o BRL deve estar **irrevogavelmente creditado** na conta segregada antes da atestação ser assinada. O atester é o ponto de controle; o programa é a rede de segurança.

### 14.2 Burn

| Gatilho | Mecanismo | Assinatura do dono? |
|---|---|---|
| Settle (consumo da pata de entrada) | CPI `burn` normal | **Sim** — o pagador assina |
| **Revoke (chargeback)** | **Permanent delegate** | **Não** — programa agindo sozinho |
| Resgate | CPI `burn` normal | Sim |

A distinção é deliberada: `settle` não usa o permanent delegate. O poder de queimar sem consentimento existe **apenas** para revogação, que é o único caso em que o owner não pode (ou não deve) consentir.

### 14.3 Invariante de supply

```
[ invariante por ativo — somar supplies de moedas diferentes não significa nada ]

∀ asset a:
    supply(a) == Σ minted(a) − Σ burned(a)          [ ledger SPL é a fonte da verdade ]
    supply(a) ≤ max_supply(a)                       [ defense contra attester comprometido ]
```

Não há passivo pendente: as pernas são atômicas, então `settle` entrega imediatamente. O vault só precisa ter saldo no momento da execução, verificado no passo 6 de I-4. O `max_supply` em `SettlementAsset` é a defesa contra um atester comprometido expandir o passivo.

A segunda linha é o que o teste de invariante (T-20) exercita com N operações aleatórias.

---

## 15. Authority Model

| Papel | Chave | Onde vive | Pode | Não pode |
|---|---|---|---|---|
| **Upgrade do programa** | Multisig (dev: chave de dev) | Squads (dev: local) | `upgrade` | **Mover fundos. Emitir.** Nunca |
| `Corridor.admin` | Hot wallet Peragua | Backend | Registrar ativos, pausar | Assinar atestações (chave separada) |
| `attester` | ed25519 (dev: Peragus; **prod: parceiro**) | Backend / HSM | Assinar lastro, cotação, allowlist | Pausar, mover fundos |
| **Adquirente** | Wallet corporativa | Cliente | Assinar `settle` | Emitir, pausar, listar |
| **Vault** | **PDA** | On-chain | **Só o programa move** | — |

### 15.1 Regras inegociáveis

1. **Nenhuma chave humana move o vault.** Só o programa, e só em `settle` (com assinatura do pagador) ou `revoke`.
2. **`admin` e `attester` são chaves distintas.** Se o admin vazar, o atacante pausa o sistema; não consegue emitir lastro falso.
3. **A upgrade authority nunca é chave operacional.**
4. **O transferable hook nunca muta estado.**

### 15.2 Matriz de separation of duties

| Incidente | Impacto com SoD | Impacto sem SoD |
|---|---|---|
| Vazamento da chave `admin` | Sistema pausado. Raiz não aí | Pause |
| Vazamento da chave `attester` | Emissão de lastro falso até o teto de supply | Pause + lastro falso |
| Vazamento da wallet do adquirente | Assina settlements indevidos | Idem |
| Comprometimento do upgrade authority | **Catastrófico** — pode substituir o programa | Idem |

---

## 16. Wallet Architecture

### 16.1 Carteiras no sistema

| Carteira | Tipo | Papel |
|---|---|---|
| Attester | ed25519 off-chain | Assina atestações. **Nunca** assina transação on-chain |
| Admin | Keypair Solana | Registra ativos, pausa. **Nunca** assina atestação |
| Vault (3x) | PDA | `pgBRL`, `pyPYG`, `tsUSD`. Só o programa move |
| Adquirente | Keypair Solana | Assina `settle`. Wallet corporativa em devnet; multisig em produção |
| Deployer | Keypair Solana | Deploy inicial, `initialize_corridor`. Perde poder após bootstrap |
| Treasury dev | Keypair Solana | Airdrop, taxas de teste. Nunca entra em vault |

### 16.2 Endereços (devnet, placeholders)

| Variável | Endereço |
|---|---|
| `PROGRAM_ID` | a definir em `Anchor.toml` |
| `ADMIN_PUBKEY` | a definir |
| `ATTESTER_PUBKEY` | a definir |
| `PGBR_MINT` | bootstrap |
| `PYPYG_MINT` | bootstrap |
| `TSUSD_MINT` | bootstrap (stablecoin de teste do devnet) |
| `USDT_MINT` | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` — **mainnet apenas**; não existe em devnet (§12.1.1) |
| `TOKEN_2022_PROGRAM` | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| `TOKEN_LEGACY_PROGRAM` | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |

Todos em `.env` do backend. **Nunca** em variáveis `VITE_*` — elas são embutidas no bundle do navegador.

### 16.3 Onboarding de participante

```
set_wallet_status(attester-signed) → STATUS_ALLOWED
  ↓
criar token account para pgBRL/pyPYG
  ↓
transações passam pelo transfer_hook
```

O onboarding é **exclusivamente** por `set_wallet_status`. Não há caminho alternativo. É essa exclusividade que torna a allowlist auditável.

---

## 17. BaaS Integration

### 17.1 Papel do BaaS

OZAV atua como **parceiro de rail de fiat e provedor institucional de primeira linha** no perímetro da Peragus. A Peragus não constrói um BaaS e não deve.

Funções no sistema:

| Função | Quem executa |
|---|---|
| Coleta de PIX | OZAV (`FiatRailProvider`) |
| Confirmação de crédito | OZAV (webhook assinado) |
| Assentamento de saldo BRL | Parceiro regulado (conta segregada) |
| Emissão de atestação de lastro | OZAV/parceiro (chave `attester`) |
| Mint de `pgBRL` | Programa Peragus, sob atestação |
| Liquidação on-chain | Programa Peragus |
| Off-ramp PYG | `OffRampProvider` |

### 17.2 A fronteira regulatória

OZAV é BaaS e provedor de liquidez. A Peragus opera a camada de liquidação tokenizada. **A Peragus não é instituição emissora e não é contraparte regulada do cliente final** — em produção, a instituição licenciada é. A Peragus é fornecedora de infraestrutura. Ver §37.

### 17.3 Interface `FiatRailProvider`

```typescript
export interface FiatRailProvider {
  /** Cria uma cobrança de entrada em fiat. Retorna referência + payload. */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>

  /** Consulta o status de uma cobrança. Usado em retry e reconciliação. */
  getChargeStatus(externalId: string): Promise<ChargeStatus>

  /** Confirmação consumida pelo webhook. Implementações mock ignoram a assinatura. */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): WebhookVerification

  /** Saldo de reserva declarado pelo parceiro, para o painel de lastro. */
  getReserveBalance(asset: string): Promise<ReserveBalance>
}
```

**Implementações:** `OzavFiatRailProvider` (**INTEGRAÇÃO** — API real, não construída no MVP) e `MockFiatRailProvider` (**MOCK** — gera BR Code EMV válido + webhook HMAC, acionado por botão na demo).

### 17.4 Idempotência da integração

- `request_id` do cliente é propagado ao parceiro como chave de idempotência
- `webhook_events` grava `external_id` único antes de processar → webhook duplicado é ignorado
- Payloads de webhook são gravados por hash; payload alterado após o fato gera alerta

---

## 18. Acquirer Integration

### 18.1 Papel do adquirente

O adquirente é o **cliente e o signer on-chain principal**. Ele recebe a exposição em BRL, recebe `pgBRL`, e assina a liquidação.

### 18.2 Posição no fluxo

```
Consumidor → POS → Adquirente (sistema do cliente)
                        │
                        ├── API REST (API key) ──► Peragus
                        │                              │
                        │                    mint pgBRL, assina settle
                        │                              │
                        ◄── pyPYG delivered ───────────┘
                        │
                        └── off-ramp (a definir) ──► PYG
```

A Peragus entra **depois** da marcação da venda. A Peragus não processa a transação do cartão; ela liquida o resultado.

### 18.3 O contrato com o adquirente

| Aspecto | Decisão MVP | Produção |
|---|---|---|
| Integração | **API REST com API key** | Idem + mTLS |
| Assinatura | **Wallet corporativa (Phantom em devnet)** | **Multisig (Squads)** |
| KYC do adquirente | Handled pelo Peragus (`set_wallet_status` exige `kyc_ref`) | KYC/KYB completo com KYB e beneficiários finais |
| SLA | Nenhum (devnet) | Latência de liquidação contratual |
| Confiabilidade | Best-effort | Reconciliação e SLA monitorados |

### 18.4 Integração com maquininha

**Fora do escopo do MVP.** O POS/maquininha é sistema do adquirente. A Peragus integrate via API, não driver de terminal. Se o adquirente quiser aceitar PIX de turistas, isso é capacidade dele; a Peragus liquida.

---

## 19. On-Ramp

**Definição:** fiat → ativo tokenizado on-chain.

```
BRL em conta bancária
  ↓  (PIX do consumidor, liquidado pelo parceiro)
BRL creditado em conta segregada do parceiro
  ↓  (confirmação → atestation)
atesta saldo → assina atestação de lastro
  ↓  (mint_from_attestation)
pgBRL no cofre do adquirente
```

| Etapa | On-chain | Off-chain |
|---|---|---|
| Coleta PIX | Não | Sim — OZAV |
| Confirmação de crédito | Não | Sim — OZAV |
| Atestação de lastro | Não (assinatura off-chain, verificada on-chain) | Sim |
| Emissão de `pgBRL` | **Sim** | Não |

### 19.1 Regras do on-ramp

1. Nunca emitir sem confirmação de crédito **irrevogável**
2. Nunca emitir sem atestação assinada com `amount` e `expiry`
3. Nunca reemitir para a mesma atestação
4. Nunca ultrapassar `max_supply`
5. Em caso de dúvida, falhar fechado — não emitir é o estado seguro

---

## 20. Off-Ramp

**Definição:** ativo tokenizado → fiat na conta do recebedor.

```
pyPYG no cofre do adquirente
  ↓  (POST payout — a Peragus não força; o adquirente decide o momento)
OffRampProvider converte e paga
  ↓
PYG creditado na conta do recebedor
```

### 20.1 Propriedade de design importante

O off-ramp **não é obrigatório nem automático**. O adquirente recebe `pyPYG` na hora e **decide quando** converter. Isso transforma `pyPYG` de token ornamental em **float operacional on-chain**, e é o que dá função real ao segundo token do MVP.

### 20.2 Interface `OffRampProvider`

```typescript
export interface OffRampProvider {
  /** Cotação de pyPYG → PYG. */
  quote(input: OffRampQuoteInput): Promise<OffRampQuote>

  /** Executa o payout. Idempotente por operation_id. */
  payOut(input: OffRampPayoutInput): Promise<OffRampResult>

  /** Consulta o status de um payout. */
  getPayoutStatus(payoutId: string): Promise<OffRampStatus>
}
```

**Implementações:** `DLocalOffRampProvider` (**INTEGRAÇÃO** — API pública e documentada para payout em PYG; ver §20.3) e `MockOffRampProvider` (**MOCK** — conversão e payout simulados, com latência artificial de 3s para tornar o estado `offramping` visível na demo).

### 20.3 Parceiro de off-ramp: dLocal (Q-01 resolvido)

**A lacuna está resolvida.** OZAV não cobre PYG, mas a busca por um PSP paraguaio encontrou um operador transfronteiriço que cobre **as duas pontas**.

**dLocal** publica uma API de payout para o Paraguai (`docs.dlocal.com/docs/paraguay-payouts-v3`, atualizado 2026-08-26). Superfície verificada:

| Parâmetro | Valor |
|---|---|
| `country` | `PY` |
| `currency` | `PYG` — ou `USD` como moeda de origem, com payout em moeda local |
| `currency_to_pay` | Opcional; ausente ⇒ pago em PYG. `USD` explícito para pagar em dólar |
| `payment_method_id` | `BANK_TRANSFER` |
| `flow_type` | `B2C`, `B2B`, `P2P` |
| `purpose` | Obrigatório, via tabela de purpose codes do dLocal |
| `beneficiary.document.type` | `CI` (7–8 dígitos) ou `RUC` (6–9 dígitos) |
| `beneficiary.bank_account.account` | SIPAP, 16 dígitos numéricos |
| `beneficiary.bank_account.code` | Tabela de 30 bancos (Atlas, BASA, Continental, Itaú PY, Sudameris…) |
| `amount` | Até 2 casas decimais |

Fluxo `B2B` — que é o nosso caso, de adquirente para beneficiário — exige `beneficiary.business_name` em vez de nome e sobrenome, e **não** exige dados do pagador (`remitter.*`). Isso simplifica o payload: a Peragus não precisa coletar a identidade do remetente para payout B2B.

Três consequências arquiteturais:

**1. O `currency` de origem pode ser `USD`.** É a conexão com o pivô: entregamos o equivalente em stablecoin, o dLocal liquida o FX e paga em PYG na conta SIPAP do beneficiário. O `OffRampProvider` do spec (§20.2) mapeia diretamente para este payload.

**2. dLocal cobre também a ponta de entrada.** dLocal opera no Brasil. Isso significa que **dLocal pode substituir o OZAV como contraparte único** das duas pernas de fiat — simplificando o grafo de parceiros de dois para um. Trade-off: concentração de contraparte, e dLocal é potencialmente concorrente de um rail de liquidação. **Decisão pendente: OZAV + dLocal (diversificação) ou dLocal apenas (simplicidade).** Ver §44 Q-11.

**3. Alternativas verificadas, caso dLocal não seja viável:** `LocalPayment` (PYG via SIPAP, tempo real 24/7, faixa PYG 1,00–5.000.000) e `Triple-A` (payout PYG em conta bancária, T+1). Nenhuma das duas é preferível à dLocal; ambas são fallback.

**O que ainda falta para fechar de vez (comercial, não técnico):** onboarding KYB com dLocal, tabela de taxas e spread, e confirmação de SLA e limites no Paraguai — a documentação pública cobre o formato do payload, não o preço nem o acordo de nível de serviço.

---

## 21. Settlement Flow

### 21.1 Cotação

```
GET /v1/quote?in=BRL&out=PYG&amount=1000000
  ↓
RateOracle obtém a taxa de mercado
  ↓
backend assina atestação de cotação:
  { kind: RATE, pair, rate, spread_bps, amount_in, min_out, expiry, nonce }
  ↓
resposta: amount_in, amount_out, rate, spread_bps, expiry, attestation_hash
```

A cotação é **assinada antes** de ir para a chain. O programa verifica assinatura, expiração e teto de spread. O backend **não pode** forçar spread acima do teto on-chain.

### 21.2 A transação de settlement

**Uma transação, duas instruções `settle`:**

```
TX (uma única assinatura: wallet corporativa do adquirente)
│
├─ SettleInstruction #1
│   operation_id = uuid1  (BRL → stable)
│   payer      = adquirente          ← signer EXTERNO
│   recipient  = vault tsUSD
│   asset_in   = pgBRL, amount_in = R$ 10.000,00
│   asset_out  = tsUSD,  min_out = calculado
│   burn authority = assinatura do adquirente
│
└─ SettleInstruction #2
    operation_id = uuid2  (stable → PYG)
    payer      = vault tsUSD          ← PDA do programa, invoke_signed
    recipient  = adquirente
    asset_in   = tsUSD,  amount_in = saída de #1
    asset_out  = pyPYG, min_out = calculado
    burn authority = invoke_signed da PDA

→ 2 Settlement PDA, 4 transferências internas, tudo atômico
```

**Repare na assimetria de authority.** A perna 1 exige a assinatura do adquirente; a perna 2 é executada pelo próprio programa. Uma única assinatura cobre as duas porque estão na **mesma transação** — e é exatamente isso que torna a atomicidade útil em vez de decorativa. Detalhado em §10.4 I-4.

### 21.3 Propriedades garantidas

| Propriedade | Como é garantida |
|---|---|
| Sem stablecoin em mãos intermediárias | A instrução #1 entrega direto ao vault; não existe conta de repouso entre as pernas |
| Atomicidade | Uma transação. Falha em #2 reverte #1 |
| Anti-double-settle | PDA `Settlement` com `init` e `operation_id` único (um por perna) |
| Slippage protegido | `min_out` verificado on-chain contra a atestação, nas duas pernas |
| Spread limitado | `rate_cap_bps` no `Corridor`, verificado on-chain, nas duas pernas |
| Auditable | Dois `Settlement` imutáveis + hash da atestação |

### 21.4 Rollback demonstrável

Para a demo, `settle` valida `asset_out.vault.balance >= amount_out` e o valor vem da **configuração de demonstração**, ajustável para forçar insuficiência. Com a liquidez do vault de `pyPYG` abaixo do necessário, a transação reverte inteira e o `pgBRL` do adquirente permanece intacto. Este é o momento que converte um jurado — e deve ser roteirizado.

---

## 22. Reconciliation

### 22.1 Modelo de lastro

```
[ por ativo, nunca somado entre ativos diferentes ]

pgBRL.supply  ==  BRL retido em conta segregada  (parceiro regulado)  ← MOCK em devnet
pyPYG.supply  ==  PYG retido pelo parceiro de off-ramp               ← MOCK em devnet; dLocal em produção (§20.3)
tsUSD.supply  ==  US$ declarados pelo parceiro de liquidez            ← MOCK em devnet

[ por vault, não é reserva — é liquidez operacional ]
tsUSD.vault.balance >= amount_out da próxima perna (verificado em tempo de execução)
```

**Os quatro primeiros são simulados em devnet.** O painel de reserva existe para tornar a *mecânica* de verificação visível e auditável, não para provar lastro — que em devnet não existe. A distinção está rotulada em §32.2 (M-01) e no próprio painel (§29 do frontend, SOL-029). Misturar essas duas ideias é exatamente o erro que o §32.4 proíbe.

### 22.2 Responsabilidade

| Papel | Responsável |
|---|---|
| Lastro e sua verificação | **Parceiro regulado** assina; **Peragus** verifica e publica |
| Emissão (mint) | Programa, sob atestação do parceiro |
| Queima | Programa, por settle ou revoke |
| Reconciliação periódica | Backend Peragus, comparando chain ↔ atestado |
| Resolução de divergência | Peragus, com congelamento do corredor se grave |

### 22.3 Job de reconciliação

```
Diário, ou on-demand:
  1. Ler supply de cada SettlementAsset on-chain
  2. Buscar saldo declarado pelo parceiro
  3. Comparar; persistir em `reserves` (idempotente por asset+timestamp)
  4. |delta| > 0 → alerta
  5. |delta| > 1% do supply → pause automático do corredor + alerta crítico
```

### 22.4 Casos difíceis, declarados

| Caso | Tratamento |
|---|---|
| **Chargeback com dinheiro já pago** | `revoke` queima o saldo `pyPYG`, mas o crédito com o recebedor permanece. **É uma exposição de crédito sem garantia.** A spec não finge que chargeback é reversão limpa |
| Transação pendente com hash | `settling` preservado; worker consulta a chain; retoma em `confirmed`/`failed` |
| Transação pendente sem hash | `SETTLEMENT_RECONCILIATION_REQUIRED` (409), intervenção manual |
| PIX confirmado mas mint falha | Operação fica em `pix_confirmed`; mint retenta; BRL já está segregado |
| Off-ramp falha após settlement | `settled` com `pyPYG` entregue. Off-ramp retenta com backoff. **A liquidação on-chain é completa antes de qualquer off-ramp** |
| Attester fora do ar | Nenhuma emissão nova. Liquidações existentes seguem |
| Divergência de lastro | Alerta; pausa do corredor se > 1% |

---

## 23. Backend Architecture

### 23.1 Stack

| Camada | Escolha | Razão |
|---|---|---|
| Runtime | Node.js 20 LTS | Dois devs + IA; ecossistema maduro |
| Linguagem | **TypeScript, modo strict** | Tipos compartilhados gerados do IDL do Anchor evitam drift entre programa e cliente |
| Framework | **Fastify** | Validação de schema embutida, JSON schema nativo, rápido |
| Banco | **Postgres (Supabase, projeto novo)** | Auth + Postgres na mesma conta; sem cold start de infraestrutura |
| Fila | **pg-boss** | Postgres-nativa, sem Redis. Settlement exige worker durável |
| Solana | `@coral-xyz/anchor` + `@solana/spl-token` | IDL gerado oficial |
| Validação | **Zod** | Inferência de tipos + runtime |
| Testes | **Vitest** | Alinhado ao stack TS |

### 23.2 Módulos

```
backend/
  src/
    index.ts              bootstrap
    config/               env validado com Zod (fail-fast)
    db/                   pool, migrations, repositórios
    auth/                 JWT Supabase, API keys (SHA-256)
    domain/
      state-machine.ts    transições válidas
      operation.ts        entidade
      settlement.ts       coordinateSettlement (at-most-once)
    adapters/
      fiat-rail/          FiatRailProvider: ozav.ts · mock.ts
      off-ramp/           OffRampProvider: paraguay.ts · mock.ts
      rate-oracle/        RateOracle: feed.ts · fixed.ts
      chain/              BlockchainClient
    attestations/         canonicalização + assinatura ed25519 + verificação
    workers/              settlement-reconciler · reserve-reconciler · webhook
    api/                  rotas Fastify, error handler
  tests/
```

### 23.3 Responsabilidades de fronteira

| Módulo | Pode tocar a chain? | Pode assinar atestação? |
|---|---|---|
| `api` | Não | Não |
| `domain` | Não | Não |
| `attestations` | Não | **Sim** |
| `adapters/chain` | **Sim** | Não |
| `workers` | Via `adapters/chain` | Via `attestations` |

Nenhum módulo exceto `adapters/chain` constrói transação. Isso mantém a superfície de assinatura auditável.

---

## 24. Frontend Architecture

### 24.1 Stack

| Camada | Escolha | Razão |
|---|---|---|
| Framework | **React 19 + Vite** | Alinhado ao repositório existente; mesma linguagem visual = mesma empresa |
| Estilo | **Tailwind 4** + Radix | Idem |
| Tipografia | **Manrope + IBM Plex Mono** | Idem — números em mono |
| Wallet | **@solana/wallet-adapter** | Padrão do ecossistema |
| Dados | TanStack Query | Polling de status, cache, invalidação |
| i18n | pt-BR / en | Mínimo viável |

### 24.2 Telas

| Tela | Rota | Função |
|---|---|---|
| **Operação — criar** | `/operations/new` | Registra a venda, dispara on-ramp, mostra a evolução |
| **Operação — detalhe** | `/operations/:id` | Timeline, assinaturas, links do explorer, CTA de assinar |
| **Operações — lista** | `/operations` | Filtro por status, corridor, período |
| **Painel de reserva** | `/reserve` | Supply on-chain vs. atestação de reserva, com divergência |
| **Conexão de wallet** | modal | Conectar/desconectar, Phantom em devnet |

### 24.3 A tela que importa

A tela de detalhe da operação é o produto. Ela mostra:

```
OPERAÇÃO 7f3a…c91
Corredor BR-PY · BRL → PYG

● awaiting_pix     R$ 10.000,00      14:02:11
● pix_confirmed    BRL creditado     14:02:44
● tokenized        pgBRL emitido     14:02:46   [tx: 4xF…] ↗
○ settling         aguardando assinatura do adquirente
○ settled
○ paid_out

PROVA
Atestação de lastro   sha256:a3f1…  assinado por ed25519:7Hq…  expira 14:17
Atestação de cotação   sha256:b8c2…  spread 45 bps  expira 14:12
Settlement #1  8jD…  Settlement #2  2mN…   [explorer ↗] [explorer ↗]
```

### 24.4 Regra de honestidade da UI

A UI **deve** exibir, de forma visível e não-dispensável:

- Selo `DEVNET` em todas as telas que tocam a chain
- Texto "sem lastro" no painel de reserva
- Distinção visual entre componentes MOCK e REAIS na tela de payout

O objetivo é que nenhum jurado conclua que há lastro real ou payout real.

---

## 25. Database Schema

```sql
-- ═══ ORGANIZAÇÕES E USUÁRIOS ═══
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country       char(2) not null,
  status        text not null default 'active'
                check (status in ('active','suspended','closed')),
  created_at    timestamptz not null default now()
);

create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role          text not null default 'operator'
                check (role in ('owner','operator','viewer')),
  created_at    timestamptz not null default now()
);

-- ═══ API KEYS ═══
create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name          text not null,
  key_hash      text unique not null,        -- sha256 hex; a chave crua nunca é persistida
  key_prefix    text not null,               -- 12 primeiros chars, para exibição
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index on api_keys (organization_id) where revoked_at is null;

-- ═══ ADQUIRENTES ═══
create table acquirers (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name          text not null,
  country       char(2) not null,
  wallet_pubkey text unique not null,
  kyc_ref       text,
  status        text not null default 'pending'
                check (status in ('pending','active','suspended')),
  created_at    timestamptz not null default now()
);

-- ═══ OPERAÇÕES ═══
create table operations (
  id                    uuid primary key default gen_random_uuid(),
  request_id            text not null,          -- chave de idempotência do cliente
  acquirer_id           uuid not null references acquirers(id),
  corridor              text not null default 'BR-PY',
  asset_in              text not null default 'BRL',
  amount_in_atomic      bigint not null check (amount_in_atomic > 0),
  asset_out             text not null default 'PYG',
  amount_out_atomic     bigint not null check (amount_out_atomic > 0),
  rate                  numeric(20,10) not null,
  spread_bps            int not null check (spread_bps >= 0),
  fee_atomic            bigint not null default 0,
  recipient_wallet      text not null,
  status                text not null default 'created',
  pix_charge_id         text,
  pix_txid              text,
  mint_tx_signature     text,
  settle_tx_signature   text,
  attestation_mint_hash text,
  attestation_rate_hash text,
  payout_reference      text,
  error_code            text,
  error_detail          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint operations_request_id_uniq unique (acquirer_id, request_id)
);
create index on operations (acquirer_id, created_at desc);
create index on operations (status) where status not in ('paid_out','failed','revoked');

-- Constraint de status (máquina de estados)
alter table operations add constraint operations_status_check
  check (status in ('created','awaiting_pix','pix_confirmed','tokenized',
                    'settling','settled','offramping','paid_out',
                    'failed','revoked'));

-- ═══ TIMELINE DE AUDITORIA ═══
create table operation_events (
  id            bigserial primary key,
  operation_id  uuid not null references operations(id) on delete cascade,
  status        text not null,
  actor         text not null,               -- 'acquirer' | 'peragus' | 'system' | 'chain'
  detail        jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index on operation_events (operation_id, created_at);

-- ═══ SETTLEMENTS (espelho do on-chain) ═══
create table settlements (
  id               uuid primary key default gen_random_uuid(),
  operation_id     uuid not null references operations(id) on delete cascade,
  leg              int not null check (leg in (1,2)),
  settlement_pubkey text unique not null,
  onchain_status   int not null default 0,    -- 0=active 1=revoked
  revoked_at       timestamptz,
  revoke_reason_hash text,
  created_at       timestamptz not null default now(),
  constraint settlements_operation_leg_uniq unique (operation_id, leg)
);

-- ═══ RESERVAS ═══
create table reserves (
  id               bigserial primary key,
  asset            text not null,
  onchain_supply   numeric(38,6) not null,
  reserve_amount   numeric(38,6) not null,
  delta            numeric(38,6) not null,
  attester_signer  text not null,
  attestation_hash text not null,
  valid_until      timestamptz not null,
  checked_at       timestamptz not null default now(),
  constraint reserves_asset_time_uniq unique (asset, checked_at)
);

-- ═══ INGESTÃO DE WEBHOOK (idempotência) ═══
create table webhook_events (
  id            bigserial primary key,
  provider      text not null,
  external_id   text not null,
  payload_hash  text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  constraint webhook_events_uniq unique (provider, external_id)
);
```

### 25.1 RLS

Todas as tabelas com RLS habilitado. `organizations` é a fronteira: o usuário enxerga apenas a própria organização. `api_keys` nunca retorna `key_hash` para o cliente. Operations, events, settlements e reserves são visíveis apenas à organização dona. `webhook_events` é inacessível via API — escrita apenas por service role.

---

## 26. API Specification

Base: `/v1`. Todas as respostas JSON. Autenticação: `Authorization: Bearer pk_live_...`.

> **Convenção de unidade.** Todos os três ativos usam **6 decimais** (§12.2). Portanto `*Atomic` é sempre a quantia em **unidades atômicas** (base units), não centavos. `R$ 10.000,00` = `10_000 × 10^6` = `10_000_000_000`. Os exemplos abaixo usam taxa `1_155` (PYG por BRL) e `spreadBps: 45`, coerentes com o mercado de §2.3.

### 26.1 `POST /v1/operations`

Cria uma operação de liquidação.

```jsonc
// Request
{
  "requestId": "acq-2026-09-25-0001",   // obrigatório; chave de idempotência
  "assetIn": "BRL",
  "amountInAtomic": 10000000000,       // R$ 10.000,00  (10.000 × 10^6)
  "assetOut": "PYG",
  "recipientWallet": "9xQe…",           // wallet corporativa do adquirente
  "externalRef": "sale-88412"            // referência do adquirente
}
```

```jsonc
// 201 Created
{
  "id": "7f3a1c2e-…-c91",
  "status": "awaiting_pix",
  "corridor": "BR-PY",
  "amountInAtomic": 10000000000,
  "assetIn": "BRL",
  "payIn": {
    "provider": "mock",
    "chargeId": "ch_01H…",
    "pixCode": "00020126…",
    "expiresAt": "2026-09-25T14:32:11Z"
  }
}
```

Idempotência: repetir com o mesmo `requestId` na mesma organização retorna **200** com a operação existente, não 201.

### 26.2 `GET /v1/operations/:id`

```jsonc
{
  "id": "7f3a1c2e-…",
  "status": "settled",
  "corridor": "BR-PY",
  "amountInAtomic": 10000000000,          // R$ 10.000,00
  "amountOutAtomic": 11550000000000,      // ₲ 11.550.000,00
  "assetIn": "BRL",
  "assetOut": "PYG",
  "rate": "1155",
  "spreadBps": 45,
  "feeAtomic": 0,                         // fee_bps = 0 em devnet (§33.2)
  "onchain": {
    "mintTx": "4xF…",
    "settleTx": "8jD…",
    "settlements": [
      { "leg": 1, "pubkey": "8jD…", "explorer": "https://explorer.solana.com/address/8jD…?cluster=devnet" },
      { "leg": 2, "pubkey": "2mN…", "explorer": "https://explorer.solana.com/address/2mN…?cluster=devnet" }
    ]
  },
  "events": [ { "status": "tokenized", "actor": "chain", "at": "2026-09-25T14:02:46Z" } ]
}
```

### 26.3 `GET /v1/quote`

```jsonc
// GET /v1/quote?assetIn=BRL&assetOut=PYG&amountInAtomic=10000000000
{
  "corridor": "BR-PY",
  "assetIn": "BRL",
  "amountInAtomic": 10000000000,
  "assetOut": "PYG",
  "amountOutAtomic": 11550000000000,
  "rate": "1155",
  "spreadBps": 45,
  "feeAtomic": 0,
  "attestationHash": "b8c2…",
  "expiresAt": "2026-09-25T14:12:00Z"
}
```

### 26.4 `GET /v1/operations/:id/proof`

Bundle de auditoria: atestações em claro, assinaturas (base64), hashes, tx signatures, links do explorer, comparação supply ↔ lastro.

### 26.5 `GET /v1/reserve`

```jsonc
{
  "assets": [
    { "asset": "BRL", "onchainSupply": "1000000.000000",
      "reserveAmount": "1000000.000000", "delta": "0.000000",
      "attesterSigner": "7Hq…", "attestationHash": "a3f1…",
      "validUntil": "2026-09-26T00:00:00Z", "checkedAt": "2026-09-25T20:00:00Z" },
    { "asset": "PYG", "onchainSupply": "1155000000.000000",
      "reserveAmount": "1155000000.000000", "delta": "0.000000",
      "attesterSigner": "7Hq…", "attestationHash": "c4d8…",
      "validUntil": "2026-09-26T00:00:00Z", "checkedAt": "2026-09-25T20:00:00Z" }
  ],
  "disclaimer": "DEVNET. RESERVAS SIMULADAS. SEM LASTRO REAL."
}
```

### 26.6 `POST /webhooks/fiat-rail`

Recebe confirmação de PIX. Verifica HMAC. **Idempotente** por `external_id`. Retorna 202 sem corpo.

### 26.7 `GET /health`

```jsonc
{ "status": "ok", "cluster": "devnet", "programId": "Per…", "corridorPaused": false }
```

### 26.8 Erros

Formato único:

```jsonc
{ "error": { "code": "SETTLEMENT_RECONCILIATION_REQUIRED", "message": "…", "requestId": "req_…" } }
```

Nunca retornar mensagem de provider, chave, URL de RPC ou stack trace. Ver §28.

---

## 27. Security Requirements

### 27.1 On-chain

| # | Controle |
|---|---|
| S-01 | Mint authority = PDA. Nenhuma chave humana emite |
| S-02 | Vault = PDA. Nenhuma chave humana move fundos |
| S-03 | Replay de atestação impossível por construção (PDA `Attestation` com `init`) |
| S-04 | Double-settle impossível por construção (PDA `Settlement` com `init`) |
| S-05 | `max_supply` por ativo limita exposição a um attester comprometido |
| S-06 | `rate_cap_bps` e `expiry` verificados on-chain; o backend não pode furar |
| S-07 | `min_out` obrigatório em `settle`; sem ele a assinatura é inválida |
| S-08 | Arithmética `checked_*` em toda operação monetária |
| S-09 | Todo PDA derivado de seeds canônicos, nunca aceito da entrada |
| S-10 | Discriminação de token program verificada explicitamente |
| S-11 | `transfer_hook` falha fechado em qualquer erro |
| S-12 | Upgrade authority distinta de toda chave operacional |

### 27.2 Off-chain

| # | Controle |
|---|---|
| S-13 | Chave `attester` distinta da chave `admin` |
| S-14 | Nenhuma chave em `VITE_*`; bundle do navegador é público |
| S-15 | Payload de atestação **canônico e length-delimited**; sem concatenação ambígua |
| S-16 | `attester` valida `amount`, `expiry`, `mint`, `destination` — atestação vazia é operação privilegiada sem limite |
| S-17 | API key armazenada como SHA-256; crua exibida uma vez |
| S-18 | Service role key nunca exposta ao cliente |
| S-19 | Erros sanitizados; sem texto de provider, chave ou URL de RPC |
| S-20 | RLS em todas as tabelas; `organizations` é a fronteira |
| S-21 | Dependências auditadas (`npm audit` no CI) |

### 27.3 CPI circular — o ponto mais sutil

Nosso `settle` faz CPI para o Token-2022, que invoca nosso `transfer_hook` via CPI. O hook é **reentrante dentro da nossa própria chamada**.

**Mitigação por construção:** `transfer_hook` é **estritamente read-only**. Lê `WalletRegistry` e `Corridor`; não muta nada. Sem essa restrição, é uma vulnerabilidade esperando. Escrever como invariante de código, com teste que falhe se o hook escrever.

O limite de profundidade de CPI do runtime (4 níveis) dá uma segunda barreira, mas **não** deve ser a defesa primária — um bug que estoure o limite ainda é um bug.

### 27.4 Ordem de operações

Em `settle`: **queimar a entrada ANTES de transferir a saída.** Se a transferência falhar, a transação inteira reverte e nada muda. A ordem inversa criaria um buraco de lastro em falha parcial.

### 27.5 Separação de ambientes

| Regra |
|---|
| Somente devnet. Nenhum caminho de deploy para mainnet no repositório |
| `Anchor.toml` com `cluster = "devnet"`; falhar no bootstrap se cluster ≠ devnet |
| Program ID distinto por ambiente; o de devnet nunca é reutilizado |
| Chaves de devnet em `.env`, nunca commitadas |
| Nenhum dado de mainnet no banco |

### 27.6 Falha de parceiro externo

| Falha | Comportamento exigido |
|---|---|
| Rail indisponível | Operação fica em `awaiting_pix`. **Nunca** emite |
| Confirmação ambígua | Sem confirmação assinada, não há mint. Nunca assumir sucesso |
| Off-ramp indisponível | `pyPYG` já entregue. Fica em `settled`; off-ramp retenta |
| Attester indisponível | Nenhuma emissão nova. Liquidações seguem |
| RPC indisponível | `settling` preservado com hash. Reconciliação assume |
| Rate oracle indisponível | Servir cotação expirada é proibido; 503 |

### 27.7 Checklist de chaves

- [ ] `attester` distinta de `admin` em devnet
- [ ] `attester` e `admin` nunca no mesmo caminho de secret manager
- [ ] Upgrade authority é chave dedicada, nunca reutilizada
- [ ] Nenhuma chave em variável `VITE_*`
- [ ] Rotação de `attester` documentada (é um campo do `Corridor`, mutável por admin — avaliar se mutação do attester deve exigir timelock; **decisão pendente**, ver §44 Q-04)

---

## 28. Error Handling

### 28.1 Erros de API

| Código | HTTP | Quando |
|---|---|---|
| `OPERATION_NOT_FOUND` | 404 | id inexistente ou de outra organização |
| `INVALID_STATE_TRANSITION` | 409 | transição não permitida pela máquina de estados |
| `IDEMPOTENCY_KEY_REUSED` | 409 | mesmo `requestId`, payload diferente |
| `PIX_NOT_CONFIRMED` | 409 | operação ainda em `awaiting_pix` |
| `WALLET_NOT_REGISTERED` | 403 | destino não está na allowlist |
| `CORRIDOR_PAUSED` | 503 | corredor em pausa |
| `SETTLEMENT_PENDING` | 202 | tx submetida, aguardando confirmação |
| `SETTLEMENT_RECONCILIATION_REQUIRED` | 409 | `settling` sem hash de transação |
| `INSUFFICIENT_VAULT_LIQUIDITY` | 409 | liquidity short no vault |
| `RATE_ATTESTATION_EXPIRED` | 422 | cotação expirada |
| `SPREAD_EXCEEDED` | 422 | spread acima do teto on-chain |
| `MIN_OUT_NOT_MET` | 422 | slippage excedido |
| `TX_HASH_PERSISTENCE_FAILED` | 500 | hash não gravado pós-broadcast |
| `RAIL_PROVIDER_UNAVAILABLE` | 503 | OZAV indisponível |
| `OFFRAMP_UNAVAILABLE` | 503 | off-ramp indisponível |
| `RPC_UNAVAILABLE` | 503 | RPC indisponível |

### 28.2 Erros on-chain (códigos Anchor)

| Código | Instrução | Causa |
|---|---|---|
| `AttestationAlreadyConsumed` (6000) | todas com atestação | PDA `Attestation` já existe → replay |
| `AttestationSignatureInvalid` (6001) | todas com atestação | ed25519 inválida |
| `AttestationExpired` (6002) | todas com atestação | `expiry` no passado |
| `AttestationKindMismatch` (6003) | todas com atestação | `kind` errado para a instrução |
| `AttestationMintMismatch` (6004) | `mint_from_attestation` | `mint` do payload ≠ asset |
| `SupplyCapExceeded` (6005) | `mint_from_attestation` | `max_supply` atingido |
| `SettlementAlreadyExists` (6010) | `settle` | PDA `Settlement` existe → double-settle |
| `SpreadExceedsCap` (6011) | `settle` | `spread_bps` > `Corridor.rate_cap_bps` |
| `SlippageExceeded` (6012) | `settle` | `amount_out < min_out` |
| `InsufficientVaultLiquidity` (6013) | `settle` | vault sem saldo |
| `WalletNotAllowed` (6020) | `transfer_hook` | origem ou destino não `ALLOWED` |
| `CorridorPaused` (6021) | `transfer_hook`, `settle` | corredor pausado |
| `AssetNotEnabled` (6022) | `settle` | ativo desabilitado |
| `UnauthorizedAdmin` (6030) | `I-1,2,8` | signer ≠ `Corridor.admin` |
| `AccountDiscriminantMismatch` (6040) | todas | conta não é do token program esperado |
| `ArithmeticOverflow` (6041) | todas | `checked_*` disparado |

### 28.3 Regras

1. **Nunca** retornar mensagem crua de provider, chave, URL de RPC ou stack trace ao cliente.
2. Todo erro tem `code` estável, `message` humano, `requestId` para correlação.
3. Erros de on-chain são mapeados para os códigos de API no boundary. O texto do Anchor não vaza.
4. Falha de parser de webhook não retorna 500 — retorna 400 e registra. Um webhook malformado não pode derrubar o serviço.
5. Erro em retry de background vai para dead-letter após N tentativas, com alerta.

---

## 29. Idempotency

### 29.1 Princípio

Toda operação que cruza a fronteira entre o banco e a chain é **at-most-once**. Repetir é sempre mais seguro que duplicar.

### 29.2 Onde se aplica

| Operação | Chave | Garantia |
|---|---|---|
| Criar operação | `(acquirer_id, requestId)` | Unique constraint; retry retorna a existente |
| Ingerir webhook | `(provider, external_id)` | Unique constraint; retry é no-op |
| Emitir token | hash da atestação | PDA `Attestation` com `init` → reverte |
| Executar settlement | `operation_id` | PDA `Settlement` com `init` → reverte |
| Persistir hash de tx | `operation_id` | Unique; falha ⇒ `SETTLEMENT_PENDING`, nunca re-broadcast |
| Payout | `operation_id` | `OffRampProvider.payOut` idempotente |

### 29.3 O padrão de settlement coordinator

Sequência obrigatória:

```
1. CLAIM     → transicionar para `settling` atomicamente (UPDATE ... WHERE status = 'pix_confirmed')
               se o claim falhar → já está em processamento; ir para reconciliação
2. BROADCAST → assinar e enviar a transação
3. PERSIST   → gravar tx signature  ← se falhar, NÃO reenviar
4. CONFIRM   → await receipt
               em erro de receipt → status `settling` + hash; worker assume
```

**A ordem é rígida.** Gravar o hash **antes** de aguardar confirmação evita o caso em que a transação é confirmada mas o sistema não sabe, e reenvia — duplicando a liquidação.

Se a operação está em `settling` **sem** hash, o estado é `SETTLEMENT_RECONCILIATION_REQUIRED` e exige intervenção humana. Nunca adivinhar.

### 29.4 Padrão a portar

O repositório `peragus` atual já possui `settlement-coordinator.ts` testado, com `claim` → `broadcast` → `persist` → `reconcile`, `at-most-once`, e os erros `SETTLEMENT_PENDING` e `SETTLEMENT_RECONCILIATION_REQUIRED`. **Esse padrão deve ser portado, não reinventado.** Ele já é o ativo mais valioso do repositório atual para este projeto.

---

## 30. Transaction Lifecycle

### 30.1 Ciclo de vida de uma transação on-chain

```
T0  Backend monta a instrução
T1  Backend assina a transação com payer = conta de taxas (admin ou treasury dev)
T2  [se houver assinatura do adquirente] → transmita para a wallet; aguarde
T3  Adquirente assina
T4  Backend envia
T5  Runtime executa:
      - resolve PDAs, valida seeds e owners
      - valida atestação (ed25519, replay, expiry, amount)
      - valida allowlist de pagador e recebedor
      - valida limites de spread e slippage
      - CPI Token-2022: burn (entrada)
      - CPI Token-2022: TransferChecked (saída) → CPI transfer_hook
      - grava Settlement
T6  Runtime verifica
T7  Backend persiste o hash da transação
T8  Worker aguarda a confirmação
T9  Receipt: success → `settled`; error → `failed`; erro de RPC → mantém `settling` + hash
```

### 30.2 Regras de custo

- O pagador de taxas é a conta de serviço, não o adquirente. O adquirente paga a taxa de rede em BRL (off-ramp) como parte do spread.
- A instrução de `settle` é assinada pelo pagador **e** pela autoridade do vault — via `invoke_signed` no próprio programa, sem segunda assinatura externa.
- Se a transação falhar por `BlockhashNotFound`, regenerar e reenviar com o **mesmo** `operation_id`. A proteção anti-duplicação é o PDA `Settlement`, não a transação.

### 30.3 Concorrência

Duas operações simultâneas do mesmo adquirente competem pelo mesmo vault. A execução é serializada pelo runtime, e a verificação `vault.balance >= amount_in` ocorre dentro da transação. **Não háoversubscription possível** — a verificação é atômica com a transferência.

---

## 31. On-chain vs Off-chain Responsibilities

| Responsabilidade | On-chain | Off-chain | Por quê |
|---|---|---|---|
| Saldo do vault | **Sim** | Não | Estado de valor é da chain |
| Suprimento total | **Sim** | Não | Precisa ser verificável por qualquer um |
| Compliance (allowlist) | **Sim** | Não | Precisa ser inevitável; o hook torna |
| Autoridade de mint | **Sim** | Não | Nenhuma chave humana pode emitir |
| Verificação de atestação | **Sim** | Não | O programa precisa ser soberano |
| Teto de spread e expiração | **Sim** | Não | O backend não pode furar limites |
| Slippage (`min_out`) | **Sim** | Não | Proteção tem que ser atômica com a execução |
| Assinatura da atestação | Não | **Sim** | ed25519 off-chain, verificado on-chain |
| Cotação de mercado | Não | **Sim** | Mercado é off-chain |
| Confirmação de PIX | Não | **Sim** | Rail externo |
| Pagamento de PYG | Não | **Sim** | Rail externo |
| Máquina de estados da operação | Não | **Sim** | Enriquecimento e apresentação |
| Conciliação diária | Não | **Sim** | Requer dados de duas fontes |
| Autorização de API | Não | **Sim** | Fora do escopo da chain |
| **Saldos de conta de usuário** | **Não** | Não | **A chain já é o ledger. Não reimplementar** |

---

## 32. Real vs Mock Components

### 32.1 REAL — executado de verdade

| # | Componente | Onde |
|---|---|---|
| R-01 | Programa `peragus_settlement` em Rust | `programs/peragus_settlement` |
| R-02 | 8 instruções, incluindo o hook | idem |
| R-03 | Mints `pgBRL`, `pyPYG` e `tsUSD` em Token-2022 com extensões | `scripts/bootstrap.ts` |
| R-04 | Verificação ed25519 on-chain | `attestations.rs` |
| R-05 | Anti-replay por PDA | `mint_from_attestation`, `settle` |
| R-06 | Liquidação atômica de duas pernas | `settle` |
| R-07 | Compliance em toda transferência | `transfer_hook` |
| R-08 | Revogação via permanent delegate | `revoke` |
| R-09 | Teto de spread, expiração, `min_out` | `settle` |
| R-10 | Teto de suprimento | `mint_from_attestation` |
| R-11 | Assinatura ed25519 real (backend) | `attestations/` |
| R-12 | Máquina de estados + idempotência | `domain/` |
| R-13 | Settlement coordinator at-most-once | `domain/settlement.ts` |
| R-14 | Auth + API keys (SHA-256) | `auth/` |
| R-15 | Worker de reconciliação | `workers/` |
| R-16 | Webhook idempotente | `workers/webhook.ts` |
| R-17 | Dashboard com timeline e explorer | `src/pages/operations` |
| R-18 | Conexão de wallet e assinatura | `src/lib/wallet` |
| R-19 | Painel de reserva com verificação de divergência | `src/pages/reserve` |

### 32.2 MOCK — simulado, rotulado

| # | Componente | Natureza da simulação |
|---|---|---|
| M-01 | Lastro de `pgBRL`, `pyPYG` e `tsUSD` | Não há BRL, PYG nem US$ reais. Declarado nos metadados on-chain de cada mint |
| M-02 | `MockFiatRailProvider` | BR Code EMV válido; confirmação via botão, webhook HMAC |
| M-03 | `MockOffRampProvider` | Conversão e payout simulados, latência artificial de 3s |
| M-04 | `FixedRateOracle` | Taxa fixa com spread visível |
| M-05 | Liquidez dos vaults | Saldo de teste da treasury de desenvolvimento |
| M-06 | Wallet do adquirente | Phantom em devnet representa uma carteira corporativa |
| M-07 | Saldo de reserva reportado | Atestado de desenvolvimento, com `valid_until` curto |
| M-08 | Carga do `tsUSD` no vault | Mint de teste via bootstrap, sob atestação de lastro |

### 32.3 INTEGRAÇÃO — depende de terceiro

| # | Componente | Status |
|---|---|---|
| I-01 | `OzavFiatRailProvider` | API real; **não construída no MVP** |
| I-02 | Confirmação de PIX por webhook OZAV | Especificada, não implementada |
| I-03 | Conta segregada BRL | Externo |
| I-04 | `DLocalOffRampProvider` (payout PYG, SIPAP) | API pública e documentada; **onboarding comercial pendente** (§20.3) |

### 32.4 A regra de honestidade

Qualquer tela, log ou material de demo que apresente um componente MOCK como real é um defeito. O selo `DEVNET` e o texto "sem lastro" não são opcionais.

---

## 33. Devnet Environment

### 33.1 Configuração

| Item | Valor |
|---|---|
| Cluster | `devnet` |
| RPC | `https://api.devnet.solana.com` (ou provider dedicado) |
| Explorer | `https://explorer.solana.com/?cluster=devnet` |
| Token-2022 program | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| SPL Token legado | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Pivô de settlement | **`tsUSD`, criado pelo bootstrap.** Não há USDT nem USDC canônico em devnet (§12.1.1) |
| Deployer | `~/.config/solana/id.json` (devnet) |
| Programa | ID definido em `Anchor.toml` |

> **O bootstrap cria três mints:** `pgBRL`, `pyPYG` e `tsUSD`. Todos Token-2022, 6 decimais, mint authority = PDA do programa, com `TransferHook` + `MetadataPointer` + `TokenMetadata` + `PermanentDelegate`. O `tsUSD` **não** tem transfer hook (nenhum compliance é necessário sobre um pivô de liquidação interna) — o que também reduz CU.

### 33.2 Configuração de linha de base

| Parâmetro | Devnet | Default |
|---|---|---|
| `rate_cap_bps` | 500 (5%) | 100 (1%) |
| `fee_bps` | 0 | 25 |
| `max_supply` BRL | 1.000.000.000.000 (R$ 1 bi) | 100.000.000.000 (R$ 100 mi) |
| `max_supply` PYG | 1.000.000.000.000.000 (₲ 1 tri) | 100.000.000.000.000 (₲ 100 bi) |
| Liquidez do vault tsUSD | 50.000 tsUSD | 10.000 tsUSD |
| Expiração da atestação de cotação | 300s | 120s |
| Expiração da atestação de mint | 3600s | 600s |

### 33.3 Ambiente local

```bash
anchor build
anchor test                      # solana-test-validator local
anchor deploy --provider.cluster devnet
npm run bootstrap                # cria corridor, mints, vaults, registro de wallets
npm run seed:devnet              # airdrop +-liquidez
```

### 33.4 Configuração do bootstrap

`npm run bootstrap` falha imediatamente se `cluster !== "devnet"`. **Não existe caminho de código para mainnet neste repositório.**

---

## 34. Testing Strategy

### 34.1 Programa (prioridade máxima)

| Nível | Ferramenta | Cobertura |
|---|---|---|
| Unit | `#[cfg(test)]` | Verificação de atestação (válida, assinatura ruim, expirada, kind errado), aritmética, derivação de PDA |
| Integração | **Bankrun** ou `solana-test-validator` local | Fluxo completo: bootstrap → mint → settle |
| Invariante | Teste de propriedade | Para N operações aleatórias: `Σ vault + Σ consumed == Σ minted` |
| Regressão de segurança | Testes explícitos | Replay, double-settle, slippage, spread, allowlist, pausa, overflow, CPI hook read-only |
| Fuzz | `proptest` | Payload de atestação malformado |

### 34.2 Casos de teste obrigatórios do programa

| ID | Caso | Esperado |
|---|---|---|
| T-01 | `initialize_corridor` duas vezes | Reverte (PDA existe) |
| T-02 | Mint sem atestação | Reverte `AttestationSignatureInvalid` |
| T-03 | **Replay da mesma atestação** | Reverte `AttestationAlreadyConsumed` |
| T-04 | Atestação expirada | Reverte `AttestationExpired` |
| T-05 | Atestação com `amount` acima do `max_supply` | Reverte `SupplyCapExceeded` |
| T-06 | Settle bem-sucedido (2 pernas) | 2 `Settlement` PDA, saldos corretos |
| T-07 | **Double-settle do mesmo `operation_id`** | Reverte `SettlementAlreadyExists` |
| T-08 | Settle com vault insuficiente | Reverte `InsufficientVaultLiquidity`; **pgBRL do pagador intacto** |
| T-09 | Settle com spread > cap | Reverte `SpreadExceedsCap` |
| T-10 | Settle com `min_out` inalcançável | Reverte `SlippageExceeded`; **pgBRL do pagador intacto** |
| T-11 | Transferência para wallet não registrada | Reverte `WalletNotAllowed` |
| T-12 | Transferência de wallet revogada | Reverte `WalletNotAllowed` |
| T-13 | Settle com corredor pausado | Reverte `CorridorPaused` |
| T-14 | `revoke` queima sem assinatura do dono | Funciona; `Settlement.status = REVOKED` |
| T-15 | `set_wallet_status` sem assinatura do attester | Reverte |
| T-16 | Admin diferente do `Corridor.admin` | Reverte `UnauthorizedAdmin` |
| T-17 | **Hook tenta mutar estado** | **Teste deve falhar se o hook passar a mutar** |
| T-18 | Mint com token program não registrado (ex.: programa arbitrário) | Reverte `AccountDiscriminantMismatch` |
| T-19 | Amount em `u64::MAX` | Reverte `ArithmeticOverflow` |
| T-20 | 100 settles sequenciais | Sem drift de saldo; invariante por asset respeitada |
| T-21 | **Settle de 2 pernas na mesma transação, perna 2 com `payer` = PDA do vault** | Sucesso; uma única assinatura externa; ambas as `Settlement` criadas |
| T-22 | Registro de mint SPL legado (simulando o USDT de produção) | Aceito; `token_program` gravado; CPI usa o programa correto |
| T-23 | CPI de token para programa ≠ `token_program` do ativo | Reverte `AccountDiscriminantMismatch` |
| T-24 | `rate_q9` com 10 casas em `i128` | Arredondamento determinístico; sem perda silenciosa |

### 34.3 Backend

| Nível | Ferramenta | Cobertura |
|---|---|---|
| Unit | Vitest | Máquina de estados, canonicalização de atestação, idempotência |
| Integração | Vitest + Postgres de teste | Repositórios, constraints, RLS |
| Contrato | Testes contra o programa em devnet | Endpoints que tocam a chain |
| Seguranc | Vitest | Nenhum segredo em resposta; erros sanitizados; RLS negando cross-org |

### 34.4 Casos de teste obrigatórios do backend

| ID | Caso | Esperado |
|---|---|---|
| B-01 | Criar com `requestId` repetido | 200 + operação existente, não 201 |
| B-02 | Mesmo `requestId`, payload diferente | 409 `IDEMPOTENCY_KEY_REUSED` |
| B-03 | Webhook duplicado | Processado uma vez |
| B-04 | Webhook com assinatura inválida | Rejeitado; nenhum mint |
| B-05 | Falha de gravação do hash pós-broadcast | `settling` + hash; **nenhum re-broadcast** |
| B-06 | `settling` sem hash | 409 `SETTLEMENT_RECONCILIATION_REQUIRED` |
| B-07 | Rail indisponível | Operação parada; nenhum mint |
| B-08 | Confirmação ambígua | Nenhum mint |
| B-09 | Off-ramp indisponível | `settled` preservado; `pyPYG` entregue |
| B-10 | Off-chain reconciliação de divergência > 1% | Alerta + pausa do corredor |
| B-11 | API key de outra organização | 404 (não 403 — não vaza existência) |
| B-12 | Erro do provider | Resposta sem texto do provider |
| B-13 | Usuário sem sessão acessando `/:org/:id` | RLS nega |

### 34.5 E2E

Playwright para o caminho completo da demo. O teste E2E mais importante é `demo-happy-path`: criar → pix → mint → assinar → settle → payout, com verificação das assinaturas no explorer.

### 34.6 Meta de cobertura

| Área | Meta |
|---|---|
| Programa — linhas de negócio | 100% |
| Programa — caminho de erro | 100% |
| Backend — domínio | ≥ 90% |
| Backend — adaptadores | ≥ 70% |
| Frontend | Testes de componentes críticos; E2E cobrindo o caminho da demo |

---

## 35. Demo Flow

**Duração alvo: 5 minutos.**

### 35.1 Roteiro

| # | Tempo | O que aparece | O que se prova |
|---|---|---|---|
| 1 | 0:00–0:30 | Slide de problema: adquirente no Paraguai, PIX de turista, sem como liquidar | O problema é real e específico |
| 2 | 0:30–1:00 | **Live:** dashboard em estado vazio; conectar wallet corporativa | O assinante é institucional |
| 3 | 1:00–1:45 | Criar operação R$ 10.000 → gerar cobrança PIX → confirmar | O on-ramp funciona |
| 4 | 1:45–2:15 | `pgBRL` aparece na wallet. Mostrar endereço, saldo, explorer | O ativo existe e é lastreado (simulado, declarado) |
| 5 | 2:15–2:45 | Cotação: taxa, spread, expiração. Assinar atestação | A cotação é assinada antes de tocar a chain |
| 6 | 2:45–3:30 | **Assinar e enviar o settlement.** Uma transação, duas pernas, duas `Settlement` PDA | Atomicidade |
| 7 | 3:30–4:00 | **Injetar falta de liquidez. Reenviar. A transação reverte inteira.** `pgBRL` intacto | **A propriedade central. O momento que converte o jurado** |
| 8 | 4:00–4:20 | **Replay da atestação. Reverte.** Transferência para wallet não registrada. Reverte | Compliance e anti-replay |
| 9 | 4:20–4:40 | Painel de reserva: supply on-chain vs. atestação; injetar divergência | Lastro verificável |
| 10 | 4:40–5:00 | Slide de produção: emissor regulado, mainnet, PLD/AML, R$ 3,7 bi TPV | É um produto, não uma demo |

### 35.2 Demonstrações obrigatórias

Sem estes três momentos, a demo não está completa:

1. **Rollback atômico** (passo 7) — prova que a propriedade central existe
2. **Replay rejeitado** (passo 8) — prova que o lastro é controlado
3. **Divergência de reserva detectada** (passo 9) — prova que a reconciliação é real

### 35.3 Declarações obrigatórias em voz alta

- "Estamos na **devnet**."
- "Os tokens **não têm lastro** — o lastro é simulado."
- "O off-ramp para guaraní é **simulado**; o parceiro ainda não foi definido."
- "A **PIX está num adaptador**; a integração com o OZAV está especificada e não construída."

Dizer essas quatro frases é o que separa uma demo séria de uma demo de mentira. **Não as pule.**

---

## 36. Future Production Architecture

### 36.1 Evolução de cada decisão de devnet

| Decisão MVP | Evolução de produção | Gatilho |
|---|---|---|
| Attester = chave Peragus | Attester = parceiro regulado em HSM | Acordo com instituição licenciada |
| Devnet | Mainnet | Licença, capital, parceiro |
| `max_supply` alto | Teto refletindo capital e licença | Relatório de capital |
| `Corridor` único | Multi-corredor via `code` | Expansão regional |
| Wallet corporativa | **Multisig Squads** para adquirente e upgrade | Maturidade operacional |
| Off-ramp mock | dLocal real (`DLocalOffRampProvider`) | onboarding KYB, preço e SLA |
| USDT | + USDC; registro por ativo | Preferência de liquidez |
| Sem flashloan | Flashloan como origem de liquidez | **Gatilho: janela assíncrona entre as pernas E vault abaixo do piso de liquidez** |
| Sem netting | Netting multilateral entre participantes | Mais de 2 participantes no rail |
| Revogação | Procedimento de chargeback com registro em auditoria | Operação com risco de chargeback real |
| Sem PLD | KYC/KYB + monitoramento + reporte ao COAF | Licença |

### 36.2 Quando ligar o flashloan

O flashloan foi **descartado com fundamento, não por falta de tempo**. O objetivo declarado — "evitar que o USDT fique na mão de nenhuma das partes" — é **integralmente entregue pela atomicidade da transação**, sem custo adicional. Flashloan acrescentaria fee, dependência de terceiro e consumo de CU sem alterar a propriedade desejada.

O gatilho para reconsiderar, para registro:

> **Ativar quando simultaneamente:** (a) existir janela assíncrona entre a perna de captação e a de liquidação (settlement em T+1 em vez de atômico), **e** (b) o saldo do vault ficar abaixo do piso de liquidez operacional.

Nesse cenário o flashloan deixa de ser redundante e passa a ser **crédito operacional** — a Peragus estaria tomando risco deFunding para comprar latência. É um produto distinto e com requisitos de capital próprios, e deve ser decidido como tal.

### 36.3 Roadmap pós-hackathon

| Horizonte | Foco |
|---|---|
| 0–90 dias | Integração OZAV real; onboarding dLocal; mainnet; Squads |
| 90–180 dias | Multi-corredor; KYC/KYB; PLD/AML; reconciliação automatizada |
| 180–365 dias | Netting multilateral; coverage como serviço; USDC; mais de 2 participantes |

---

## 37. Regulatory Dependencies

**Não é aconselhamento jurídico.** É o mapa do que precisa existir, por natureza, para validação com advogado e parceiro regulado.

> **Convenção de IDs deste documento.** `PR-NN` = requisito do programa on-chain · `NFR-NN` = requisito não funcional · `R-NN` = componente **técnico** real (§32) · **`REG-NN` = dependência regulatória** (esta seção) · `K-NN` = risco (§38) · `Q-NN` = pergunta aberta (§44) · `D-NN` = decisão registrada (§45) · `SOL-NNN` = tarefa de implementação (§43). Note que `R-` e `REG-` são esquemas distintos: `R-04` é um componente técnico, `REG-04` é a Res. BCB 520.

| ID | Item | Natureza | Encerramento |
|---|---|---|---|
| REG-01 | Peragus operar como VASP/PSA no Brasil (receber valor do cliente e converter) | **REGULATÓRIO** | **Validação jurídica obrigatória.** Se a Peragus assumir custódia e conversão de recursos de terceiros, há licenciamento, capital e supervisão |
| REG-02 | Emissão de `pgBRL`/`pyPYG` como ativo virtual representativo de moeda | **REGULATÓRIO** | Ponto central. Determina se a Peragus pode ser a emissora |
| REG-03 | Requisitos societários: Ltda/S.A. brasileira, sede e administração no Brasil, escritório físico efetivo (sem coworking), 3 responsáveis residentes perante o BCB, "Sociedade Prestadora de Serviços de Ativos Virtuais" no nome, vedação a acionista único pessoa física, e controlador não pode ser fundo | **REGULATÓRIO** | Estruturação societária |
| REG-04 | Instituição licenciada pode terceirizar custódia, liquidez, market making e BaaS, permanecendo integralmente responsável (Res. BCB 520, arts. 32–42) | **REGULATÓRIO** | **A arquitetura B' é compatível com isto** |
| REG-05 | No fluxo de FX com cripto, o provedor deve ser entidade supervisionada (Res. BCB 521, art. 76-B); a instituição licenciada, não o provedor, é a contraparte regulada do cliente | **REGULATÓRIO** | **Valida B'; invalida B puro** |
| REG-06 | KYC/KYB de adquirentes e beneficiários finais | **OPERACIONAL** | Procedimento e documentação |
| REG-07 | PLD/AML, monitoramento, reporte ao COAF | **OPERACIONAL + REGULATÓRIO** | Processos e tecnologia |
| REG-08 | Registrabilidade no Paraguai (BCP) para servir adquirentes locais | **REGULATÓRIO** | **Validação — não pesquisado nesta spec** |
| REG-09 | Regras de transferência internacional de informação (beneficiário final) | **OPERACIONAL** | Procedimento e checklist |
| REG-10 | Tratamento contábil e fiscal de `pgBRL` como passivo | **FISCAL** | **Validação com contador** |
| REG-11 | Troca de token de fiat para stablecoin é operação de FX | **REGULATÓRIO** | Depende de REG-01 |
| REG-12 | Linguagem de marketing e UI: não sugerir que a Peragus emite moeda | **OPERACIONAL**, com insumo jurídico | Revisão de copy |
| REG-13 | Relação com o adquirente: a Peragus é contraparte dele, ou há um terceiro pagador no meio? | **REGULATÓRIO** | **Validação. Afeta REG-01 diretamente** |
| REG-14 | **Res. BCB 561 (publicada 2026-04-30, em vigor desde 2026-10-01)** — vedação a provedores de câmbio eletrônico (instituições de pagamento, emissores de e-money, adquirentes) de usar stablecoin ou cripto para liquidar a **perna offshore** de pagamento transfronteiriço. A liquidação com contraparte estrangeira deve ocorrer por operação de FX tradicional ou conta em reais de não residente | **REGULATÓRIO** | **Ver §37.3. Altera o enquadramento, não a arquitetura** |
| REG-15 | **Res. BCB 521 (publicada 2025-11-10, em vigor desde 2026-02-02)** — canal supervisionado que traz serviços de ativos virtuais para dentro do mercado de câmbio e **permite** a atividade transfronteiriária com stablecoin por VASPs licenciados e bancos autorizados | **REGULATÓRIO** | Ver §37.3. É o canal por onde a perna em stablecoin deve rodar |

### 37.1 A conclusão regulatória

REG-04 e REG-05, juntos, **invalidam o desenho B puro e validam o B'**:

- Se a Peragus assume o papel de instituição licenciada, captura toda a responsabilidade regulatória, exigências de capital e conformidade — inviável num hackathon e sem estrutura societária.
- Se a Peragus fornece **apenas a tecnologia** para uma instituição licenciada operar, ela é fornecedora de infraestrutura. É o posicionamento do brief original, e é o único compatível com o escopo.

**A escolha de B' foi, portanto, uma decisão de estrutura de risco, não apenas de arquitetura.**

### 37.2 Requisito técnico decorrente

Independente da validação jurídica, o sistema deve suportar:
- Desacoplamento do `attester` do operador Peragus (campo `Corridor.attester`, mutável)
- Capacidade de desabilitar ativos e pausar o corredor sem deploy
- Rastreabilidade completa de qual chave assinou o quê, quando

Estes são **requisitos técnicos** que existem para tornar a arquitetura B' possível caso o cenário regulatório exija parceiro.

### 37.3 Res. BCB 561 × 521: o enquadramento da perna em stablecoin

**Esta é a restrição regulatória mais relevante já identificada neste documento, e ela mudou o enquadramento depois de escrita a spec.**

**O que a Res. BCB 561 diz.** Publicada em 2026-04-30, em vigor desde **2026-10-01**. Instituições de pagamento, emissores de dinheiro eletrônico e adquirentes que atuem como provedores de câmbio eletrônico **não podem** liquidar a perna offshore de um pagamento internacional com stablecoin ou cripto. A liquidação com a contraparte estrangeira deve ocorrer por operação de FX tradicional ou por conta em reais de não residente mantida no Brasil. A regra **não** é um bloqueio geral de stablecoins no Brasil.

**O que a Res. BCB 521 diz.** Publicada em 2025-11-10, plenamente em vigor desde 2026-02-02, traz os serviços de ativos virtuais para dentro do mercado de câmbio e cria um **canal supervisionado** no qual VASPs licenciados e bancos autorizados podem executar atividade transfronteiriça com cripto e stablecoin.

**Como isso se aplica ao fluxo da Peragus.** O fluxo especificado é:

```
BRL (PIX) → pgBRL → tsUSD/USDT → pyPYG → PYG (conta SIPAP)
                      ^^^^^^^^^
                      perna em stablecoin
```

Isso é, literalmente, "receber reais de um cliente brasileiro, converter para um ativo digital e liquidar a transação no exterior por rails de blockchain" — que é a descrição do que a 561 proíbe **a provedores de câmbio eletrônico**.

A leitura correta depende inteiramente de **quem é o provedor**:

| Cenário | Resultado sob a 561 |
|---|---|
| O adquirente/PSP é instituição de pagamento ou emissor de e-money, liquidando no regime de câmbio eletrônico | **A perna em stablecoin é vedada.** O rail teria de operar em FX tradicional ou conta em reais de não residente |
| O operador é VASP licenciado, executando sob o regime da Res. 521 | **Permitido.** A perna em stablecoin é precisamente o que a 521 cria canal para |
| A Peragus é fornecedora de tecnologia e o operador regulado é o parceiro | **Não é a Peragus que liquida.** A Peragus fornece o rail; a liquidação é do parceiro, no canal que ele estiver autorizado a usar |

**Cenário adotado pelo time (D-33): o parceiro é um VASP licenciado, sob a Res. BCB 521.** É a segunda linha da tabela. Ver §37.5 para as consequências na ponta de entrada, e Q-13 para o que ainda precisa ser validado.

**Consequência para a arquitetura: a B' não é sobrevive à 561 — ela é reforçada por ela.**

A B' já foi escolhida porque o desenho B puro (Peragus como instituição licenciada) é inválido sem estrutura societária e capital. A 561 acrescenta um segundo motivo independente: ela empurra a liquidação offshore em stablecoin para fora do canal de câmbio eletrônico e para dentro do canal de VASP, que é exatamente onde um rail fornecido pela Peragus se encaixa. Uma Peragus que tentasse operar liquidando a perna offshore como instituição de pagamento estaria fora da lei a partir de 2026-10-01.

**O que isso não muda:** a demo é em devnet, sem valor real, sem contraparte regulada e sem liquidação. A 561 não afeta a execução técnica do hackathon. Ela afeta **a história que o júri vai avaliar** e **o roadmap de produção**.

**Datas que importam:** a 561 está em vigor desde 2026-10-01. O prazo do World's Fair é 2026-10-12. A demonstração é submetida **onze dias depois da regra entrar em vigor**. Isso é um ativo, não um problema: o time pode dizer, com precisão, que conhece a norma vigente e posicionou o produto no único canal que ela permite.

**O que precisa de validação jurídica (não é conclusão desta spec):** se a Res. 521, na redação vigente e na prática da supervisão, basta para a operação descrita; se há exigência de capital ou de segregação aplicável a um operador de stablecoin cross-border; e se a contraparte paraguaia pode receber stablecoin como compensação ou exige valor em fiat convencional. **Estas três perguntas devem ir para o advogado junto com REG-01.**

### 37.4 Efeito sobre a tese de mercado

O §2.3 e o §3 argumentam que a estrutura de mercado do Paraguai — guaraní dolarizado, volume elevado em USD/BRL→PYG — torna o pivô em stablecoin a estrutura economicamente correta. **Essa argumentoação econômica é indiferente à 561 e permanece válida.**

O que muda é a frase de enquadramento. Não é "o mercado pede um pivô em stablecoin, e a Peragus o constrói". É:

> "A economia do corredor pede um pivô em stablecoin. A regra vigente proíbe que isso aconteça no canal de câmbio eletrônico. O canal que sobra é o de ativos virtuais supervisionados, e é nesse canal que um rail de liquidação como este se instala."

Isso é uma história mais forte, não mais fraca — porque responde antes de ser perguntada à pergunta mais difícil que um júri de hackathon pode fazer, que é "isto é legal?".

### 37.5 O parceiro é um VASP — e o que isso implica para a ponta de entrada

O perfil adotado para o parceiro de produção é **VASP licenciado, operando sob a Res. BCB 521** (decisão do time, registrada em D-33). Isso é coerente com B' e com a conclusão de §37.3: a perna em stablecoin roda no canal de ativos virtuais, não no de câmbio eletrônico.

**Consequência não óbvia para a ponta de entrada.** A Res. BCB 561 proíbe instituições de pagamento, emissores de e-money e adquirentes de liquidar a perna offshore em stablecoin. A Res. 521 abre o canal de VASP. São **canais diferentes, com autorizações diferentes** — e um VASP não é automaticamente uma instituição de pagamento.

Isso significa que a **coleta de PIX em BRL pode continuar exigindo uma instituição de pagamento**, mesmo que o parceiro da perna stablecoin seja um VASP. Ou seja: **a OZAV provavelmente não é redundante.** A hipótese de "dLocal como contraparte única" (Q-11) fica menos atraente, porque ela removeria justamente a perna de fiat que o VASP talvez não possa operar sozinho.

Três combinações possíveis, todas ainda abertas:

| Combinação | O que a Peragus precisaria | Risco |
|---|---|---|
| VASP (stablecoin) + OZAV (PIX) | Dois parceiros, um por perna | Duas integrações; nenhum conflito de canal |
| VASP que também é instituição de pagamento | Um parceiro só | **Só vale se o parceiro tiver as duas autorizações.** Precisa ser confirmado, não assumido |
| VASP + OZAV + dLocal | Três contrapartes | Máxima resiliência; máxima complexidade |

**Por que adiar Q-11 é a decisão correta.** A escolha entre essas combinações depende inteiramente de uma informação que ainda não existe: **quais autorizações o parceiro pretendido de fato tem.** Decidir o grafo de parceiros antes de validar isso seria otimizar para um cenário não verificado. Adiar custa zero durante a demo, porque a demo roda em devnet com `MockOffRampProvider` e `MockFiatRailProvider` de qualquer forma. Por isso as duas implementações ficam especificadas e a decisão é tomada depois da validação de Q-13.

**O que não fazer enquanto isso:** não apresentar a Res. 521 como base legal em material externo, site, pitch ou proposta comercial. Ela é uma hipótese de trabalho adotada pelo time, não um parecer validado.


---

## 38. Risks

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| K-01 | **Prazo**: 17 dias, 2 devs, ~30 tarefas | Alta | Crítico | Escopo rígido; fases com cutoff claro; demo reduzida ao mínimo mas completa (fluxo + rollback) |
| K-02 | ~~Off-ramp PYG sem parceiro definido~~ **Resolvido** — dLocal publica API de payout PYG documentada (§20.3). Dependência restante é comercial: onboarding KYB, preço, SLA | Baixa | Médio | Adaptador `DLocalOffRampProvider` atrás da mesma interface do mock; a demo não depende de onboarding |
| K-03 | **Escopo do token**: 3 mints dobram testes de invariante | Média | Alto | Registro por ativo reduz trabalho; `max_supply` e invariante são parametrizados |
| K-16 | **Sem stablecoin em devnet** — o pivô de settlement é `tsUSD`, um token de teste | Confirmada | Médio | Declarado em metadados, símbolo e painel. A atomicidade é o que se demonstra, não o lastro do pivô |
| K-04 | **Reentrância do hook** | Média | Crítico | Hook read-only por construção; teste que falha se mutar (T-17) |
| K-05 | **Integração OZAV não pronta** | Média | Médio | Adaptador com 2 implementações; mock é suficiente para a demo |
| K-06 | **Precisão decimal** em 3 ativos | Média | Alto | 6/6/6 uniforme; vetores de propriedade |
| K-07 | **Jurado questionar o lastro** | Alta | Médio | Declarar em voz alta; metadados on-chain; painel de reserva |
| K-08 | **Jurado questionar "por que blockchain"** | Média | Alto | Rollback atômico ao vivo; a propriedade não é reproduzível off-chain sem ledger distribuído |
| K-09 | **Ataque de reentrada no hook via CPI** | Baixa | Crítico | Ver K-04 |
| K-10 | **Divergência de lastro em produção** | Média | Crítico | Reconciliação diária; pausa automática > 1% |
| K-11 | **Attester comprometido** | Baixa | Crítico | `max_supply`, `rate_cap_bps`, `expiry` on-chain; rotação de chave |
| K-12 | **Exposição de crédito em chargeback** | Alta | Alto | Documentado em §22.4; não é reversão limpa |
| K-13 | **Baixa liquidez de stablecoin na Solana em produção** | Média | Médio | Programa agnóstico; `token_program` por ativo torna a troca de pivô um registro, não código |
| K-14 | **Demonstração de falha ao vivo** | Média | Alto | Testar exaustivamente antes; ter gravação de backup do run feliz |
| K-15 | **Perda de chave de desenvolvimento** | Baixa | Crítico | Chaves de devnet são descartáveis; `attester` de devnet pode ser rotacionado |
| K-17 | **Res. BCB 561 veda a perna em stablecoin no canal de câmbio eletrônico** (§37.3). Se o parceiro pretendido for instituição de pagamento ou emissor de e-money, o desenho de produção não é viável como está | **Reduzida** — o time adotou a hipótese "VASP licenciado" (D-33). Permanece como risco de que a hipótese se mostre falsa na validação | **Crítico** | Não é risco técnico: é uma restrição de posicionamento. Levar ao advogado **antes** de qualquer conversa comercial com o parceiro (Q-13) |
| K-18 | **Res. BCB 521 pode não bastar** para a operação descrita, ou pode impor capital/segregação que inviabilize o economics | Média | Crítico | Não verificável sem advogado. A demo em devnet não é afetada. **Não usar a Res. 521 como premissa em material externo antes de validação** |
| K-19 | **O parceiro pode não ter as duas autorizações (VASP + instituição de pagamento)** — a Res. 521 autoriza a perna em stablecoin, mas não necessariamente a coleta de PIX (§37.5) | Média | Alto | Manter a OZAV especificada como a perna de entrada. Q-11 adiado de propósito (D-34) até saber quais autorizações o parceiro tem |

---

## 39. Out of Scope

Explicitamente **não** será feito:

| Item | Razão |
|---|---|
| Deploy em mainnet | Requer licença e capital |
| Integração real com OZAV | Dependência externa; adaptador especificado |
| Integração real com PSP paraguaio | dLocal tem API pública documentada (§20.3); falta o onboarding comercial |
| Multisig Squads | Wallet corporativa é suficiente para a demo |
| Driver de maquininha/POS | A Peragus liquida; o POS é do adquirente |
| Adquirência (processamento de cartão) | É o negócio do cliente, não da Peragus |
| Netting multilateral | Complexidade sem ganho no MVP |
| Flashloan | Ver §36.2 — resolvido por atomicidade |
| USDC | `tsUSD` (devnet) / USDT (produção) — ativos escolhidos |
| Confidential transfers | Não está ativo em mainnet |
| Interest-bearing tokens | Fora de escopo |
| KYC/KYB completo | `kyc_ref` apenas |
| PLD/AML reporting | Requer licença |
| Multi-organização no produto | Uma organização por deploy de devnet |
| i18n completo | pt-BR e en |
| Mobile | Web apenas |
| Telas de admin do attester | CLI de desenvolvimento |

---

## 40. Implementation Phases

**Prazo: 2026-09-25 → 2026-10-12 (17 dias, 2 devs).**
**Overcommit buffer: os dias 15-17 são de buffer e demo. Corte de escopo só depois disso.**

| Fase | Dias | Devs | Objetivo | Critério de saída |
|---|---|---|---|---|
| **F0 — Fundação** | 1–2 | A+B | Workspace, Anchor, chaves, deploy do programa vazio na devnet, bootstrap do ambiente | Programa implantado na devnet, `npm run bootstrap` roda |
| **F1 — Programa** | 2–8 | A | 8 instruções, mints, hook, invariantes | T-01 a T-20 verdes |
| **F2 — Backend núcleo** | 3–8 | B | Schema, auth, API keys, máquina de estados, atestações | API CRUD funcionando com auth |
| **F3 — Backend chain** | 6–11 | A+B | BlockchainClient, settlement coordinator, adaptadores, workers | Fluxo headless: API → mint → settle |
| **F4 — Frontend** | 7–13 | B | Conexão de wallet, telas, timeline, painel de reserva | Demo navegável com dados reais |
| **F5 — Integração e testes** | 11–15 | A+B | E2E, testes de segurança, pré-demo | E2E verde; roteiro ensaiado |
| **F6 — Demo e entrega** | 15–17 | A+B | Gravação, README, documentação, repo público | Submissão pronta |

### 40.1 Regras de phase gate

1. **Não avançar fase com a anterior incompleta.** Cortar escopo de fases futuras, nunca comprometer a anterior.
2. **O caminho E2E completo é o gate de F3.** Se o fluxo headless não funciona, o frontend não começa.
3. **F1 é o caminho crítico.** Se o programa não ficar pronto até o dia 8, cortar `revoke` (F1 parcial) e declarar como Future Scope.
4. **F6 não é cortável.** É a entrega.

### 40.2 Ordem de corte, se necessário

| Ordem | O que cortar | Impacto |
|---|---|---|
| 1º | Painel de reserva detalhado | Baixo — histórico em `/reserve` simples |
| 2º | `revoke` e permanent delegate | Médio — tira o argumento de chargeback |
| 3º | `pyPYG` (entregar o pivô direto) | Médio — volta a discussão do token utilitário |
| 4º | Auth e API keys (usar header estático) | Médio — tira o Persona 4 |
| 5º | E2E automatizado (roteiro manual) | **Alto — não recomendado** |

---

## 41. Developer Task Breakdown

Formato: ID · Nome · Objetivo · Dependências · Componentes · Lógica · Inputs · Outputs · Segurança · Testes · Acceptance Criteria.

---

### TASK SOL-001 — Bootstrap do workspace

**Objetivo:** criar a estrutura do repositório do hackathon.
**Dependências:** nenhuma.
**Componentes:** `programs/peragus_settlement`, `backend/`, `web/`, `scripts/`, `.env.example`, `README.md`.
**Lógica:** workspace Anchor; `package.json` com workspaces; `Anchor.toml` com `cluster = "devnet"`.
**Inputs:** nenhum.
**Outputs:** repositório compilável; `anchor build` funciona.
**Segurança:** `.env` no `.gitignore`; nenhum segredo em `VITE_*`.
**Testes:** `anchor build` + `anchor test` sem erros.
**Acceptance:** `npm install && anchor build && anchor test` passa do zero.

---

### TASK SOL-002 — Configuração de ambiente e chaves

**Objetivo:** setup determinístico de devnet.
**Dependências:** SOL-001.
**Componentes:** `scripts/check-env.ts`, `.env.example`, `scripts/keygen.ts`.
**Lógica:** validar `ANCHOR_PROGRAM_ID`, `ADMIN_KEYPAIR`, `ATTESTER_KEYPAIR`, `DEPLOYER_KEYPAIR` via Zod; falhar se ausente; confirmar que o cluster é devnet.
**Inputs:** env vars.
**Outputs:** configuração validada; chaves de devnet geradas em `~/.config/solana`.
**Segurança:** `ATTESTER` e `ADMIN` em caminhos distintos; bootstrap falha se forem a mesma chave.
**Testes:** teste de validação com env incompleto e com chaves duplicadas.
**Acceptance:** `npm run check:env` passa; bootstrap falha com mensagem clara em cluster ≠ devnet.

---

### TASK SOL-003 — Bootstrap do programa

**Objetivo:** fazer o programa implantável e inicializável.
**Dependências:** SOL-001, SOL-002.
**Componentes:** `lib.rs`, `state.rs`, `errors.rs`, `constants.rs`, `Cargo.toml`.
**Lógica:** `#[program]` vazio com as 8 funções placeholder; `declare_id!`; `error.rs` com os códigos 6000-6041; `bump` canônico.
**Segurança:** `#![deny(missing_docs)]`; sem `unwrap()` em caminho alcançável.
**Testes:** `anchor test` compila e roda vazio.
**Acceptance:** programa compila; todos os erros definidos; `anchor deploy` bem-sucedido na devnet.

---

### TASK SOL-004 — Contas `Corridor` e `SettlementAsset`

**Objetivo:** estado de configuração do rail.
**Dependências:** SOL-003.
**Componentes:** `state/corridor.rs`, `state/settlement_asset.rs`.
**Lógica:** `Corridor` keyed `[b"corridor", code]`; `SettlementAsset` keyed `[b"asset", corridor, iso]`; validação de dono do mint e do token account no registro.
**Inputs:** `initialize_corridor`, `register_settlement_asset`.
**Outputs:** contas criadas; mints registrados.
**Segurança:** admin verificado; discriminantes de token program verificados explicitamente; `decimals` conferido contra o mint.
**Testes:** T-01, T-16, T-18.
**Acceptance:** Corridor e assets registráveis; conta de token program errada é rejeitada.

---

### TASK SOL-005 — `WalletRegistry` e `set_wallet_status`

**Objetivo:** a allowlist que é o produto.
**Dependências:** SOL-003, SOL-004.
**Componentes:** `state/wallet.rs`, `instructions/set_wallet_status.rs`.
**Lógica:** verifica atestação ed25519 do `attester` com `kind = WALLET`; cria ou atualiza o registro; imutável após revogação.
**Segurança:** **único caminho de onboarding**; atestação validada com anti-replay.
**Testes:** T-15, T-11, T-12.
**Acceptance:** wallet não registrada não transaciona; sem assinatura do attester reverte.

---

### TASK SOL-006 — Criação dos mints Token-2022

**Objetivo:** `pgBRL`, `pyPYG` e `tsUSD` com as extensões corretas.
**Dependências:** SOL-004.
**Componentes:** `scripts/bootstrap-mints.ts`.
**Lógica:** `createMint` com Token-2022. `pgBRL` e `pyPYG`: extensões `TransferHook`, `MetadataPointer`, `TokenMetadata`, `PermanentDelegate`. `tsUSD`: **sem** `TransferHook` (pivô interno, compliance desnecessário, poupa CU) — apenas `MetadataPointer`, `TokenMetadata` e `PermanentDelegate`. Todos com mint authority = PDA `["mint"]`, freeze authority = PDA, e `TokenMetadata` com `fullyBacked: false` e o aviso de devnet.
**Segurança:** mint authority é PDA, nunca wallet; metadados declaram ausência de lastro; `tsUSD` declara `testStablecoin: true` e `notice: "NOT USDT. NO REDEMPTION."`.
**Testes:** script de verificação que falha se alguma extensão estiver ausente, e falha se `tsUSD` tiver `TransferHook`.
**Acceptance:** três mints criados; `transferChecked` funciona em `pgBRL`/`pyPYG`; metadados legíveis on-chain; `tsUSD` transferível sem hook.

---

### TASK SOL-007 — `mint_from_attestation`

**Objetivo:** emissão condicionada e anti-replay.
**Dependências:** SOL-005, SOL-006.
**Componentes:** `instructions/mint_from_attestation.rs`, `attestations.rs`.
**Lógica:** canonicalizar payload → verificar ed25519 → `init` do PDA `Attestation` (replay falha) → validar `expiry`/`amount`/`mint`/`destination` → `max_supply` → CPI `mint_to` com `invoke_signed`.
**Segurança:** verificação canônica e length-delimited; PDA `init` como barreira anti-replay; `max_supply` como defesa contra attester comprometido.
**Testes:** T-02, T-03, T-04, T-05.
**Acceptance:** replay reverte; atestação expirada reverte; cap respeitado.

---

### TASK SOL-008 — `settle`

**Objetivo:** a liquidação atômica de duas pernas.
**Dependências:** SOL-006, SOL-007.
**Componentes:** `instructions/settle.rs`, `state/settlement.rs`.
**Lógica:** `init` do PDA `Settlement` → validações → verificar atestação de cotação → `payer` e `recipient` `ALLOWED` → saldo do vault → **queimar ANTES de transferir** → calcular `amount_out` → `min_out` → `TransferChecked` com hook → gravar Settlement imutável.
**Segurança:** aritmética `checked_*`; ordem queimar→transferir; `min_out` obrigatório; spread cap on-chain.
**Testes:** T-06 a T-10, T-13, T-19, T-20.
**Acceptance:** settle bem-sucedido grava Settlement; falha em qualquer passo posterior ao burn deixa o pagador intacto.

---

### TASK SOL-009 — `transfer_hook`

**Objetivo:** compliance inevitável.
**Dependências:** SOL-005, SOL-006.
**Componentes:** `instructions/transfer_hook.rs`, `extra_accounts.rs`.
**Lógica:** resolver mint registrado; `Corridor.paused` falso; origem **e** destino `ALLOWED`; falhar fechado.
**Segurança:** **estritamente read-only — nunca mutar estado.** Validação de `extra_accounts` completa. Falha fechada.
**Testes:** T-11, T-12, **T-17 (teste que falha se o hook mutar estado)**.
**Acceptance:** transferência para wallet não registrada reverte; hook não escreve em nenhuma conta.

---

### TASK SOL-010 — `revoke`

**Objetivo:** chargeback com poder real e escopo delimitado.
**Dependências:** SOL-008.
**Componentes:** `instructions/revoke.rs`.
**Lógica:** atestação do `attester`; burn via permanent delegate; marcar Settlement `REVOKED`.
**Segurança:** único uso do permanent delegate; atestação obrigatória; reason hash obrigatório.
**Testes:** T-14.
**Acceptance:** `revoke` queima sem assinatura do dono; Settlement marcado.

---

### TASK SOL-011 — `pause` / `unpause`

**Objetivo:** parada de emergência.
**Dependências:** SOL-004, SOL-009.
**Componentes:** `instructions/pause.rs`.
**Lógica:** admin alterna `paused`; hook e settle consultam.
**Segurança:** admin-only; pausa bloqueia transferências e settles.
**Testes:** T-13.
**Acceptance:** pausado bloqueia tudo; não-admin não pausa.

---

### TASK SOL-012 — Testes de integração do programa

**Objetivo:** a suíte T-01 a T-20 verde.
**Dependências:** SOL-003 a SOL-011.
**Componentes:** `tests/`.
**Lógica:** setup por `Bankrun` ou `solana-test-validator`; bootstrap; testes de caminho feliz e de erro; teste de invariante.
**Segurança:** cobrir explicitamente replay, double-settle, slippage, allowlist, overflow, hook read-only.
**Testes:** T-01 a T-20; teste de propriedade do invariante.
**Acceptance:** suíte completa verde; T-17 falha se o hook for modificado para mutar.

---

### TASK SOL-013 — CLI de bootstrap

**Objetivo:** um comando cria o rail inteiro.
**Dependências:** SOL-004 a SOL-011.
**Componentes:** `scripts/bootstrap.ts`.
**Lógica:** `initialize_corridor` → criar 3 mints → `register_settlement_asset` (pgBRL, pyPYG, tsUSD) → criar vaults → `set_wallet_status` para admin, treasury dev e adquirente.
**Segurança:** falha se cluster ≠ devnet; falha se admin == attester.
**Testes:** execução contra devnet; teste de guarda de cluster.
**Acceptance:** `npm run bootstrap` do zero cria o rail funcional.

---

### TASK SOL-014 — Schema do banco

**Objetivo:** persistência de §25.
**Dependências:** nenhuma.
**Componentes:** `backend/migrations/0001_init.sql`.
**Lógica:** DDL completo; constraints de estado; RLS em todas as tabelas.
**Segurança:** RLS com `organizations` como fronteira; `api_keys.key_hash` nunca exposto.
**Testes:** testes de RLS (cross-org negado); testes de constraint.
**Acceptance:** migrations aplicam; RLS nega acesso cross-organização.

---

### TASK SOL-015 — Auth e API keys

**Objetivo:** o Persona 4 pode existir.
**Dependências:** SOL-014.
**Componentes:** `backend/src/auth/`.
**Lógica:** Supabase Auth (email+senha) para o dashboard; API key `pk_live_<32 hex>` para integradores; hash SHA-256; RPC `create_api_key` retorna a crua uma vez; middleware aceita JWT **ou** API key.
**Segurança:** hash no banco, crua exibida uma vez; service role nunca exposta.
**Testes:** criação, revogação, uso, cross-org (404, não 403).
**Acceptance:** API key funciona em `curl`; revogada deixa de funcionar; cross-org devolve 404.

---

### TASK SOL-016 — Máquina de estados e repositório

**Objetivo:** o ciclo de vida da operação.
**Dependências:** SOL-014.
**Componentes:** `domain/state-machine.ts`, `db/repositories/operations.ts`, `db/repositories/events.ts`.
**Lógica:** `created → awaiting_pix → pix_confirmed → tokenized → settling → settled → offramping → paid_out`; terminais `failed`, `revoked`. Toda transição grava `operation_events`.
**Segurança:** transição inválida → 409; sem caminho para reverter de um estado terminal.
**Testes:** todas as transições válidas e inválidas; timeline completa.
**Acceptance:** máquina de estados irredutível; toda mudança auditável.

---

### TASK SOL-017 — Canonicalização e assinatura de atestações

**Objetivo:** o backend tem o mesmo formato canônico que o programa.
**Dependências:** SOL-003.
**Componentes:** `backend/src/attestations/`.
**Lógica:** serialização binária canônica e **length-delimited**; `kind`, `version`, `corridor`, `mint`, `amount`, `expiry`, `nonce`; assinar ed25519; hash SHA-256 para o PDA.
**Segurança:** length-delimited evita ambiguidade de concatenação (ataque de colisão de campos); ordem de campos fixa e versionada.
**Testes:** vetores de teste compartilhados com o programa Rust — **os mesmos bytes** para a mesma entrada em ambas as implementações.
**Acceptance:** payload canônico idêntico em Rust e TypeScript; assinatura verificada pelo programa.

---

### TASK SOL-018 — `BlockchainClient`

**Objetivo:** a única porta para a chain.
**Dependências:** SOL-003.
**Componentes:** `backend/src/adapters/chain/`.
**Lógica:** IDL do Anchor; construir, assinar, enviar, confirmar; retry com backoff; traduzir erros Anchor para os códigos de API.
**Segurança:** módulo único autorizado a construir transações; erros do provider sanitizados; nada de chave em log.
**Testes:** contra devnet; mapeamento de erro.
**Acceptance:** nenhum outro módulo constrói transação; erros Anchor não vazam texto.

---

### TASK SOL-019 — `RateOracle` e atestação de cotação

**Objetivo:** cotação assinada antes da chain.
**Dependências:** SOL-017.
**Componentes:** `adapters/rate-oracle/`.
**Lógica:** obter taxa; aplicar spread ≤ `rate_cap_bps`; assinar atestação `kind = RATE` com expiry curto; cache curto.
**Segurança:** nunca servir cotação expirada; teto de spread aplicado antes de assinar.
**Testes:** spread respeitado; expiração curta; rejeição de cotação expirada.
**Acceptance:** `/v1/quote` retorna atestação válida; spread nunca excede o cap.

---

### TASK SOL-020 — Adaptador de rail de fiat

**Objetivo:** a fronteira do on-ramp.
**Dependências:** SOL-015, SOL-016.
**Componentes:** `adapters/fiat-rail/ozav.ts`, `adapters/fiat-rail/mock.ts`, `workers/webhook.ts`.
**Lógica:** interface `FiatRailProvider`; mock gera BR Code EMV válido e confirma via webhook HMAC; ingestão idempotente por `external_id`; assinatura verificada antes de processar.
**Segurança:** **nunca emitir sem confirmação assinada**; payload de webhook gravado por hash; rejeitar assinatura inválida.
**Testes:** B-03, B-04, B-07, B-08.
**Acceptance:** mock gera BR Code válido; webhook duplicado processado uma vez; sem assinatura, nenhum mint.

---

### TASK SOL-021 — Adaptador de off-ramp

**Objetivo:** a fronteira do destino.
**Dependências:** SOL-015.
**Componentes:** `adapters/off-ramp/mock.ts`, `adapters/off-ramp/paraguay.ts` (stub).
**Lógica:** mock converte `pyPYG` → PYG com latência artificial de 3s e referência de payout; idempotente por `operation_id`.
**Segurança:** idempotência obrigatória; falha não reverte o settlement on-chain.
**Testes:** B-09; idempotência do payout.
**Acceptance:** `pyPYG` entregue mesmo com off-ramp indisponível; payout retenta.

---

### TASK SOL-022 — Settlement coordinator

**Objetivo:** at-most-once na fronteira mais perigosa.
**Dependências:** SOL-016, SOL-018.
**Componentes:** `domain/settlement.ts`.
**Lógica:** portar o padrão de `supabase/functions/_shared/settlement-coordinator.ts` do repositório atual: `claim` → `broadcast` → `persist` → `reconcile`. Hash persistido **antes** de aguardar confirmação.
**Segurança:** **sequência rígida**; falha de persistência ⇒ `SETTLEMENT_PENDING`, nunca re-broadcast; `settling` sem hash ⇒ `SETTLEMENT_RECONCILIATION_REQUIRED`.
**Testes:** B-05, B-06, T-07 (double-settle bloqueado on-chain).
**Acceptance:** nenhuma liquidação duplicada em nenhuma ordem de falha; hash nunca perdido.

---

### TASK SOL-023 — API HTTP

**Objetivo:** a superfície de §26.
**Dependências:** SOL-015, SOL-016, SOL-019, SOL-022.
**Componentes:** `backend/src/api/`.
**Lógica:** Fastify; rotas de §26; middleware de auth; error handler único; `requestId` por requisição.
**Segurança:** validação Zod em toda entrada; CORS explícito; rate limiting; sem detalhe interno em resposta.
**Testes:** B-01, B-02, B-11, B-12.
**Acceptance:** todas as rotas de §26 respondem conforme a spec; erros no formato único.

---

### TASK SOL-024 — Workers de reconciliação

**Objetivo:** nunca deixar operação presa.
**Dependências:** SOL-018, SOL-022.
**Componentes:** `workers/settlement-reconciler.ts`, `workers/reserve-reconciler.ts`.
**Lógica:** settlement — `settling` com hash → consultar chain → `confirmed`/`failed`; `settling` sem hash → alerta. Reserva — diário, comparar supply ↔ atestado, alerta; > 1% → pausa.
**Segurança:** falha de RPC não perde hash; divergência grave pausa o corredor.
**Testes:** B-06, B-10; retry e dead-letter.
**Acceptance:** operação presa é recuperada; divergência detectada e escalada.

---

### TASK SOL-025 — Fundação do frontend

**Objetivo:** o shell e a linguagem visual.
**Dependências:** SOL-001.
**Componentes:** `web/src/`.
**Lógica:** Vite + React 19 + Tailwind 4 + Radix; Manrope e IBM Plex Mono; rotas; i18n pt/en; selo `DEVNET` global.
**Segurança:** nenhuma variável `VITE_*` sensível; nenhum segredo no bundle.
**Testes:** smoke test; build.
**Acceptance:** app sobe; layout consistente com a Peragus; selo DEVNET visível.

---

### TASK SOL-026 — Conexão de wallet

**Objetivo:** o adquirente assina.
**Dependências:** SOL-025.
**Componentes:** `web/src/lib/wallet/`, modal de conexão.
**Lógica:** `@solana/wallet-adapter`; Phantom em devnet; mostrar endereço, saldo e conexão.
**Segurança:** assinar apenas o que o usuário vê; rejeitar transação não reconhecida.
**Testes:** conectar, desconectar, tratar recusa.
**Acceptance:** conecta em devnet; endereço exibido corretamente.

---

### TASK SOL-027 — Criação de operação

**Objetivo:** o primeiro ato do produto.
**Dependências:** SOL-023, SOL-025.
**Componentes:** `web/src/pages/operations/New.tsx`.
**Lógica:** formulário (valor, corridor, wallet de destino, `requestId`); exibe BR Code; polling de status.
**Segurança:** validação client + server; `requestId` visível ao usuário.
**Testes:** criação; erro de validação; idempotência.
**Acceptance:** operação criada; BR Code exibido com aviso de que é sandbox.

---

### TASK SOL-028 — Detalhe da operação e assinatura

**Objetivo:** a tela que é o produto.
**Dependências:** SOL-022, SOL-026, SOL-027.
**Componentes:** `web/src/pages/operations/Detail.tsx`, componentes de timeline, `proof`.
**Lógica:** timeline de estados; tx signatures; links do explorer; painel de prova; botão de assinar; cotação com spread e expiry.
**Segurança:** links do explorer apontam para `cluster=devnet`; payload de atestação exibido em claro, para auditoria.
**Testes:** assinatura completa; reuso do mesmo componente para o bundle de prova.
**Acceptance:** operação completa visível; assinatura funciona; links do explorer corretos.

---

### TASK SOL-029 — Painel de reserva

**Objetivo:** lastro verificável.
**Dependências:** SOL-024, SOL-025.
**Componentes:** `web/src/pages/Reserve.tsx`.
**Lógica:** supply on-chain por ativo; atestação do parceiro; delta; `validUntil`; botão de simular divergência (demo).
**Segurança:** texto "sem lastro" e selo DEVNET obrigatórios; nada que sugira lastro real.
**Testes:** render com e sem divergência; expiração da atestação.
**Acceptance:** supply e atestação visíveis lado a lado; divergência detectada visualmente.

---

### TASK SOL-030 — E2E e roteiro da demo

**Objetivo:** a entrega.
**Dependências:** SOL-012 a SOL-029.
**Componentes:** `web/tests/e2e/demo.spec.ts`, `docs/DEMO_SCRIPT.md`.
**Lógica:** Playwright no caminho completo; script de 10 passos; botão de injeção de falta de liquidez; botão de divergência de reserva.
**Segurança:** E2E usa a API key de teste, nunca a real.
**Testes:** `demo-happy-path` verde; `demo-rollback` verde.
**Acceptance:** o caminho completo roda de ponta a ponta; os três momentos obrigatórios da §35.2 são demonstráveis sob demanda.

---

## 42. Acceptance Criteria

### 42.1 Programa

- [ ] `anchor test` com T-01 a T-20 verdes
- [ ] Replay de atestação reverte
- [ ] Double-settle reverte
- [ ] Slippage reverte com o pagador intacto
- [ ] Vault insuficiente reverte com o pagador intacto
- [ ] Transferência para wallet não registrada reverte em 100% dos caminhos
- [ ] `transfer_hook` não muta estado (verificado por teste)
- [ ] `max_supply` respeitado
- [ ] Upgrade authority distinta de toda chave operacional

### 42.2 Backend

- [ ] Idempotência em criação, webhook, mint, settle e payout
- [ ] Hash de tx persistido antes de aguardar confirmação
- [ ] `settling` sem hash → `SETTLEMENT_RECONCILIATION_REQUIRED`
- [ ] Nenhum mint sem confirmação assinada
- [ ] Erros sem detalhe interno
- [ ] RLS nega cross-organização
- [ ] Reconciliação diária executa e escala divergência

### 42.3 Frontend

- [ ] Wallet conecta e assina
- [ ] Timeline mostra todos os estados com timestamp
- [ ] Links do explorer corretos com `cluster=devnet`
- [ ] Painel de reserva mostra supply, atestação e delta
- [ ] Selo `DEVNET` em todas as telas que tocam a chain

### 42.4 Demo

- [ ] Caminho completo E2E em menos de 5 minutos
- [ ] Rollback atômico demonstrável sob demanda
- [ ] Replay rejeitado demonstrável
- [ ] Divergência de reserva detectada demonstrável
- [ ] As quatro declarações de honestidade (§35.3) no roteiro

---

## 43. Definition of Done

O trabalho está **pronto para submissão** quando:

1. **Programa** — todas as 20 acceptance criteria de §42.1 verdes, código em `main`, sem warnings de compilação relevantes.
2. **Backend** — todas as 7 de §42.2 verdes; migrations aplicáveis do zero; erros sanitizados.
3. **Frontend** — todas as 5 de §42.3 verdes; build de produção sem erro.
4. **E2E** — `demo-happy-path` e `demo-rollback` verdes; roteiro ensaiado ao menos 3 vezes.
5. **Documentação** — `README.md` com setup do zero, decisões de arquitetura com a justificativa, e a matriz REAL/MOCK/INTEGRAÇÃO explícita.
6. **Honestidade** — a matriz REAL/MOCK/INTEGRAÇÃO do §32 é refletida na UI e no `README`.
7. **Repositório** — público, com `Anchor.toml`, IDL commitado, sem segredos, sem caminho de mainnet.
8. **Vídeo** — gravado, ≤ 5 minutos, cobrindo os 10 passos de §35.1.

**Não é Definition of Done:** funcionar na mainnet, ter lastro real, ter integração OZAV real, ou ter integração real com o PSP paraguaio. Nenhum desses está no escopo.

---

## 44. Open Questions

| ID | Pergunta | Impacto | Encaminhamento |
|---|---|---|---|
| ~~Q-01~~ | ~~Qual PSP faz o off-ramp `pyPYG`/USDT → PYG no Paraguai?~~ **RESOLVIDO: dLocal** — API pública documentada para payout PYG via SIPAP, fluxo `B2B`, source currency `USD` | **FECHADO** | Ver §20.3. Restam três pendências comerciais, não técnicas: onboarding KYB, tabela de fees/spread, confirmação de SLA e limites no PY |
| **Q-02** | O `attester` de produção é o OZAV, um banco ou uma ATH? | **ALTO** — determina a cadeia de confiança | Decisão com o parceiro regulado |
| **Q-03** | O saldo de BRL fica em conta segregada de quem? O Peragus pode ser o titular da conta, ou só pode ser beneficiário? | **ALTO** — determina se a Peragus é custodiante | **Jurídico + parceiro** |
| **Q-04** | A mutação de `Corridor.attester` deve exigir timelock? | **MÉDIO** — rotação de chave é superfície de ataque | Decisão de arquitetura de segurança |
| **Q-05** | O adquirente é contraparte da Peragus ou há uma terceira parte pagadora no meio? | **ALTO** — afeta REG-01 diretamente | Comercial + jurídico |
| **Q-06** | A Peragus precisa de autorização no Paraguai (BCP)? | **ALTO** — pode impedir o MVP em produção | **Jurídico**; não pesquisado nesta spec |
| **Q-07** | `USDT` na Solana tem liquidez suficiente para o volume esperado? | **MÉDIO** | Análise de mercado; USDC é alternativa (registro trivial) |
| **Q-08** | A taxa e o spread são da Peragus ou do adquirente? | **MÉDIO** — define o modelo de receita | Comercial |
| **Q-09** | A demo precisa de um fluxo reverso (PYG → BRL) para mostrar simetria? | **BAIXO** | Cortável; `register_settlement_asset` tornaria trivial |
| **Q-10** | O que o mock de histórico mostra? 17 dias pode ser curto para um hackathon de pitch | **BAIXO** | Avaliar com o time |
| **Q-11** | **OZAV + dLocal, ou dLocal como contraparte única das duas pernas de fiat?** | **MÉDIO** — define o grafo de parceiros e a exposição a contraparte | **Adiado para depois da demo, explicitamente.** As duas implementações ficam especificadas (`OzavFiatRailProvider` em §17, `DLocalOffRampProvider` em §20.2) e a escolha é tomada após a validação de Q-13. Ver §37.5 sobre por que adiar é a decisão correta aqui |
| **Q-12** | ~~Qual o perfil do parceiro de produção?~~ **RESPOSTA DADA: VASP licenciado, operando sob a Res. BCB 521.** Isto fecha a *decisão de produto* e confirma B'. **Não fecha a questão jurídica** | **CRÍTICO** | **Re-escopada como validação (Q-13).** A resposta é uma hipótese adotada, não um fato verificado |
| **Q-13** | **Validação jurídica do canal:** (a) a Res. BCB 521, na redação vigente, de fato cobre a operação descrita; (b) há exigência de capital ou segregação que a inviabilize; (c) o parceiro pretendido **tem** essa autorização, e qual é; (d) a contraparte paraguaia aceita stablecoin como compensação ou exige fiat convencional | **CRÍTICO** — pode invalidar o desenho de produção | **Jurídico. Antes de qualquer conversa comercial.** Ver §37.3, §37.5 e K-17/K-18 |

---

## 45. Decisions Made

Registro das decisões tomadas nesta especificação, com o motivo. Uma decisão só entra aqui se foi **discutida**; a coluna "Alternativas descartadas" registra o que foi considerado e por que a decisão atual é a correta.

| # | Decisão | Alternativas descartadas | Motivo |
|---|---|---|---|
| D-01 | **Rail de liquidação para adquirentes** | Conversão de tesouraria B2B; round-trip BRL→USDC→BRL | O modelo de adquirente dá à permissionamento um caso de uso real e torna a reconciliação concreta |
| D-02 | **Corredor BRL → PYG** | MXN; COP; BRL→USDC→BRL | O guaraní é referenciado ao dólar; o par tem volume real; a demo fica mais clara |
| D-03 | **Token-2022, não SPL Token** | SPL Token clássico | Em SPL, a transferência ocorre direto entre token accounts e o programa **nunca é chamado** — compliance é impossível |
| D-04 | **Transfer Hook** | Só freeze authority; validação off-chain | É o único mecanismo que torna a compliance inevitável: `Transfer` simples falha com `MissingRequiredTransferHook` |
| D-05 | **Mint authority = PDA** | Multisig; hot wallet | Nenhuma chave humana pode emitir. Padrão oficial do Anchor via `invoke_signed` |
| D-06 | **Vault = PDA** | Hot wallet com liquidez | Nenhuma chave humana move fundos. Separar custódia deSigner |
| D-07 | **Atestação ed25519 como único portão** | Oracle on-chain; permissão centralizada | Verificável on-chain, sem latência, com anti-replay por construção |
| D-08 | **Atomicidade em vez de flashloan** | Flashloan para evitar stablecoin em mãos intermediárias | **A atomicidade da transação já entrega a propriedade desejada.** Flashloan acrescentaria fee, dependência e CU sem ganho. Ver §36.2 |
| D-09 | **B' (código B, papel A)** | B puro; A puro | B puro captura risco regulatório sem estrutura. B' é a única posição defensável em produto e conformidade |
| D-10 | **Dois tokens no MVP** | Só `pgBRL` | `pyPYG` dá ao adquirente um float on-chain com off-ramp sob demanda — função real, não ornamental |
| D-11 | **`tsUSD` (pivô de teste) em devnet; `USDT` em produção** | USDC; USDC em devnet; airdrop de stablecoin | **Verificado em RPC: não existe USDT nem USDC canônico em devnet**, e o USDT de mainnet é SPL legado, não Token-2022. Um validador de mint hardcoded em Token-2022 rejeitaria o pivô de produção. `token_program` por ativo resolve os dois. Ver §12.1.1 |
| D-12 | **6 decimais uniformes** | 2 para fiat, 6 para stable | Elimina uma classe inteira de bugs de precisão |
| D-13 | **Permanent delegate só em `revoke`** | Usar também em `settle` | Minimiza o poder de confisco; `settle` usa burn normal com assinatura do pagador |
| D-14 | **Sem `Default Account State`** | Conta congelada por padrão | Redundante com o hook; adiciona risco de deadlock no onboarding |
| D-15 | **Wallet corporativa no MVP** | Multisig Squads | Suficiente para a demo; multisig é alvo de produção |
| D-16 | **Devnet only** | Mainnet | Sem licença, sem capital, sem lastro real. Nenhum caminho de mainnet no repo |
| D-17 | **Off-ramp PYG mockado** | Integrar agora | Parceiro comercial não onboardado. Interface real, implementação fake; a implementação real é `DLocalOffRampProvider` (§20.3) |
| D-18 | **Greenfield** | Reaproveitar o repo atual | Auth, API keys e docs são produto, não hackathon. Mas o **padrão de settlement coordinator** e de idempotência é portado |
| D-19 | **Um programa só** | Dois (token controller + settlement) | YAGNI. Duplicaria autoridade sem ganho |
| D-20 | **Cofres como vault, não AMM** | AMM on-chain | Problema resolvido, caro, sem liquidez no devnet. Peragus **é** a contraparte de liquidez |
| D-21 | **`max_supply` por ativo** | Nenhum | Limita a exposição a um attester comprometido |
| D-22 | **`rate_cap_bps` e `expiry` on-chain** | Validação só no backend | O backend não pode furar limites que são a defesa contra attester comprometido |
| D-23 | **Metadata declara ausência de lastro** | Metadata neutro | Um token de teste que fingisse lastro é risco de imagem e de leitura regulatória |
| D-24 | **Admin e attester separados** | Uma chave só | Se o admin vazar, o atacante pausa o sistema; não consegue emitir lastro falso |
| D-25 | **Hook read-only** | Hook com estado | CPI circular: o hook é reentrado dentro do nosso próprio `settle`. Read-only o torna reentrante-seguro por construção |
| D-26 | **Queimar antes de transferir** | Transferir antes de queimar | A ordem inversa cria buraco de lastro em falha parcial |
| D-27 | **`Corridor` keyed por `code`** | Chave única | Multi-corredor vira configuração, não código novo |
| D-28 | **Nenhuma conta de preço on-chain** | Feed on-chain | A cotação assinada é mais simples e mais honesta |
| D-29 | **Ledger de saldos não é reimplementado** | Tabela de saldos | SPL já é o ledger. Reimplementar é bug esperando |
| D-30 | **`request_id` como chave de idempotência** | Idempotência só on-chain | O banco é a fronteira da API; a chain é a fronteira do valor |
| D-31 | **Off-ramp PYG = dLocal** | Continuar como MOCK / aguardar definição de parceiro | dLocal publica API documentada para payout PYG via SIPAP com source currency em USD — mapeia 1:1 no `OffRampProvider` (§20.3). O mock permanece para a demo |
| D-32 | **A perna em stablecoin deve rodar no canal da Res. BCB 521, nunca no canal de câmbio eletrônico** | Deixar o enquadramento regulatório implícito | A Res. BCB 561 (vigente desde 2026-10-01) veda a stablecoin na perna offshore para instituições de pagamento, emissores de e-money e adquirentes. Isso **reforça** B': a Peragus é fornecedora de infraestrutura, e a liquidação é do parceiro no canal em que ele estiver autorizado (§37.3) |
| D-33 | **O parceiro de produção será um VASP licenciado, operando sob a Res. BCB 521** | Escolher o parceiro depois | É o único perfil em que a perna em stablecoin é permitida após a 561, e é o único compatível com B'. **É hipótese adotada pelo time, não parecer validado** — a validação está em Q-13 e é condição de qualquer conversa comercial |
| D-34 | **Q-11 (grafo de parceiros) fica explicitamente adiado para depois da demo** | Consolidar OZAV + dLocal agora | A escolha depende de quais autorizações o parceiro de fato tem, e essa informação não existe ainda. Adiar custa zero na demo, que roda em devnet com mocks. Ver §37.5 |

---

## Apêndice A — Glossário

| Termo | Significado |
|---|---|
| **Adquirente** | Instituição que processa pagamentos para merchants e liquida com a rede |
| **Atestação** | Assinatura ed25519 sobre um payload canônico, verificável on-chain |
| **Attester** | Chave que assina atestações de lastro, cotação e allowlist |
| **Corredor** | Par de moedas com parâmetros de settlement próprios |
| **Lastro** | Ativo que respalda 1:1 um token; aqui, fiat off-chain |
| **Mint authority** | Autoridade que pode criar unidades de um token |
| **`tsUSD`** | Stablecoin de teste do devnet que ocupa o papel de pivô de settlement. Sem lastro, símbolo explícito |
| **`token_program`** | Programa dono de um mint. O rail usa dois: Token-2022 (`TokenzQd…`) e SPL legado (`Tokenkeg…`) |
| **Permanent delegate** | Extensão Token-2022 que permite a um programa mover tokens de qualquer conta |
| **PDA** | Program Derived Address — endereço derivado, sem chave privada, controlado pelo programa |
| **Perda de lastro** | Divergência entre supply on-chain e reserva do parceiro |
| **Rail** | Infraestrutura sobre a qual a liquidação ocorre |
| **Settlement** | Registro imutável de uma liquidação executada |
| **Transfer hook** | Programa invocado pelo Token-2022 em toda transferência de um mint |
| **Vault** | Token account PDA que hospeda a liquidez do programa |

## Apêndice B — Referências

- Token-2022 e extensões: `https://solana.com/docs/tokens/extensions`
- Transfer Hook: `https://solana.com/docs/tokens/extensions/transfer-hook`
- Anchor — mint com PDA mint authority via CPI: `https://www.anchor-lang.com/docs/tokens/basics/mint-tokens`
- Anchor — interagir com tokens em programas: `https://solana.com/developers/cookbook/games/interact-with-tokens`
- Colosseum Crypto World's Fair: `https://colosseum.com/hackathon`
- OZAV: `https://ozav.com.br`
- Banco Central do Paraguay: `https://www.bcp.gov.py`
- Banco Central do Brasil: `https://www.bcb.gov.br`

---

**Fim da especificação.**
