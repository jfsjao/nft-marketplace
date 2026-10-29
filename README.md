# NFT Marketplace — desafio frontend

Implementação em etapas do [enunciado](docs/enunciado.md). Neste ponto há configuração React/TypeScript/Vite e uma página de demonstração de componentes sobre Radix UI e Tailwind. Os fluxos de catálogo, conta, carrinho e compra ainda serão desenvolvidos.

## Executar

Ambiente validado: Node.js 22.23.1 e npm 10.9.8. Use Node 22.12 ou superior compatível com Vite 8.

```bash
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. Os mocks estão ativos por padrão, sem credenciais. `.env.example` documenta `VITE_ENABLE_MOCKS`; `false` desativa os mocks e exige um backend real em `/api`. Reinicie o Vite ou refaça o build após alterar a configuração.

## Verificar

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Os testes cobrem o utilitário de classes e o fluxo Axios → MSW: listagem, vazio, erro HTTP e contrato inválido. O lint pode emitir avisos de Fast Refresh nos módulos que exportam componentes e variantes/hooks juntos. Playwright, regressão visual e Lighthouse ainda não estão configurados; dependências instaladas não significam integração funcional.

## Planejamento

- [Plano de referência](docs/plano.md)
- [Decisões revisadas, etapas paralelas e matriz de aceite](docs/complemento-planejamento.md)

A paleta global Kurio e Roboto Mono local estão em `src/index.css`; componentes usam nomes como `bg-background`, `bg-primary`, `text-muted-foreground` e `text-highlight`. Gradientes estão disponíveis como `bg-kurio-warm`, `bg-kurio-green` e `bg-kurio-surface`. A página segue sendo uma demonstração, ainda sem reproduzir a composição final do Figma. MSW, Axios e TanStack Query já participam da listagem; Router e Socket.IO entram em etapas seguintes. A prova de REST e Socket.IO no build de demonstração antecede as trilhas funcionais em paralelo.

Os primeiros commits separam documentação, configuração e componentes. Depois, cada feature ou incremento verificável inclui seus testes. Nenhum deploy foi realizado nesta etapa.

## Primeiro contrato REST

`GET /api/nfts` → `{ items: [{ id, name, imageUrl, priceEth, availableQuantity }], total }`. Preço é string decimal de ETH com até 18 casas; quantidade é inteira e não negativa. O cliente valida a resposta com Zod em `src/domain/nft.ts`.

A requisição fica em `src/api/nfts.ts`; dados simulados ficam somente em `src/mocks/handlers.ts`. O bootstrap aguarda o MSW antes de renderizar a tela. Query mantém dados frescos por 30 segundos e não repete falhas automaticamente nesta primeira etapa; a interface oferece tentar novamente. Busca, filtros, detalhe e paginação ainda não fazem parte deste endpoint inicial.

## Skills locais

Instaladas em `.agents/skills` (ignoradas pelo Git): `ponytail`, `playwright-cli` e `senior-fullstack`. Ponytail orienta incrementos pequenos; Playwright CLI permite verificações no navegador. A skill full-stack foi disponibilizada sem aplicar seu fluxo amplo de escolha de arquitetura neste desafio com stack obrigatória.
