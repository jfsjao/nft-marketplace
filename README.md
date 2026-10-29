# NFT Marketplace — desafio frontend

Implementação em etapas do [enunciado](docs/enunciado.md). Neste ponto há configuração React/TypeScript/Vite e uma página de demonstração de componentes sobre Radix UI e Tailwind. Os fluxos de catálogo, conta, carrinho e compra ainda serão desenvolvidos.

## Executar

Ambiente validado: Node.js 22.23.1 e npm 10.9.8. Use Node 22.12 ou superior compatível com Vite 8.

```bash
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. Não há variáveis de ambiente ou credenciais necessárias para esta demonstração inicial.

## Verificar

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

O teste atual cobre o utilitário de classes. O lint pode emitir avisos de Fast Refresh nos módulos que exportam componentes e variantes/hooks juntos. Playwright, regressão visual e Lighthouse ainda não estão configurados; dependências instaladas não significam integração funcional.

## Planejamento

- [Plano de referência](docs/plano.md)
- [Decisões revisadas, etapas paralelas e matriz de aceite](docs/complemento-planejamento.md)

A identidade visual atual é provisória. A fidelidade depende da inspeção dos frames e exportação dos assets do Figma. MSW, Axios, Router, Query e Socket.IO serão conectados nas próximas etapas. A prova de REST e Socket.IO no build de demonstração antecede as trilhas funcionais em paralelo.

Os primeiros commits separam documentação, configuração e componentes. Depois, cada feature ou incremento verificável inclui seus testes. Nenhum deploy foi realizado nesta etapa.
