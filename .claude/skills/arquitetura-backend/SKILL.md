---
name: arquitetura-backend
description: Padrão de arquitetura e back-end do Ciranda Web (NestJS, HTTP, REST com Swagger, Prisma com migrations e tabelas tbl_NNN_nome). Use ao criar ou revisar rota, controlador, serviço, tabela ou migration.
---

# Arquitetura e back-end do Ciranda Web

Esta skill diz como escrever e como revisar o back-end deste projeto: framework, uso do HTTP, documentação da API, acesso ao banco e nome das tabelas. Cada regra aponta o arquivo do repositório que serve de exemplo, para você copiar o que já existe em vez de inventar um jeito novo.

Antes de mexer em qualquer coisa, leia o arquivo de exemplo da seção. Depois de mexer, rode a conferência do fim desta página. As regras de segurança estão na skill irmã, `seguranca-boas-praticas`.

## 1. Framework: NestJS

O back-end é uma aplicação NestJS sobre Express, em TypeScript, na pasta `backend/`.

- **Módulo:** `backend/src/app.module.ts` registra controladores, serviços, a guarda global da chave de API e o filtro global de erros.
- **Controlador:** recebe a requisição, lê parâmetros e devolve o que o serviço responder. Não tem regra de negócio nem acesso ao banco.
- **Serviço:** tem a regra de negócio e fala com o banco pelo `PrismaService`.
- **Guarda:** decide se a requisição passa (chave de API, login, permissão). Ficam em `backend/src/comum/guardas.ts`.
- **Interceptador:** roda antes da rota. O `EmDia` (`backend/src/loja/reservas.ts`) solta as reservas vencidas.
- **Filtro de erros:** `backend/src/comum/filtro-de-erros.ts` transforma qualquer erro em `{ erro, detalhes }`.

Para criar um recurso novo, copie `backend/src/funcionalidades/funcionalidades.ts`, que é o CRUD mais simples: DTOs, serviço e controlador no mesmo arquivo. Depois registre o controlador e o serviço em `app.module.ts`.

Toda dependência entra pelo construtor com `@Inject(Classe)` explícito. Os testes rodam o TypeScript direto, sem os metadados de tipo, e sem o `@Inject` a injeção falha neles.

## 2. Web e APIs: HTTP

**Métodos.** Cada verbo tem um sentido só:

| Método | Uso | Exemplo |
| --- | --- | --- |
| GET | Ler. Nunca altera nada. | `GET /api/pecas` |
| POST | Criar, ou executar uma ação. | `POST /api/usuarios`, `POST /api/pedidos/7/pagar` |
| PUT | Substituir um recurso inteiro. | `PUT /api/perfis/2` |
| DELETE | Remover. | `DELETE /api/pecas/9` |

**Status codes.** Use o código que descreve o que aconteceu. Nunca devolva 200 com um erro dentro.

| Código | Quando |
| --- | --- |
| 200 | Leitura, edição ou ação que deu certo. |
| 201 | Recurso criado. |
| 204 | Deu certo e não há corpo (remoção, sair). |
| 400 | Dado inválido. O corpo traz `detalhes` com o erro de cada campo. |
| 401 | Falta chave de API, token, ou eles não valem. |
| 403 | Está logado, mas o perfil não tem a funcionalidade. Ou a origem não é permitida. |
| 404 | Não existe. Também é a resposta para recurso de outra pessoa. |
| 409 | Conflito com o estado atual: e-mail repetido, peça já reservada, perfil em uso. |
| 413 | Corpo maior que 100 kB. |
| 429 | Passou do limite de requisições. |
| 500 | Erro inesperado. A resposta é sempre `{ "erro": "Erro interno." }`. |

Para devolver um erro, lance `ErroHttp` ou um dos atalhos de `backend/src/comum/erros.ts` (`naoEncontrado`, `conflito`, `invalido`, `semAcesso`). Não monte a resposta de erro à mão no controlador.

**Headers.** Os que a API usa:

- `X-API-Key`: chave do cliente. Obrigatória em toda rota, menos `GET /api/saude`.
- `Authorization: Bearer <JWT>`: quem está logado.
- `Content-Type: application/json`: todo corpo é JSON.
- Cabeçalhos de segurança da resposta, postos pelo helmet em `backend/src/comum/seguranca.ts`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- `RateLimit` e `RateLimit-Policy`: quanto resta do limite.

**Cookies.** A API grava um cookie só, `ciranda_sessao`, em `backend/src/auth/auth.controller.ts`. Todo cookie novo segue as mesmas quatro travas:

| Atributo | Para quê |
| --- | --- |
| `HttpOnly` | O JavaScript da página não lê. Um XSS não leva a sessão. |
| `Secure` | Só viaja por HTTPS (ligado em produção). |
| `SameSite=Strict` | O navegador não envia em requisição vinda de outro site. Barra CSRF. |
| `Path=/api/auth` | O cookie só acompanha as rotas que precisam dele. |

Nunca guarde em cookie um dado que o front precise ler. Nunca use cookie como credencial das rotas de dados: elas pedem o JWT no cabeçalho.

**CORS.** A lista de origens permitidas vem da variável `CORS_ORIGENS`. Origem fora da lista recebe 403 antes de chegar a qualquer rota (`corsRestrito` em `seguranca.ts`). Nunca use `*`, porque a API aceita credenciais.

## 3. APIs REST: documentação Swagger

A documentação é gerada do código e fica em `/api/docs` (página) e `/api/docs-json` (OpenAPI). A montagem está em `backend/src/app.ts`.

Toda rota nova precisa de:

1. `@ApiTags` no controlador.
2. `@ApiOperation({ summary })` dizendo o que a rota faz, em uma linha.
3. `@ApiBody({ type: Dto })` quando há corpo, com um DTO cujos campos têm `@ApiProperty({ type, example })`.
4. `@ApiResponse` para o sucesso e para cada erro que a rota pode devolver (400, 404, 409).
5. `@ComChaveDeApi()` e `@Autenticado(...)`, que também documentam o 401 e o 403.

O tipo vai sempre explícito no `@ApiProperty` (`type: String`, `type: [Number]`). DTO de resposta nunca tem campo de senha ou de hash.

Nomes de rota: substantivo no plural, em minúsculas, sem verbo (`/api/pecas`, não `/api/listarPecas`). Ação que não é CRUD vira sub-rota com POST (`/api/pedidos/:id/pagar`).

## 4. ORM e migrations: Prisma

Todo acesso ao banco passa pelo cliente do Prisma, injetado como `PrismaService` (`backend/src/banco/prisma.service.ts`). O esquema fica em `backend/prisma/schema.prisma`.

Para mudar o banco:

1. Edite `backend/prisma/schema.prisma`.
2. Rode `npm run migrar -- --name descricao_curta`. O Prisma cria uma pasta em `prisma/migrations` com o SQL.
3. Rode `npm run migracoes:empacotar`. O banco de demonstração é descartável e a API aplica as migrations ao subir, a partir de `src/banco/migracoes.ts`. Um teste falha se você esquecer este passo.
4. Faça o commit da migration. Migration que já foi para o repositório não se edita: crie outra.

Regras de uso:

- Quando duas gravações dependem uma da outra, use `prisma.$transaction`. Exemplo: fechar o pedido em `backend/src/loja/pedidos.ts`.
- Para evitar que duas pessoas mudem a mesma linha, troque a situação com `updateMany` e condição no `where`, e confira o `count`. Exemplo: reservar a peça em `backend/src/loja/sacola.ts`.
- Use `select` para escolher os campos devolvidos. É assim que o hash da senha nunca sai (`backend/src/usuarios/usuarios.ts`).
- Dado de outra pessoa se filtra no `where`, com o identificador de quem está logado. Nunca confie em identificador vindo do corpo.

## 5. Padrão de tabelas: tbl + número + nome

Toda tabela se chama `tbl_NNN_nome`: o prefixo `tbl`, um número de três dígitos e o nome no plural, em minúsculas, sem acento, com `_` entre as palavras.

| Tabela | Modelo no Prisma |
| --- | --- |
| `tbl_001_usuarios` | `Usuario` |
| `tbl_002_perfis` | `Perfil` |
| `tbl_003_funcionalidades` | `Funcionalidade` |
| `tbl_004_perfis_funcionalidades` | `PerfilFuncionalidade` |
| `tbl_005_pecas` | `Peca` |
| `tbl_006_sacola_itens` | `SacolaItem` |
| `tbl_007_pedidos` | `Pedido` |
| `tbl_008_pedidos_itens` | `PedidoItem` |
| `tbl_009_pedidos_eventos` | `PedidoEvento` |
| `tbl_010_sessoes` | `Sessao` |

Regras:

- A tabela nova recebe o próximo número livre. Número não se reaproveita nem se troca.
- No Prisma, o modelo tem nome no singular e campos em camelCase. O nome físico vai no `@@map("tbl_011_nome")` e, nas colunas, no `@map("nome_da_coluna")` em snake_case.
- Chave estrangeira termina em `_id` (`perfil_id`). Data termina em `_em` (`criado_em`).
- Toda relação declara o `onDelete` (`Cascade`, `Restrict` ou `SetNull`). Não deixe o padrão decidir.

O teste "padrão do banco" em `backend/test/plataforma.test.js` lê as tabelas do banco real e falha se alguma fugir do padrão. Ao criar uma tabela, acrescente o nome dela na lista do teste.

## Conferência antes de entregar

Rode na pasta `backend/`:

```bash
npx prisma validate   # o esquema está certo
npm test              # testes e cobertura mínima de 80%
npm run build         # o TypeScript compila
```

E confira, para cada rota nova ou alterada:

- [ ] Controlador sem regra de negócio, serviço sem `req` nem `res`.
- [ ] Usa o método HTTP certo e devolve o status code da tabela da seção 2.
- [ ] Está documentada no Swagger, com o corpo e os erros possíveis.
- [ ] Acessa o banco só pelo `PrismaService`.
- [ ] Tabela nova segue `tbl_NNN_nome`, tem migration no repositório e entrou na lista do teste.
- [ ] Tem teste do caminho feliz e de pelo menos um erro.
- [ ] Passou pela conferência da skill `seguranca-boas-praticas`.
