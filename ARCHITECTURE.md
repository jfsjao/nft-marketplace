# Arquitetura

## Camadas

| Camada | Responsabilidade |
| --- | --- |
| `domain` | Schemas Zod e tipos compartilhados de sessão, NFT, carrinho, cotação, pedido, perfil, carteiras, erros e eventos |
| `mocks` | Simulação do servidor: banco persistente versionado, seed, cenários, regras de negócio, handlers REST e eventos |
| `api` | Axios com base `/api`, credenciais, timeout de 10 segundos, normalização de erros e validação dos recursos |
| `features` | Ciclo de sessão, favoritos, sincronização de catálogo, subscriptions e persistência de tentativa de compra |
| `routes` | Telas, consultas, mutations e estados dos fluxos; proteção das rotas no TanStack Router |
| `components` | UI compartilhada, estados assíncronos, itens e resumos financeiros |

`lib` concentra socket, utilitários e aritmética ETH. A UI acessa os dados pela rede; os mocks não são uma fonte alternativa dentro dos componentes. `main.tsx` inicializa a interceptação antes de importar o aplicativo.

## Contratos e eventos

[docs/contratos.md](docs/contratos.md) descreve endpoints, schemas, erros e eventos. Os schemas em `src/domain` são a referência dos formatos. O [complemento do planejamento](docs/complemento-planejamento.md) registra as decisões previstas; este arquivo descreve a implementação e suas diferenças conhecidas.

REST usa JSON, token Bearer e `X-Guest-Id` para o visitante. ETH trafega como string decimal de até 18 casas; os cálculos usam wei com `bigint`. O servidor calcula subtotal, desconto e taxas. Desconto percentual incide no subtotal e arredonda para baixo em wei; a taxa vem depois.

Os eventos `nft.updated` e `order.updated` carregam `eventId`, `version`, `occurredAt`, recurso e dados parciais. NFT identifica NFT/edição e informa preço/estoque; pedido identifica pedido/usuário e informa status. O recibo completo é recuperado por REST.

## Sessão

O mock emite token opaco e `expiresAt`, com duração padrão de uma hora. A sessão fica em `localStorage` sob `kurio:session`; após refresh, começa como `unknown` e é validada em `GET /auth/session` antes de liberar rotas privadas. Senhas do banco simulado são armazenadas como hash com salt via Web Crypto, sem senha em claro.

A expiração é conferida no servidor simulado em operações autenticadas. Não há renovação automática nem timer de logout no cliente. Um 401 da sessão atual, fora de login, cadastro e catálogo público, cancela consultas, limpa todo o QueryClient, desconecta o socket, remove a sessão, cria nova identidade visitante e preserva uma rota interna de retorno validada. Logout limpa o estado local imediatamente, mesmo se a chamada remota falhar.

Login/cadastro fazem merge do carrinho antes de expor a sessão autenticada. Login, logout e limpeza incrementam a geração da sessão. Requisições, callbacks e rollbacks relevantes conferem essa geração para impedir que uma resposta anterior altere a conta atual. O provider encerra o socket antigo e abre outro para a nova identidade. Pedidos e tentativas persistidos ficam vinculados ao usuário; trocar de conta não os transforma em dados da nova sessão.

## Carrinho e cotação

O servidor é a fonte do carrinho. Neste ambiente, essa responsabilidade pertence aos handlers MSW e ao banco persistido no navegador. O visitante tem `guestId`; após login, usa-se `userId`. Refresh consulta o mesmo carrinho pela identidade persistida.

O merge soma itens por NFT/edição, limita ao estoque e retorna ajustes. É idempotente e só remove a origem após confirmação. Logout cria outro visitante e não copia itens privados. Mutations atualizam o cache com a resposta do servidor e invalidam cotações.

A cotação tem snapshot das linhas, versões das edições, revisão do carrinho, rede, cupom, taxas e expiração de 30 segundos. O checkout mantém cotação e revisão em estado local, cancela solicitações anteriores e invalida o aceite quando muda a rede, o formulário ou uma edição cotada. A criação de pedido revalida tudo atomicamente; `QUOTE_STALE` devolve nova cotação e exige outro aceite explícito.

Na confirmação, o servidor desconta uma única vez apenas as quantidades compradas. Itens adicionados depois permanecem. Recusa libera a reserva e preserva o carrinho. O evento não esvazia o carrinho no cliente.

## Cache do TanStack Query

O QueryClient usa `staleTime: 30_000`. Leituras repetem no máximo duas vezes, e só em falha transitória (`SERVICE_UNAVAILABLE` ou erro de rede); respostas 4xx nunca repetem. Mutations não têm retry: compra e favoritos tratam a falha com idempotência e rollback.

| Recurso | Chave |
| --- | --- |
| Catálogo | `['nfts', query]` |
| Detalhe | `['nft', nftId]` |
| Favoritos | `['favorites', userId]` |
| Carrinho | `['cart', userId ou guestId]` |
| Cotação do carrinho | `['quote', userId, cartRevision, coupon]` |
| Perfil | `['profile', userId]` |
| Carteiras | `['wallets', userId]` |
| Pedido | `['orders', userId, orderId]` |

Parâmetros do catálogo separam os resultados. Favoritos são consulta privada composta com NFTs públicos, sem `isFavorite` no cache público. Queries passam `AbortSignal` ao Axios para cancelar trabalho obsoleto.

Favoritos têm atualização otimista: cancelar a consulta, guardar snapshot, atualizar presença local, restaurar o snapshot em falha e invalidar ao terminar. A geração protege rollback e reconciliação de outra sessão. A UI bloqueia mutations concorrentes de favoritos.

Alterações de carrinho invalidam a cotação. Perfil e carteiras atualizam seus caches após resposta. Pedido confirmado invalida o carrinho. Pedidos pendentes fazem polling REST a cada dois segundos, interrompido no estado terminal.

## Reconciliação REST e Socket.IO

O cliente valida eventos com Zod e descarta `eventId` repetido ou versão igual/inferior à já recebida para o mesmo recurso. Não compara versões de recursos distintos. Eventos de pedidos de outro usuário são ignorados; o mock também verifica o dono e a validade do token antes de entregá-los.

`nft.updated` aplica edições mais recentes no detalhe, cancela consultas afetadas e invalida catálogo/detalhe. No carrinho, invalida carrinho e cotação e informa a mudança. No checkout, remove cotação e revisão quando a edição afetada tem versão mais nova. `order.updated` solicita o pedido completo por REST; a consulta preserva uma versão mais recente do cache e não regride um estado terminal.

A cada conexão, incluindo reconexão, o catálogo invalida recursos ativos para recarregar por REST. A tela de pedido também faz refetch próprio na reconexão. Eventos perdidos não são reproduzidos. Subscriptions são removidas ao desmontar e o socket é desconectado na troca de sessão.

Há limites na reconciliação atual: a invalidação global usa o prefixo `['order']`, enquanto pedidos usam `['orders', userId, orderId]`; a tela aberta compensa com seu listener próprio e polling. A cotação local do checkout depende do evento ou da revalidação no envio, pois não pertence ao cache Query. A proteção contra REST antigo é explícita no pedido; catálogo/detalhe dependem de cancelamento e refetch e não têm uma barreira geral de versão para toda resposta REST.

## Idempotência e pedido

Antes do envio, o cliente persiste `{ userId, key, body, orderId? }` em `kurio:checkout:<userId>`. Um bloqueio síncrono evita cliques concorrentes. A chave segue em `Idempotency-Key` e o servidor consulta o registro antes de revalidar a cotação.

Mesma conta, chave e corpo recuperam o mesmo pedido com HTTP 200. Corpo diferente para a mesma chave retorna `IDEMPOTENCY_CONFLICT`. Resultado desconhecido mantém a tentativa: o botão de recuperação ou o refresh do checkout reenviam a mesma chave e corpo. Não é criada outra chave para contornar uma resposta perdida.

O pedido nasce `pending` e reserva estoque numa operação atômica sobre cópia do banco. Depois passa a `confirmed` ou `declined`, sem regressão terminal. Os prazos persistidos são processados no bootstrap e nas requisições, além do timer em memória, permitindo recuperação após refresh. Linhas e totais do recibo são snapshots imutáveis. O cenário `order-timeout` persiste a criação e retorna uma falha de rede na primeira resposta, simulando resultado desconhecido sem esperar os dez segundos do timeout Axios.

## Transporte dos mocks

O cliente usa `socket.io-client` real com `transports: ['websocket']`, namespace padrão e token no handshake. O MSW intercepta WebSocket e `@mswjs/socket.io-binding` adapta os pacotes Socket.IO. REST e socket compartilham o mesmo banco; mudanças persistidas geram eventos pelo transporte.

O binding não implementa todo o servidor Socket.IO. A simulação usa texto/JSON, sem polling, acknowledgements, binários ou namespaces adicionais. O token é lido do pacote bruto CONNECT (`40`). O binding anuncia heartbeat, mas não envia ping Engine.IO; por isso o mock envia `2` manualmente a cada 20 segundos e encerra timer e subscription ao fechar a conexão.

O aplicativo é importado dinamicamente somente depois de `await worker.start()`. Isso é necessário porque o cliente Socket.IO captura o WebSocket global ao ser importado. Iniciar apenas o componente depois do worker não seria suficiente se o cliente já tivesse sido carregado.

## Decisões de UX

Busca, filtros, ordem e página ficam na URL para preservar refresh e histórico. Mudanças de filtro reiniciam a paginação. Estados assíncronos oferecem carregamento, vazio, erro e recuperação; skeletons usam shimmer com respeito a movimento reduzido.

Checkout separa preenchimento, revisão e aceite. Alterações de preço ou estoque removem o aceite anterior. Resultado desconhecido oferece recuperar a mesma tentativa; somente um pedido confirmado mostra recibo de sucesso. Erros e mudanças usam mensagens com papéis acessíveis. Componentes Radix fornecem a base de foco e interação dos elementos compartilhados.

## Limitações conhecidas

- Pagamentos, carteiras, transações e explorador são simulações. Não há blockchain, extensão ou gateway real. A conexão da carteira é um `POST /wallets/:id/connect` no mock, que aceita ou recusa conforme o cenário (`wallet-rejected`); o pedido só é enviado com a carteira conectada.
- O banco usa armazenamento local do navegador, sem sincronização entre dispositivos ou garantia transacional entre abas. Token local e hash com salt pertencem à simulação, não a uma solução de autenticação para produção.
- `reset()` restaura banco e cenário, mas não limpa sozinho sessão do cliente, visitante, tentativas, cache, listeners ou todos os timers. O README inclui limpeza complementar e recarga.
- Latência `variable` usa `Math.random()`, sem seed de aleatoriedade. Não há preset separado para vazio, conflito de cadastro ou cada erro de validação; esses fluxos usam entradas ou configurações pontuais.
- O cupom aceito fica no armazenamento local por dono do carrinho (visitante ou usuário) e é reaplicado pela cotação do checkout; se expirar entre as telas, o checkout avisa e segue sem ele.
- Resultados Lighthouse abaixo da meta estão justificados em [docs/lighthouse.md](docs/lighthouse.md). O MSW roda no navegador do avaliador e faz parte da entrega, então seu custo de inicialização entra na medição.
- O fallback da Vercel atende rotas da SPA. Desativar mocks exige fornecer backend e Socket.IO; o deploy estático sozinho não os oferece.

## Desvios do Figma

Conferido em 390, 768 e 1440 px contra os frames exportados.

- **Todas as telas:** links Mercado, Criadores e Aprenda, newsletter do rodapé e login com Google ou Facebook estão fora do escopo. Aparecem como no layout, mas desabilitados ou levando a uma página que informa isso, sem simular sucesso.
- **Início:** no mobile, os filtros da barra lateral viram um drawer acessível com o botão Filtros. Há um título "Catálogo" visível só no mobile, porque a página precisa de um `h1` para leitores de tela. As contagens das coleções vêm da API e mudam com os filtros, em vez dos números fixos do layout.
- **Detalhe:** a galeria mostra uma única imagem, porque cada NFT tem só uma arte exportada; as miniaturas do layout ficam de fora. "Comprar" adiciona ao carrinho e leva ao checkout; "Adicionar ao carrinho" existe ao lado, porque o fluxo de carrinho é obrigatório.
- **Carrinho e pagamento:** o campo "Código promocional" ganhou o botão "Aplicar cupom" e mensagens de erro. No pagamento, a carteira vem das carteiras cadastradas e é preciso conectá-la antes de revisar; "Tipo de carteira" e "Endereço" do layout ficam no cadastro de carteiras, para não duplicar dados.
- **Confirmação:** o mesmo cartão também representa pedido pendente e recusado, que o layout não desenha. "Ver no Etherscan" aponta para um explorador simulado.
- **Perfil e carteiras:** o menu lateral mostra só Dados do perfil, Carteiras e Sair; Atividade, Ofertas, Arquivos baixados e Suporte estão fora do escopo.
- **Assets:** as imagens dos NFTs foram convertidas de PNG para WebP para reduzir o peso, sem mudar o recorte. A fonte Roboto Mono é servida localmente.
- **Acessibilidade:** foco visível em todos os controles e skeletons com `role="status"` respeitando `prefers-reduced-motion`.
