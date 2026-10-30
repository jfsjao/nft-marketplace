# Kurio NFT Marketplace

Marketplace de NFTs com catálogo, detalhe, favoritos, carrinho, checkout, pedidos, perfil e carteiras. Autenticação, pagamentos e dados são simulados no navegador com MSW, incluindo eventos Socket.IO e persistência após refresh.

Aplicação publicada: https://nft-marketplace-one-rosy.vercel.app

## Stack

React 19, TypeScript 6, Vite 8, TanStack Router, TanStack Query 5, Axios, Socket.IO Client 4, Tailwind CSS 4 e componentes sobre Radix UI no padrão shadcn/ui. Formulários usam React Hook Form e Zod. Mocks usam MSW 2 e `@mswjs/socket.io-binding`. Testes usam Vitest, Testing Library e Playwright.

## Setup

Use Node.js 22.12 ou superior compatível com Vite 8 e npm.

```bash
npm ci
npx playwright install chromium
cp .env.example .env.local
npm run dev
```

Abra a URL exibida pelo Vite. Não é necessário backend ou serviço privado. Para testar o build:

```bash
npm run build
npm run preview
```

### Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Mocks ativos em desenvolvimento e no build de demonstração. Somente o valor `false` desativa a simulação e exige REST em `/api` e servidor Socket.IO na mesma origem. |

Reinicie o Vite ou refaça o build após alterar a variável. A configuração da Vercel mantém acesso direto e refresh das rotas, preservando assets e `mockServiceWorker.js`.

## Contas e cupons

Credenciais fictícias, com senha `kurio123` para ambas:

| E-mail | Conta |
| --- | --- |
| `colecionador@kurio.dev` | Colecionador |
| `segundo@kurio.dev` | Segundo colecionador |

Cada conta começa com uma carteira Ethereum principal simulada. O seed tem 30 NFTs, nove coleções e três redes.

| Cupom | Resultado |
| --- | --- |
| `KURIO10` | 10% de desconto no subtotal |
| `LANCAMENTO` | 5% de desconto no subtotal |
| `EXPIRADO` | Erro de cupom expirado |

A taxa de rede é adicionada após o desconto. O visitante já vê desconto, taxa e total no carrinho; o cupom aceito é lembrado e aplicado de novo na cotação do checkout. Um código não cadastrado, como `INVALIDO`, retorna erro de cupom inválido.

## Cenários

Abra `/?scenario=<preset>`, por exemplo `/?scenario=slow`. O preset é lido no carregamento e persistido no navegador; selecioná-lo não restaura os dados do seed. Também é possível mudar as próximas operações pelo console:

```js
window.__kurioMock.setScenario('default')
window.__kurioMock.getScenario()
```

| Preset | Comportamento |
| --- | --- |
| `default` | Latência de 80 ms, sessão de uma hora e pagamento confirmado |
| `slow` | Latência de 1.500 ms para observar carregamento e skeletons |
| `offline` | Falha de conexão em todas as chamadas REST |
| `server-error` | HTTP 503 em todas as chamadas REST |
| `session-expired` | Novas sessões com duração zero; a próxima operação autenticada retorna 401 |
| `price-change` | Dois segundos após uma cotação com itens, aumenta em 0,1 ETH o preço da primeira edição cotada e emite `nft.updated` |
| `sold-out` | Dois segundos após uma cotação com itens, zera o estoque da primeira edição cotada e emite `nft.updated` |
| `order-timeout` | Persiste o pedido e falha na resposta inicial; reenvio recupera o mesmo pedido |
| `payment-declined` | Cria pedido pendente que termina recusado |
| `wallet-rejected` | A carteira recusa a conexão no checkout e o pedido não pode ser enviado |

Os eventos de preço e estoque são consumidos uma vez. Ative novamente o preset para repeti-los. A configuração de sessão afeta sessões criadas depois da seleção.

### Reset

Para reiniciar uma avaliação, execute no console após carregar a aplicação:

```js
await window.__kurioMock.reset()
for (const key of Object.keys(localStorage)) {
  if (key === 'kurio:session' || key === 'kurio:guest-id' || key.startsWith('kurio:checkout:')) {
    localStorage.removeItem(key)
  }
}
location.assign('/')
```

`reset()` restaura cenário padrão e banco do seed. A limpeza complementar remove sessão, identidade visitante e tentativas de compra; a navegação recria cache e socket. Remova `scenario` da URL para que o carregamento não reaplique um preset antigo. O reset descarta alterações locais de contas, carrinhos e pedidos.

### Compra de referência

1. Após reset, abra `/nft/nft-1`, adicione uma unidade e abra `/cart`.
2. Clique em **Finalizar** e entre com a conta Colecionador. Os itens do visitante são incorporados ao carrinho da conta.
3. No checkout, selecione a carteira principal e preencha nome de exibição, usuário, nome do perfil, e-mail, código de indicação e ENS com dados fictícios válidos.
4. Clique em **Revisar pedido** e depois em **Aceitar e enviar pedido**. Aguarde o recibo confirmado em `/orders/<id>`.

### Reproduzir falhas e recuperação

Comece cada fluxo com o reset. Use a compra de referência quando indicado.

| Fluxo | Como reproduzir e recuperar |
| --- | --- |
| Rede lenta | Abra `/?scenario=slow` e navegue pelo catálogo, detalhe e carrinho para observar carregamento. |
| Conexão ou HTTP 503 | Abra `/?scenario=offline` ou `/?scenario=server-error`. Após o erro, execute `setScenario('default')` no console do controle acima e use **Tentar novamente**. |
| Sessão expirada | Abra `/?scenario=session-expired`, faça login e tente acessar perfil ou checkout. O 401 encerra a sessão. Volte ao preset `default`, entre novamente com a mesma conta e retome a rota protegida. Para expirar uma sessão já aberta durante o checkout, use o exemplo abaixo. |
| Login inválido e cadastro conflitante | Entre com senha incorreta; depois tente cadastrar o e-mail de uma conta do seed com os demais campos válidos. Corrija os dados para prosseguir. |
| Formulários inválidos | Envie campos obrigatórios vazios; no perfil, tente alterar a senha com senha atual incorreta; em carteiras, informe endereço incompatível com a rede. Corrija os campos indicados. |
| Carteira recusada | No checkout, ative `wallet-rejected` e clique em **Conectar carteira**. A recusa aparece e o envio fica bloqueado; **Desconectar** volta ao estado inicial. |
| Cupom inválido ou expirado | Com item no carrinho, aplique `INVALIDO` ou `EXPIRADO`. Remova ou substitua por `KURIO10`. |
| Falha em favorito | Autenticado, configure a falha pontual abaixo e clique em **Favoritar**. O estado otimista volta ao anterior e a consulta reconcilia; tente novamente. |
| Preço alterado | Prepare o checkout, execute `setScenario('price-change')` pelo controle e clique em **Atualizar cotação**. Revise antes de dois segundos e aguarde o aviso. O aceite anterior é removido; atualize, revise e aceite os novos valores. |
| Edição esgotada | Repita o fluxo anterior com `sold-out`. Após o evento, atualize a cotação e volte ao carrinho para remover ou trocar a edição indisponível. |
| Cotação expirada | Revise uma compra e espere mais de 30 segundos antes de aceitar. O servidor devolve nova cotação e exige revisão e aceite novamente. |
| Resposta perdida após criação | Na revisão, ative `order-timeout` e envie. Ao ver resultado desconhecido, clique em **Tentar de novo** ou recarregue o checkout. A mesma chave e corpo recuperam o pedido, sem nova compra. |
| Pagamento recusado | Na revisão, ative `payment-declined` e envie. Aguarde a recusa; não há recibo confirmado e os itens permanecem no carrinho. Volte a `default` antes de uma nova compra. |
| Recurso inexistente | Abra `/nft/inexistente`. Para pedido inexistente, autenticado, abra `/orders/inexistente`. |
| Resultado vazio | No catálogo, busque um termo inexistente e depois limpe a busca. Não há preset `empty`. |

Nos exemplos da tabela, `setScenario(...)` significa `window.__kurioMock.setScenario(...)`.

Falha pontual de favorito, com uma resposta 503:

```js
window.__kurioMock.setScenario({
  failures: [{ route: 'PUT /favorites/:nftId', status: 503, code: 'SERVICE_UNAVAILABLE', times: 1 }],
})
```

Expiração de uma sessão existente: após login, avance o relógio do mock em mais de uma hora e clique em **Atualizar cotação** ou abra o perfil:

```js
window.__kurioMock.setScenario({ clockOffsetMs: 3_600_001 })
// Depois do 401, restaure o relógio antes de entrar novamente:
window.__kurioMock.setScenario('default')
```

Para latência variável, use `window.__kurioMock.setScenario({ latency: 'variable' })` e altere a busca rapidamente. A latência varia de 100 a 600 ms; esse modo usa aleatoriedade e não garante uma ordem específica de respostas.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desenvolvimento com Vite |
| `npm run build` | Verificação TypeScript e build de produção |
| `npm run preview` | Servir o build local |
| `npm run typecheck` | Verificação de tipos sem emissão |
| `npm run lint` | Oxlint |
| `npm test` | Testes Vitest em execução única |
| `npm run test:e2e` | Playwright em Chromium desktop 1440 × 900 e mobile 390 × 844 |
| `npm run test:e2e:ui` | Interface interativa do Playwright |

| `npm run audit` | Lighthouse CI: build otimizado, início e detalhe, mobile e desktop, três execuções cada |

O Playwright executa build e preview na porta 4173 com mocks ativos. Deixe a porta livre. O relatório fica em `playwright-report/`; traces são retidos em falhas. A regressão visual compara início, detalhe, carrinho e pagamento com as baselines versionadas em `e2e/__screenshots__`; depois de uma mudança visual intencional, gere de novo com `npx playwright test e2e/visual.spec.ts --update-snapshots`.

A auditoria usa o Chromium do Playwright: `CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") npm run audit`. Os relatórios HTML e JSON ficam em `lighthouse/mobile` e `lighthouse/desktop`; as medianas e a análise estão em [docs/lighthouse.md](docs/lighthouse.md).

## Estrutura

```text
src/
  domain/       Tipos e schemas
  mocks/        Banco, seed, cenários, handlers REST e socket
  api/          Cliente HTTP e acesso aos recursos
  features/     Sessão, favoritos, tempo real e tentativa de compra
  routes/       Telas
  components/   Componentes compartilhados e UI
  lib/          Socket, cálculos ETH e utilitários
public/assets/  Imagens e fontes locais
e2e/            Fluxos Playwright
docs/           Enunciado, contratos e planejamento
```

Veja [arquitetura e limitações](ARCHITECTURE.md), [contratos REST e eventos](docs/contratos.md) e [enunciado](docs/enunciado.md).
