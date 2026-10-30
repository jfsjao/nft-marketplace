# Contratos REST e eventos

Fonte da verdade: schemas em `src/domain/*.ts`. Regras operacionais: itens 2 e 5 a 10 de `complemento-planejamento.md`. Este documento define o contrato; não comprova implementação dos handlers ou do transporte.

## 1. Convenções

- Base REST: `/api`. As rotas abaixo são relativas à base. Corpos e respostas com conteúdo usam JSON.
- Autenticação: `Authorization: Bearer <token>`. O token opaco e `expiresAt` vêm de `sessionSchema`; sessão ausente, inválida ou expirada retorna 401.
- Carrinho de visitante: `X-Guest-Id: <guestId>`. Com sessão, a identidade do carrinho é o usuário autenticado. Nunca usar o header para acessar carrinho privado.
- `POST /orders` exige `Idempotency-Key: <key>`, vinculada ao usuário e ao corpo enviado.
- ETH trafega como string decimal, com até 18 casas, conforme `ethAmountSchema`, nunca como número JSON. Datas seguem `isoDateSchema`.
- `versionSchema` é inteiro não negativo e crescente por recurso. `version` existe em usuário, carteira, NFT, edição e pedido. Carrinho usa `revision`; linhas de carrinho/cotação usam `editionVersion`; cotação guarda `cartRevision`. Não adicionar `version` aos demais envelopes.
- Recursos privados e caches são isolados por `userId`; cache do carrinho inclui identidade de usuário ou visitante. NFT público não contém `isFavorite`; compor com `favoritesSchema`.
- Leituras podem repetir no máximo duas vezes em falha transitória; 4xx não repetem. Mutations não têm retry genérico. Cancelar requests com `AbortSignal` e descartar callbacks e rollbacks de geração de sessão anterior.

Todo erro usa `apiErrorSchema`: `{ code, message, fieldErrors?, requestId, quote? }`. `fieldErrors` mapeia campo para array de mensagens. `quote`, quando presente, segue `quoteSchema`; em `QUOTE_STALE`, traz a nova cotação. A UI decide por `code`, nunca pelo texto.

| Código                 | Status HTTP | Significado                                        |
| ---------------------- | ----------- | -------------------------------------------------- |
| `VALIDATION_ERROR`     | 400 ou 422  | Campos inválidos; detalhes em `fieldErrors`        |
| `UNAUTHORIZED`         | 401         | Sessão ausente, inválida ou expirada               |
| `FORBIDDEN`            | 403         | Recurso de outro usuário                           |
| `NOT_FOUND`            | 404         | Recurso inexistente                                |
| `CONFLICT`             | 409         | E-mail/usuário já cadastrado ou carteira duplicada |
| `IDEMPOTENCY_CONFLICT` | 409         | Mesma chave com corpo diferente                    |
| `OUT_OF_STOCK`         | 409         | Edição esgotada ou quantidade acima do disponível  |
| `QUOTE_STALE`          | 409         | Cotação desatualizada; inclui nova `quote`         |
| `COUPON_INVALID`       | 422         | Cupom inválido                                     |
| `COUPON_EXPIRED`       | 422         | Cupom expirado                                     |
| `PAYMENT_DECLINED`     | 402         | Pagamento recusado                                 |
| `SERVICE_UNAVAILABLE`  | 503         | Falha transitória                                  |

Exemplos de envelopes, com status informado fora do corpo:

```text
400 {"code":"VALIDATION_ERROR","message":"Corpo inválido","requestId":"r1"}
401 {"code":"UNAUTHORIZED","message":"Sessão expirada","requestId":"r2"}
403 {"code":"FORBIDDEN","message":"Pedido de outro usuário","requestId":"r3"}
404 {"code":"NOT_FOUND","message":"NFT inexistente","requestId":"r4"}
409 {"code":"OUT_OF_STOCK","message":"Edição esgotada","requestId":"r5"}
422 {"code":"VALIDATION_ERROR","message":"Revise os campos","fieldErrors":{"email":["E-mail inválido"]},"requestId":"r6"}
503 {"code":"SERVICE_UNAVAILABLE","message":"Tente novamente","requestId":"r7"}
```

## 2. Endpoints

Auth: `pública` dispensa sessão; `usuário` exige Bearer; `carrinho` aceita Bearer ou `X-Guest-Id`. `nenhum` indica ausência de corpo/query. Respostas sem corpo usam 204, sem schema JSON; as demais usam 200, salvo criação de conta/pedido (201). A lista de carteiras é um array de `walletSchema`, sem envelope adicional.

Erros comuns a todas as rotas: `VALIDATION_ERROR` para entrada inválida e `SERVICE_UNAVAILABLE` para falha transitória. Rotas de usuário também retornam `UNAUTHORIZED`; operações de carrinho com Bearer inválido retornam 401. A coluna lista os demais erros aplicáveis. Todos seguem `apiErrorSchema`.

| Método | Rota                            | Auth     | Corpo/query -> schema              | Resposta -> schema             | Erros adicionais                                                                                    |
| ------ | ------------------------------- | -------- | ---------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                | pública  | corpo: `registerInputSchema`       | 201: `sessionSchema`           | `CONFLICT`                                                                                          |
| POST   | `/auth/login`                   | pública  | corpo: `loginInputSchema`          | `sessionSchema`                | `UNAUTHORIZED`                                                                                      |
| GET    | `/auth/session`                 | usuário  | nenhum                             | `sessionSchema`                | nenhum                                                                                              |
| POST   | `/auth/logout`                  | usuário  | nenhum                             | 204: sem corpo                 | nenhum                                                                                              |
| GET    | `/nfts`                         | pública  | query: `catalogQuerySchema`        | `nftListSchema`                | nenhum                                                                                              |
| GET    | `/nfts/:id`                     | pública  | nenhum                             | `nftDetailSchema`              | `NOT_FOUND`                                                                                         |
| GET    | `/favorites`                    | usuário  | nenhum                             | `favoritesSchema`              | nenhum                                                                                              |
| PUT    | `/favorites/:nftId`             | usuário  | nenhum                             | `favoritesSchema`              | `NOT_FOUND`                                                                                         |
| DELETE | `/favorites/:nftId`             | usuário  | nenhum                             | `favoritesSchema`              | nenhum                                                                                              |
| GET    | `/cart`                         | carrinho | nenhum                             | `cartSchema`                   | nenhum                                                                                              |
| POST   | `/cart/items`                   | carrinho | corpo: `addCartItemInputSchema`    | `cartSchema`                   | `NOT_FOUND`, `OUT_OF_STOCK`                                                                         |
| PATCH  | `/cart/items/:nftId/:editionId` | carrinho | corpo: `updateCartItemInputSchema` | `cartSchema`                   | `NOT_FOUND`, `OUT_OF_STOCK`                                                                         |
| DELETE | `/cart/items/:nftId/:editionId` | carrinho | nenhum                             | `cartSchema`                   | `NOT_FOUND`                                                                                         |
| POST   | `/cart/merge`                   | usuário  | corpo: `mergeCartInputSchema`      | `cartSchema`                   | nenhum                                                                                              |
| POST   | `/quote`                        | carrinho | corpo: `quoteInputSchema`          | `quoteSchema`                  | `COUPON_INVALID`, `COUPON_EXPIRED`, `OUT_OF_STOCK`                                                  |
| POST   | `/orders`                       | usuário  | corpo: `createOrderInputSchema`    | 201: `orderSchema`; replay 200 | `IDEMPOTENCY_CONFLICT`, `QUOTE_STALE`, `OUT_OF_STOCK`, `PAYMENT_DECLINED`, `NOT_FOUND`, `FORBIDDEN` |
| GET    | `/orders/:id`                   | usuário  | nenhum                             | `orderSchema`                  | `NOT_FOUND`, `FORBIDDEN`                                                                            |
| GET    | `/profile`                      | usuário  | nenhum                             | `userSchema`                   | nenhum                                                                                              |
| PATCH  | `/profile`                      | usuário  | corpo: `updateProfileInputSchema`  | `userSchema`                   | `CONFLICT`                                                                                          |
| PUT    | `/profile/avatar`               | usuário  | corpo: `avatarInputSchema`         | `userSchema`                   | nenhum                                                                                              |
| DELETE | `/profile/avatar`               | usuário  | nenhum                             | `userSchema`                   | nenhum                                                                                              |
| POST   | `/profile/password`             | usuário  | corpo: `changePasswordInputSchema` | 204: sem corpo                 | nenhum                                                                                              |
| GET    | `/wallets`                      | usuário  | nenhum                             | array de `walletSchema`        | nenhum                                                                                              |
| PUT    | `/wallets/:slot`                | usuário  | corpo: `walletInputSchema`         | `walletSchema`                 | `CONFLICT`                                                                                          |

Os parâmetros de caminho identificam os recursos, sem criar schemas adicionais. Em `/wallets/:slot`, `slot` aceita `primary` ou `secondary` e deve coincidir com o campo obrigatório do corpo.

Catálogo: a URL da interface usa `q`; o cliente mapeia para `search` na API. A query aceita somente os campos de `catalogQuerySchema`: `search`, `collections`, `networks`, `minPriceEth`, `maxPriceEth`, `tab`, `sort`, `page`, `pageSize`. Serializar arrays repetindo a chave, por exemplo `/api/nfts?collections=music&collections=gaming&networks=ethereum`. Converter paginação da query textual para números antes de validar. Defaults: `tab=all`, `sort=recent`, `page=1`, `pageSize=9`, com máximo de 48 itens por página.

Favoritos: PUT garante presença e DELETE garante ausência, sem duplicação. Atualização otimista exige rollback em falha e reconciliação com GET.

Carrinho: handlers são a autoridade e persistem por identidade. Quantidades são inteiras positivas. O merge soma por NFT/edição, limita ao estoque e devolve `adjustments` com `reason` e `message`. É idempotente: replay não soma novamente; remover a origem somente após confirmação. Logout cria identidade visitante nova e não copia itens privados.

Perfil: PATCH exige todos os campos de `updateProfileInputSchema` que não são opcionais, inclusive `version`; o schema não é um objeto parcial. Avatar usa `dataUrl` conforme `avatarInputSchema`, sem multipart ou campos extras. Carteiras seguem as validações de endereço/rede de `walletInputSchema`.

## 3. Idempotência de pedido

- Persistir `{ userId, key, payload }` antes do envio. A chave é consultada antes de revalidar a cotação.
- Mesma chave e mesmo corpo para o mesmo usuário devolvem o mesmo pedido, com HTTP 200, sem nova reserva, cobrança ou desconto no carrinho.
- Mesma chave e corpo diferente retornam HTTP 409 com `code: IDEMPOTENCY_CONFLICT`.
- Cotação desatualizada retorna HTTP 409 com `code: QUOTE_STALE` e a nova `quote: quoteSchema`. Exigir novo aceite explícito; não reenviar automaticamente a compra.
- A cotação é snapshot calculado pela API: linhas/preços, disponibilidade validada pelo servidor, `editionVersion`, `cartRevision`, cupom opcional, rede, taxas e expiração. A identidade é vinculada no servidor, sem adicionar `userId` ao `quoteSchema`. Alterações invalidam o aceite; `staleTime: 0` não substitui revalidação atômica.
- Timeout ou refresh com resultado desconhecido exige replay da mesma chave e corpo. Persistir criação antes de simular timeout. Somente uma tentativa conhecida como recusada permite nova tentativa/chave; nunca gerar chave nova automaticamente para resultado desconhecido.
- Criar pedido `pending` reserva estoque atomicamente. Transições permitidas: `pending -> confirmed` ou `pending -> declined`. Confirmar consome a reserva; recusar libera. Transições persistidas são idempotentes e estados terminais não regridem.
- Na confirmação, descontar uma única vez somente as quantidades compradas, preservando itens adicionados depois. O recibo mantém snapshot imutável; mudanças no catálogo não alteram os valores comprados. Recuperar transições vencidas no bootstrap pelos prazos persistidos.

## 4. Eventos Socket.IO

Contrato em `src/domain/events.ts`; `serverEventSchema` é a união discriminada por `type`. Ambos os eventos incluem `eventId` não vazio, `version: versionSchema` e `occurredAt: isoDateSchema`.

| Evento          | Schema                    | `resource`             | `data`                            |
| --------------- | ------------------------- | ---------------------- | --------------------------------- |
| `nft.updated`   | `nftUpdatedEventSchema`   | `{ nftId, editionId }` | `{ priceEth, availableQuantity }` |
| `order.updated` | `orderUpdatedEventSchema` | `{ orderId, userId }`  | `{ status }`                      |

`priceEth` segue `ethAmountSchema`; `availableQuantity` é inteiro não negativo; `status` segue `orderStatusSchema`: `pending`, `confirmed` ou `declined`. O evento de NFT identifica a edição, cuja `version` no REST é comparável à do evento. O evento de pedido compara com `orderSchema.version` e só é entregue ao dono.

- Descartar `eventId` já processado e versões iguais ou inferiores à versão aplicada ao mesmo recurso. Respostas REST antigas também não podem sobrescrever versões mais novas do cache. Não comparar versões entre recursos diferentes.
- `nft.updated` exige reconciliar os dados afetados e invalidar o aceite de cotação quando preço/estoque mudar. Não inventar campos de recibo a partir de evento parcial.
- Em `order.updated`, conferir `resource.userId` com a sessão atual e sua geração. Buscar o pedido completo por GET quando necessário. Evento não limpa o carrinho na UI e não regride estado terminal.
- Após reconexão, reconciliar por GET os recursos ativos e os pedidos pendentes. Não presumir que eventos perdidos serão reenviados.
- Limpar listeners na desmontagem/troca de sessão, descartar callbacks da geração anterior e desconectar em 401, cancelando consultas privadas e limpando o cache privado.
- Transporte previsto: `socket.io-client` com `transports: ['websocket']`, namespace padrão, interceptado por `@mswjs/socket.io-binding`. Usar texto/JSON, sem acknowledgements ou binários. Iniciar MSW antes de Axios e socket. A compatibilidade depende da prova de transporte em Chromium e preview, incluindo reconexão.
