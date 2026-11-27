# Ciranda Web

Projeto da disciplina de Desenvolvimento Web (CEUB, Ciência da Computação). A Ciranda é um brechó online: quem tem roupa parada deixa a peça em consignação, e quem procura reserva, paga e acompanha o pedido. Este repositório traz os cadastros pedidos na disciplina, com controle de acesso por perfil, e a loja inteira em volta deles.

![CI](https://github.com/lucasamarale/ceub_projeto_seminario_web_2026-1/actions/workflows/ci.yml/badge.svg)

**No ar:** https://ciranda-web.vercel.app

**Equipe:** Bruno Rodrigues dos Santos, Eduardo Clemente, Isaac Gomes de Moraes e Lucas Amaral Evangelista

## Padrão de back-end pedido em aula e onde está

O professor pediu que o back-end siga estes itens e que o projeto tenha skills com eles. São duas, uma para cada coluna do slide da aula:

- [`.claude/skills/arquitetura-backend/SKILL.md`](.claude/skills/arquitetura-backend/SKILL.md): NestJS, HTTP, REST com Swagger, Prisma com migrations e padrão de tabelas.
- [`.claude/skills/seguranca-boas-praticas/SKILL.md`](.claude/skills/seguranca-boas-praticas/SKILL.md): OWASP Top 10, proteção de dados, segurança de aplicação e JWT.

Cada item também está no código:

| Item | Como foi feito | Onde está |
| --- | --- | --- |
| **Framework: NestJS** | API em NestJS com TypeScript: módulo, controladores, serviços, guardas, interceptador e filtro de erros. | `backend/src/app.module.ts` |
| **HTTP: métodos** | GET lê, POST cria ou executa ação, PUT substitui, DELETE remove. | Controladores em `backend/src/*/` |
| **HTTP: status codes** | 200, 201, 204, 400, 401, 403, 404, 409, 413, 429 e 500, cada um com um sentido só. | `backend/src/comum/erros.ts` e `filtro-de-erros.ts` |
| **HTTP: headers** | `X-API-Key`, `Authorization: Bearer`, cabeçalhos de segurança do helmet e de limite de taxa. | `backend/src/comum/seguranca.ts` |
| **HTTP: cookies** | Cookie de sessão `HttpOnly`, `Secure`, `SameSite=Strict`, restrito a `/api/auth`. | `backend/src/auth/auth.controller.ts` |
| **HTTP: CORS** | Lista de origens permitidas. Origem fora da lista recebe 403. | `corsRestrito` em `backend/src/comum/seguranca.ts` |
| **APIs REST com Swagger** | Documentação gerada do código, com corpo, respostas e esquemas de segurança de cada rota. | https://ciranda-web.vercel.app/api/docs e `backend/src/app.ts` |
| **ORM e migrations: Prisma** | Todo acesso ao banco pelo cliente do Prisma. Mudança de banco só por migration. | `backend/prisma/schema.prisma` e `backend/prisma/migrations/` |
| **Padrão de tabelas** | `tbl` + número + nome: `tbl_001_usuarios` até `tbl_010_sessoes`. Um teste lê o banco e falha se alguma tabela fugir do padrão. | `backend/prisma/schema.prisma` e `backend/test/plataforma.test.js` |
| **OWASP: SQL injection** | Consultas parametrizadas pelo Prisma. Nenhum valor de requisição é colado em SQL. | `backend/src/banco/prisma.service.ts` |
| **OWASP: XSS** | API só devolve JSON com CSP `default-src 'none'`. O React escapa todo texto. Sessão longa em cookie `HttpOnly`. | `backend/src/comum/seguranca.ts` e `vercel.json` |
| **OWASP: CSRF** | Rotas de dados pedem JWT no cabeçalho, não cookie. Cookie `SameSite=Strict`, origem conferida e cabeçalho `X-API-Key` obrigatório. | Testes "CSRF" em `backend/test/plataforma.test.js` |
| **Hash de senhas** | bcrypt com custo 10. O hash nunca sai da API. | `backend/src/auth/auth.service.ts` e `backend/src/usuarios/usuarios.ts` |
| **Criptografia** | JWT assinado com HMAC SHA-256. Token de sessão aleatório de 32 bytes, guardado no banco só como SHA-256. | `backend/src/auth/auth.service.ts` |
| **HTTPS** | O site só responde por HTTPS, a API manda `Strict-Transport-Security` e o cookie sai com `Secure`. | `backend/src/comum/seguranca.ts` |
| **Validação de entrada** | Todo corpo e toda consulta passam por regras de tipo, tamanho e formato. Campo fora da regra é descartado. | `backend/src/comum/validar.ts` |
| **Gestão de segredos** | Segredos só em variável de ambiente. Em produção a API não sobe sem eles. | `backend/src/config.ts` e `backend/.env.example` |
| **JWT com o front** | JWT de 30 minutos no cabeçalho `Authorization`, renovado pelo cookie de sessão sem a pessoa perceber. | `backend/src/comum/guardas.ts` e `frontend/src/api.js` |

## O que foi pedido no trabalho e onde está

| Requisito | Onde está |
| --- | --- |
| Back-end separado no diretório | `backend/` (NestJS, Prisma, SQLite) |
| Front-end com framework à escolha | `frontend/` (React com Vite) |
| Tailwind CSS e Materialize | `frontend/tailwind.config.js` e `frontend/src/estilo.css` |
| Identidade visual do CEUB | Paleta oficial da Central da Marca em `frontend/tailwind.config.js` |
| CRUD 01: Usuário | `backend/src/usuarios/usuarios.ts` e tela Usuários |
| CRUD 02: Perfil | `backend/src/perfis/perfis.ts` e tela Perfis |
| CRUD 03: Funcionalidades | `backend/src/funcionalidades/funcionalidades.ts` e tela Funcionalidades |
| Cobertura de testes de 80% | Limite de 80% configurado nos dois `vitest.config`; o CI falha abaixo disso |
| Cypress | `frontend/cypress/e2e/` (30 testes de ponta a ponta) |
| Mock, fixture, fake e stub | Mock em `frontend/src/api.test.js`, fixtures em `frontend/cypress/fixtures/`, fake em `frontend/src/teste/apiFalsa.js`, stub da arara em `frontend/cypress/e2e/03-simulado.cy.js` |
| GitHub Actions (CI/CD) | `.github/workflows/ci.yml` para os testes, e publicação automática na Vercel a cada push na `main` |
| Mobile | Layout responsivo, testado em 390 px no Cypress |
| Acessibilidade | Rótulos, foco visível, link de pular ao conteúdo, avisos com `role=status` e `role=alert` |
| CORS | `backend/src/comum/seguranca.ts`, lista de origens liberadas |
| Tokens | JWT de 30 minutos e sessão renovável por cookie, em `backend/src/auth/` |
| Chave de API | Cabeçalho `X-API-Key` exigido em toda rota de `/api` |
| CSP | Helmet na API e meta tag no `frontend/index.html` |
| Firewall de camada 7 e WAF | Firewall da Vercel na borda, com regra própria, mais o filtro de requisições e o limite de taxa em `backend/src/comum/seguranca.ts` |

Além dos três cadastros pedidos, há um quarto, de peças, que alimenta o catálogo.

## A loja

Tudo o que o Ciranda original fazia, agora com servidor, permissão por funcionalidade e testes:

| Função | Como funciona | Onde está |
| --- | --- | --- |
| Cadastro aberto | Qualquer pessoa cria conta e entra sempre como Cliente. O perfil nunca vem do formulário. | `backend/src/auth/`, tela Criar conta |
| Sacola com reserva | Colocar na sacola reserva a peça por 30 minutos. Duas pessoas não reservam a mesma peça, e a reserva vencida volta sozinha ao catálogo. | `backend/src/loja/sacola.ts`, `backend/src/loja/reservas.ts` |
| Pix simulado | Fechar a sacola gera um pedido com código Pix de mentira e prazo. Um botão faz o papel do banco e abre a tela de comprado, com confetes e o que a compra poupou. Nenhum dinheiro circula. | `backend/src/loja/pedidos.ts`, tela do pedido |
| Pedidos e rastreio | Linha do tempo de Pago a Entregue, com histórico e código de rastreio simulado. Cada pessoa vê só os próprios pedidos. | `backend/src/loja/pedidos.ts` |
| Consignação | A pessoa envia a peça, o brechó aprova ou recusa com motivo, e a venda gera repasse de 60% para quem enviou. | `backend/src/loja/consignacao.ts`, telas Vender e Bastidores |
| Impacto e pontos | Cada peça mostra a água e o carbono que poupa. Cada compra paga soma pontos. Categoria sem fator confiável não mostra número. | `backend/src/comum/impacto.ts`, `frontend/src/impacto.js` |
| Bastidores | Vendido, a repassar, fila de consignação e pedidos para mover de etapa. | `backend/src/loja/painel.ts`, tela Bastidores |

Quatro funcionalidades novas entram no cadastro de funcionalidades e podem ser dadas a qualquer perfil: `sacola.usar`, `consignacao.publicar`, `consignacao.aprovar` e `bastidores.ver`.

Para ver tudo em cinco minutos: entre como Ana, abra uma peça, coloque na sacola, feche o pedido e confirme o Pix simulado. Em Vender, envie uma peça. Depois entre como Lúcia e abra Bastidores para aprovar a peça e mover o pedido.

## A arara 3D

No topo do catálogo, as peças de cima (camiseta, camisa, moletom e jaqueta) ficam penduradas em uma arara 3D que gira com o mouse ou o dedo. Escolher uma peça, na arara ou na lista, abre a página dela, onde a peça gira em 3D e mostra marca, tamanho, conservação, número de voltas e a estimativa de água e carbono que aquela volta poupa (fatores em `frontend/src/impacto.js`, os mesmos do Ciranda original). O pacote 3D só é baixado quando o catálogo abre, e em aparelho sem WebGL a arara some e a lista continua inteira, então nada depende dela para funcionar.

Cada tecido tem a sua trama: malha nas camisetas e moletons, tela no linho das camisas e sarja no jeans das jaquetas. O pano atrasa, balança e assenta quando a peça gira.

O código que liga a arara ao catálogo está em `frontend/src/arara.js` e `frontend/src/componentes/Arara.jsx`. O pacote compilado fica em `frontend/public/arara3d/`.

## Como o acesso funciona

Cada usuário tem um perfil, e cada perfil tem um conjunto de funcionalidades. O menu só mostra o que o perfil permite, e a API confere a permissão de novo a cada requisição, lendo o usuário no banco. Esconder o botão não basta: quem chamar a API direto também é barrado.

Contas de demonstração (senha `ciranda123`, dados fictícios):

| E-mail | Perfil | Enxerga |
| --- | --- | --- |
| lucia@ciranda.app | Administradora | Tudo |
| beatriz@ciranda.app | Fornecedor | Catálogo, loja e cadastro de peças |
| ana@ciranda.app | Cliente | Catálogo e loja |

## Como rodar

Precisa do Node 22.13 ou mais novo.

```bash
# terminal 1: API em http://localhost:3333, documentação em http://localhost:3333/api/docs
cd backend
npm install        # também gera o cliente do Prisma
npm run build
npm start

# terminal 2: site em http://localhost:5173
cd frontend
npm install
npm run dev
```

Sem configurar nada, a API sobe com um banco SQLite descartável, aplica as migrations e grava os dados de demonstração. Para guardar os dados em arquivo e usar os comandos do Prisma:

```bash
cd backend
cp .env.example .env                 # ajuste BANCO=dados/ciranda.db
npm run migrar:producao              # prisma migrate deploy: cria as tabelas
npm run migrar -- --name minha_mudanca   # prisma migrate dev: cria uma migration nova
npm run migracoes:empacotar          # atualiza o SQL que a API aplica no banco descartável
```

## Testes

```bash
cd backend && npm test          # 97 testes, com relatório de cobertura
cd frontend && npm test         # 109 testes, com relatório de cobertura
cd frontend && npm run build && npm run e2e   # sobe API e site e roda o Cypress
```

Cobertura medida na última execução: back-end 100% das linhas e front-end 100% das linhas. O relatório detalhado fica em `coverage/index.html` de cada pasta.

Os testes usam três tipos de dublê:

- **Mock:** `vi.fn()` no lugar do `fetch`, para conferir cabeçalhos e chamadas (`frontend/src/api.test.js`).
- **Fake:** uma API inteira em memória, com regras parecidas com as da real (`frontend/src/teste/apiFalsa.js`).
- **Fixture:** respostas prontas em JSON que o Cypress entrega no lugar do servidor (`frontend/cypress/fixtures/`).

No Cypress, os arquivos `01`, `02` e `04` rodam contra a API de verdade (o `04` percorre a loja inteira, da conta nova ao repasse), e o `03` usa `cy.intercept` com fixtures para os casos difíceis de provocar, como servidor fora do ar e sessão vencida.

## Segurança

- **Chave de API:** toda rota de `/api` exige `X-API-Key`, comparada em tempo constante. A exceção é `/api/saude`.
- **Tokens:** login devolve um JWT assinado, válido por 30 minutos, e grava um cookie `HttpOnly` de sessão, de uso único, que renova o JWT. A senha fica guardada com bcrypt.
- **CSRF:** as rotas de dados não aceitam cookie. O cookie é `SameSite=Strict`, só vale em `/api/auth`, e requisição de origem fora da lista recebe 403.
- **CORS:** só as origens em `CORS_ORIGENS` são aceitas.
- **CSP:** a API responde com `default-src 'none'`, e o site restringe scripts, estilos, imagens e conexões à própria origem.
- **Camada 7:** limite de requisições por minuto (mais apertado no login), corpo limitado a 100 kB e um filtro que recusa padrões conhecidos de ataque na URL e no corpo.
- **SQL:** todo acesso ao banco passa pelo Prisma, que parametriza as consultas.
- **Dados de cada pessoa:** sacola, pedidos e peças em consignação são filtrados pelo dono no servidor. Pedido de outra pessoa responde 404, para não revelar que o número existe.

Observações honestas:

1. São duas camadas. Na borda, o firewall da Vercel faz a mitigação automática de ataques de volume e aplica uma regra nossa, que nega caminhos típicos de varredura (`/.env`, `/.git`, `/wp-admin` e parecidos) antes de chegarem ao site. Dentro da aplicação, o filtro de requisições é um complemento, não um substituto.
2. Em produção o banco é um SQLite descartável: os dados de demonstração voltam ao estado inicial quando a hospedagem reinicia a API. Como o acesso é todo pelo Prisma, trocar por um banco gerenciado é mudar o `provider` do esquema e o adaptador.
3. Chave de API em um site que roda no navegador não é segredo, porque qualquer pessoa consegue ler. Ela identifica o cliente autorizado; quem protege os dados é o token.
4. As cores são as da Central da Marca do CEUB (roxo escuro `#43054E`, roxo `#662C92`, lilás `#BF0087`, magenta `#EC0089` e amarelo `#FDE100`). O logotipo da instituição não é usado.
5. A arara e os modelos de camiseta, moletom e camisa vêm do componente Clothes Rack, de DiMaac UI. A página do componente não informa a licença, então o repositório traz só o pacote compilado, sem o código-fonte dele.

## Estrutura

```
backend/    API (NestJS), banco (Prisma com SQLite), Swagger e testes (Vitest com Supertest)
.claude/    Skills do projeto: arquitetura e back-end, segurança e boas práticas
frontend/   Site (React, Tailwind, Materialize), testes (Vitest, Testing Library) e Cypress
.github/    Pipeline do GitHub Actions
vercel.json Publicação: o site e a API como dois serviços do mesmo projeto
```

## Pipeline

A cada push ou pull request, o GitHub Actions confere o esquema do Prisma, roda os testes e o build do back-end, os testes e o build do front-end, e depois o Cypress com a API e o site no ar. A cada push na `main`, a Vercel publica o site e a API em https://ciranda-web.vercel.app. Os segredos de produção (segredo do token e chave de API) ficam nas variáveis de ambiente da Vercel, fora do repositório.
