# Auditoria Lighthouse

Comando: `npm run audit` (configuração em `lighthouserc.mobile.json` e `lighthouserc.desktop.json`). Build otimizado servido por `vite preview`, cenário padrão dos mocks, imagens, fontes, MSW e Socket.IO ativos. Três execuções por página e perfil; a tabela traz a mediana. Relatórios HTML e JSON de cada execução em `lighthouse/mobile` e `lighthouse/desktop`.

## Resultados (mediana de 3)

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | `/` | 70 | 99 | 100 | 92 | 2,3 s | 0,000 | 1.539 ms |
| mobile | `/nft/nft-1` | 54 | 100 | 100 | 92 | 4,9 s | 0,000 | 1.526 ms |
| desktop | `/` | 96 | 98 | 100 | 92 | 0,5 s | 0,000 | 166 ms |
| desktop | `/nft/nft-1` | 96 | 100 | 100 | 92 | 1,0 s | 0,000 | 141 ms |

Metas do enunciado: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Todas atendidas, exceto Performance no perfil mobile.

## Por que o mobile fica abaixo de 90

O perfil mobile simula CPU 4× mais lenta e rede 4G. Nele, o bloqueio da thread principal (TBT) fica em cerca de 1,5 s, quase todo interpretação do JavaScript de React, TanStack Router e Query, Zod e MSW. A maior parte vem da simulação que o enunciado exige no build de demonstração:

- O MSW registra o service worker e intercepta as chamadas antes de o catálogo ter dados. O LCP (a imagem do primeiro NFT) depende dessa resposta.
- O banco simulado é lido e gravado no armazenamento local, e o Socket.IO simulado conecta logo depois.

Tirar o MSW, carregar dados fixos no HTML ou atrasar o socket só para a medição subiria a nota, mas o enunciado proíbe "simplificações exclusivas para melhorar a pontuação". Com uma API real, esse custo sairia do navegador.

O que já foi feito:

- Rotas separadas em chunks (`lazyRouteComponent`): o JavaScript inicial caiu para cerca de 91 kB comprimidos.
- Imagens dos NFTs em WebP: de cerca de 430 kB para 28 kB cada, com `width`/`height`, `loading="lazy"` fora da primeira dobra e `fetchpriority="high"` na imagem principal.
- Cabeçalho e hero do início vêm prontos no `index.html` (app shell) e o app só carrega depois da primeira pintura: o LCP do início mobile caiu de 4,6 s para 2,3 s.
- A interface pinta antes de o MSW terminar de iniciar; requisições e socket esperam o MSW, então o tempo real continua passando pelo `socket.io-client`.
- CLS zerado no detalhe, reservando o espaço das imagens.

Com isso o detalhe desktop foi de 57 para 96 e o início mobile de 65 para 70. No detalhe mobile o LCP é a imagem do NFT, que depende da resposta da API simulada, então o shell não ajuda. O próximo passo, se houvesse mais tempo, seria tirar as ~89 kB de JavaScript não usado apontadas pelo relatório (Zod e TanStack Router carregam por inteiro no início).

## Ambiente

- Lighthouse 12.6.1 via `@lhci/cli` 0.15.1, Chrome for Testing 156.0.8078.4 em modo headless
- Node 22.23.1, Linux 7.2 x86_64, 8 núcleos
- Mobile: emulação padrão do Lighthouse (throttling simulado). Desktop: preset `desktop`
- Data da medição: 2026-10-30
