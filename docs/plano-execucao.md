# Plano de execução (aprovado em 2026-10-29)

Estrutura primeiro, design no fim. As camadas C1 a C4 entregam telas funcionais e cruas (sem Figma), com regras reais e testadas; a C5 aplica o visual por cima. Regras de negócio detalhadas em [complemento-planejamento.md](complemento-planejamento.md); o enunciado continua sendo a fonte dos requisitos.

Prazo: 2026-10-30. Em 2026-10-30 o trabalho só recomeça às 16h.

| Camada | Tarefa | Depende de | Paralelo |
|---|---|---|---|
| C1 Contratos | T1 Schemas Zod de todos os recursos, erros e eventos (`src/domain`) + `docs/contratos.md` | base | bloqueia o resto |
| | T2 `src/lib/eth.ts`: decimal string ↔ wei com `bigint`, soma, multiplicação por quantidade, desconto | base | com T1 |
| C2 Simulação | T3 `src/mocks/db.ts`: estado único com seed, 2 usuários, persistência em localStorage, reset e seletor de cenário | T1, T2 | não |
| | T4 Handlers REST (auth, catálogo, favoritos, carrinho, cotação, pedidos idempotentes, perfil, carteiras) | T3 | com T5 e T6 |
| | T5 Socket: `@mswjs/socket.io-binding` + `socket.io-client`, só websocket, heartbeat, `nft.updated` e `order.updated` | T3 | com T4 e T6 |
| | T6 TanStack Router: rotas, search params com Zod, guards, 404 | T1 | com T4 e T5 |
| | T7 Deploy na Vercel provando REST + socket publicados | T5 | logo após T5 |
| C3 Estado | T8 Sessão: login, expiração, logout limpando cache e socket | C2 | não |
| | T9 Catálogo, detalhe e favoritos (otimista com rollback) | T8 | com T10 |
| | T10 Carrinho, cupom, cotação e merge do visitante | T8 | com T9 |
| | T11 Checkout idempotente, pedido pendente, recuperação e eventos | T9, T10 | não |
| C4 Testes | T12 Playwright 1440/390 px, cenários eliminatórios | C3 | não |
| C5 Visual | T13 Telas do Figma, skeletons, a11y, Lighthouse, README e ARCHITECTURE | C4 | bloco final |

## Ajustes do tempo real (verificados no código do binding 0.2.0)

- API real: `toSocketIo(connection)` e `io.client.on/emit` (o exemplo do README do binding está errado).
- `transports: ['websocket']`: o binding não implementa polling.
- O binding anuncia `pingInterval` 25 s mas não envia ping: mandar heartbeat (`io.rawClient.send('2')`) para o cliente não cair em ~30 s.
- Conectar o socket só depois de `worker.start()`.

## Cortes para caber no prazo

- Banco do mock em objetos simples com persistência em localStorage, sem ORM.
- Só os dois eventos exigidos, namespace padrão.
- Checkout em página única.
- Perfil e carteiras no mínimo funcional; o restante vira limitação no `ARCHITECTURE.md`.
- Playwright num spec por área, focado nos eliminatórios.
