# Auditoria Lighthouse

Comando: `npm run audit` (configuração em `lighthouserc.mobile.json` e `lighthouserc.desktop.json`). Build otimizado servido por `vite preview`, cenário padrão dos mocks, imagens, fontes, MSW e Socket.IO ativos. Três execuções por página e perfil; a tabela traz a mediana. Relatórios HTML e JSON de cada execução em `lighthouse/mobile` e `lighthouse/desktop`.

## Resultados (mediana de 3)

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | `/` | 53 | 99 | 100 | 92 | 4,6 s | 0,000 | 1.136 ms |
| mobile | `/nft/nft-1` | 52 | 100 | 100 | 92 | 4,8 s | 0,000 | 1.482 ms |
| desktop | `/` | 94 | 98 | 100 | 92 | 1,0 s | 0,000 | 150 ms |
| desktop | `/nft/nft-1` | 91 | 100 | 100 | 92 | 1,0 s | 0,000 | 211 ms |

Metas do enunciado: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Todas atendidas, exceto Performance no perfil mobile.

## Por que o mobile fica abaixo de 90

O perfil mobile simula CPU 4× mais lenta e rede 4G. Nele, o trabalho na thread principal soma cerca de 4,7 s, dos quais 2,4 s são execução de JavaScript. A maior parte vem da simulação que o enunciado exige no build de demonstração:

- O MSW registra o service worker e intercepta as chamadas antes de o catálogo ter dados. O LCP (a imagem do primeiro NFT) depende dessa resposta.
- O banco simulado é lido e gravado no armazenamento local, e o Socket.IO simulado conecta logo depois.

Tirar o MSW, carregar dados fixos no HTML ou atrasar o socket só para a medição subiria a nota, mas o enunciado proíbe "simplificações exclusivas para melhorar a pontuação". Com uma API real, esse custo sairia do navegador.

O que já foi feito:

- Rotas separadas em chunks (`lazyRouteComponent`): o JavaScript inicial caiu para cerca de 91 kB comprimidos.
- Imagens dos NFTs em WebP: de cerca de 430 kB para 28 kB cada, com `width`/`height`, `loading="lazy"` fora da primeira dobra e `fetchpriority="high"` na imagem principal.
- A interface pinta antes de o MSW terminar de iniciar; requisições e socket esperam o MSW, então o tempo real continua passando pelo `socket.io-client`.
- CLS zerado no detalhe, reservando o espaço das imagens.

Com isso o detalhe desktop foi de 57 para 91. O próximo passo, se houvesse mais tempo, seria tirar as ~89 kB de JavaScript não usado apontadas pelo relatório (Zod e TanStack Router carregam por inteiro no início).

## Ambiente

- Lighthouse 12.6.1 via `@lhci/cli` 0.15.1, Chrome for Testing 156.0.8078.4 em modo headless
- Node 22.23.1, Linux 7.2 x86_64, 8 núcleos
- Mobile: emulação padrão do Lighthouse (throttling simulado). Desktop: preset `desktop`
- Data da medição: 2026-10-30
