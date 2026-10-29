# Complemento do planejamento

Decisões revisadas antes do desenvolvimento funcional. Este documento prevalece sobre os exemplos preliminares de tipos e a divisão original em onze tarefas de `plano.md`. O enunciado permanece a fonte dos requisitos.

## Lacunas e decisões

1. **Design:** obter referência legível do Figma, listar os nove fluxos, frames desktop/mobile, tokens e assets locais. Registrar substituições individualmente; não inventar identidade visual. Validar 390, 768 e 1440 px, zoom e movimento reduzido. Acesso aos frames e prazo de entrega ainda precisam ser confirmados.
2. **Contratos:** publicar REST e eventos em `docs/contratos.md` antes das features. Incluir envelope de erros `{ code, message, fieldErrors?, requestId }`, versões dos recursos e exemplos de 400/401/403/404/409/422/5xx. Padronizar `q` na URL e mapear explicitamente para `search` na API. Documentação final de arquitetura na raiz: `ARCHITECTURE.md`.
3. **ETH:** strings decimais no transporte, até 18 casas; cálculos em wei com `bigint`. Desconto percentual somente no subtotal, arredondado para baixo em wei; taxa adicionada depois. A API calcula e valida; a UI apresenta a cotação. Testar precisão, limites e quantidades inteiras.
4. **Sessão:** token opaco simulado e `expiresAt`; senha derivada com salt usando Web Crypto, sem senha persistida em claro. Em 401, cancelar consultas privadas, desconectar socket, limpar cache e preservar rota interna de retorno validada. Contexto de compra/tentativa fica vinculado ao usuário e só é retomado pela mesma conta. Logout não remove o banco do mock nem pedidos.
5. **Cache:** chaves privadas incluem `userId`; carrinho inclui identidade de usuário ou visitante. Não incluir `isFavorite` em NFT público: compor com consulta privada de favoritos. Cancelar requests com AbortSignal e descartar callbacks/rollbacks de uma geração de sessão anterior. Queries de leitura podem repetir no máximo duas vezes em falha transitória; 4xx não repetem. Mutations não têm retry genérico. Favoritos usam otimista com rollback e reconciliação.
6. **Carrinho:** handlers são autoridade; persistir banco por identidade `guestId`/`userId`. Criar contrato de merge idempotente: somar por NFT/edição, limitar ao estoque e retornar ajustes visíveis. Remover origem somente após merge confirmado; replay não pode somar de novo. Logout inicia identidade visitante nova e não copia itens privados.
7. **Cotação:** snapshot de linhas, preços, disponibilidade, revisões, cupom, rede, taxas, usuário e expiração. Alterações invalidam aceite. `POST /orders` revalida atomicamente e retorna conflito tipado/nova cotação quando necessário; exigir novo aceite explícito. `staleTime: 0` não substitui essa validação.
8. **Idempotência:** persistir `{ userId, key, payload }` antes do envio. Resultado desconhecido após timeout/refresh exige replay da mesma chave e payload. Handler consulta chave antes de revalidar cotação; mesma chave e conteúdo diferente retorna 409. Persistir criação antes de simular timeout. Uma tentativa conhecida como recusada pode gerar nova tentativa/chave. Nunca repetir uma compra automaticamente com chave nova.
9. **Estoque/pedidos:** reservar atomicamente na criação pendente, consumir na confirmação e liberar na recusa. Transições persistidas são idempotentes; estados terminais não regridem. Na confirmação, o mock desconta somente quantidades compradas, uma vez, preservando itens adicionados depois; evento não limpa carrinho na UI. Recibo mantém snapshot imutável. Recuperar transições vencidas no bootstrap por prazos persistidos, sem depender só de timers.
10. **Eventos:** envelope com `eventId`, recurso, versão e timestamp; NFT identifica edição e pedido identifica dono. REST também expõe versão comparável. Descartar duplicatas/antigos em REST e socket; reconciliação por GET para recursos ativos e pedidos pendentes após reconexão. Limpar listeners e conferir identidade/geração da sessão. Não fabricar recibos a partir de evento parcial.
11. **Transporte:** interceptação MSW inicia antes de Axios e socket. Prova antecipada em Chromium e preview: REST altera banco, evento chega via `socket.io-client`, desconexão/reconexão recupera por REST. Usar WebSocket, namespace padrão e texto/JSON; sem acknowledgements/binários, conforme [documentação do binding](https://github.com/mswjs/socket.io-binding). Registrar versões compatíveis efetivamente testadas no lockfile. Não presumir compatibilidade da API sem executar a prova.
12. **Conta:** separar perfil e carteiras do checkout. Definir upload simulado de avatar PNG/JPEG/WebP com limite de 1 MiB e persistência da imagem, validação de senha atual/nova, endereço/rede editáveis, duplicidade e uma única carteira principal por usuário. Rede deve ser compatível com carteira; simular conexão, recusa e desconexão. Campos do coletor serão fechados após leitura dos frames.
13. **Mocks:** banco persistente versionado, seed fixa com dois usuários e variedade para paginação. Controle único para selecionar cenário, relógio, latência, falha e evento. Reset integral inclui banco, sessão, visitante, tentativas, timers, listeners e reconexão, sem estado residual entre testes. Controle de cenários modifica mocks, nunca setters/cache da UI. Disponível por configuração também no build publicado.

## Etapas e critérios de pronto

| Etapa | Escopo/arquivos principais | Dependência | Critério de pronto |
| --- | --- | --- | --- |
| E0 | Figma, inventário em `docs/design.md`, assets locais | Nenhuma | Frames e tokens verificáveis; pendências explícitas |
| E1 | package/lockfile, Vite/TS/lint, `src/components/ui`, preview, README | Nenhuma; visual final depende de E0 | Instalação limpa, tipos, lint, testes existentes, build e preview |
| E2 | `src/domain`, `docs/contratos.md`, ETH, query keys | Paralela a E1 | Contratos e invariantes fechados; testes financeiros e de transição |
| E3 | Bootstrap, Axios, MSW e Socket.IO, smoke Playwright | E1 + contratos mínimos E2 | REST e dois eventos no cliente real, inclusive preview e reconexão |
| E4 | Banco, handlers, cenários/reset, shell/rotas/guards e harness E2E | E2 + E3 | Seed/persistência/reset determinísticos e contratos consumíveis |
| E5A | Catálogo/detalhe e seus testes | E0 + E4 | URL/histórico, filtros combinados, estados, edição e limites |
| E5B | Sessão, perfil, avatar, senha, carteiras e testes | E4; formulários finais E0 | Expiração/retomada, isolamento de usuários, persistência e validação |
| E5C | Carrinho/cotação e seus testes | E4 e contrato estável de sessão/merge | Persistência, cupom, limites, merge idempotente e preço via socket |
| E6 | Integração favoritos/compra/recibo e testes | E5A + E5B + E5C | Compra, falha, timeout, recuperação, preço/estoque alterado e terminais |
| E7 | Aceite completo, auditoria, documentação e deploy | Incremental; fechamento após E6 | Evidências abaixo e URL pública correspondente ao código |

E1 e E2 podem avançar em paralelo; E0 pode ocorrer junto. E5A/B/C são as três trilhas funcionais paralelas, apenas depois de E4. A primeira prova de transporte é bloqueante para abrir essas trilhas.

## Propriedade dos arquivos no trabalho paralelo

- Coordenador/base: package/lockfile, configurações, CI, bootstrap/providers, roteador/árvore gerada, query keys, estilos globais e UI compartilhada.
- Contratos/mocks: domínio, schemas, banco e registro de handlers/cenários. Features propõem mudanças ao dono antes de consumir contrato novo.
- Agente de feature: somente sua pasta, handlers designados e testes correspondentes. Não editar índices/registro compartilhado em paralelo.
- Usar branches/worktrees isoladas após o primeiro commit; cada tarefa declara arquivos, dependências e comandos de verificação. Integração sequencial pelo coordenador, sem merge/push/rebase automático. Neste início há apenas revisões paralelas em leitura; alterações locais ficam com um único executor.

## Matriz de aceite a implementar

| Requisito | Cenário/teste Playwright | Evidência |
| --- | --- | --- |
| Catálogo | Busca, filtros combinados, ordem, paginação, histórico e respostas fora de ordem | URL e itens corretos |
| Detalhe | Acesso direto, inexistente, edição indisponível e quantidade | Estados e limites visíveis |
| Sessão | Cadastro/conflito, login, expiração em navegação/checkout, logout e troca de conta | Retomada e ausência de dados privados anteriores |
| Favoritos | Sucesso e falha de mutation | Otimista, rollback e persistência |
| Carrinho | Quantidades, remoção, cupom inválido/expirado, refresh e login | Totais da API e merge sem duplicação |
| Compra | Catálogo ao recibo | Snapshot confirmado pela simulação |
| Recuperação | Recusa, duplo clique, timeout após criação e refresh | Mesmo pedido para mesma chave; itens preservados na falha |
| Conta | Perfil, avatar, senha e carteiras, inclusive validação HTTP | Persistência e erros associados aos campos |
| Tempo real | Preço/estoque no checkout | Evento pelo socket e novo aceite obrigatório |
| Reconexão | Duplicata, versão antiga e desconexão durante pendência | Sem regressão/efeitos repetidos; recuperação por GET |
| Acessibilidade | Teclado, foco em diálogo/drawer, zoom, labels e reduced motion | Operação completa e feedback acessível |
| Rede | Skeleton lento, erro HTTP/conexão e retry | Dimensões estáveis e recuperação |

Fluxos principais em Chromium 390/1440; revisão de layout em 768. Baselines versionadas para início/detalhe/carrinho/pagamento com seed, relógio e assets estáveis. Testes isolados com relatório HTML e trace de falhas. Cada feature entrega seus testes; E7 fecha lacunas, não inicia toda a validação.

Lighthouse: build otimizado com mocks padrão, início e detalhe × mobile/desktop × três execuções = 12 medições. Reportar mediana por categoria e LCP/CLS/TBT, HTML/JSON, versões/ambiente/condições; justificar metas não atingidas. Fazer uma medição preliminar antes do fechamento para evitar correções tardias.

Deploy: publicar somente quando autorizado, com mocks/tempo real ativos e fallback de rotas. Aceite exige URL pública, smoke de compra, acesso direto e refresh, correspondência com o commit entregue e README reproduzível. README inicial descreve apenas comandos existentes; scripts E2E/auditoria entram com sua implementação.

## Commits

1. `docs: registra desafio e planejamento revisado` — enunciado, plano, complemento e `.gitignore`.
2. `chore: configura base React TypeScript e ferramentas` — package/lockfile, TS/Vite/lint e preparação de testes.
3. `feat: adiciona base de componentes e preview` — UI reutilizável, estilos provisórios, página de demonstração e README com comandos validados.
4. Próximos incrementos: contratos/ETH; prova REST/socket; cenários; depois commits por feature com testes correspondentes.

Não marcar como concluído o que ainda depende de Figma, prova de transporte, testes ou publicação. Não incluir node_modules, build, cache de agentes, relatórios temporários ou credenciais nos commits.
