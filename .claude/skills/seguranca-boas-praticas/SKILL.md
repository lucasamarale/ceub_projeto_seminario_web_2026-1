---
name: seguranca-boas-praticas
description: Regras de segurança e boas práticas do Ciranda Web (OWASP Top 10, hash de senhas, criptografia, HTTPS, validação de entrada, gestão de segredos e JWT). Use ao criar ou revisar login, rota, entrada de dados, cookie, segredo ou qualquer código que toque em dado de usuário.
---

# Segurança e boas práticas do Ciranda Web

Esta skill diz o que todo código deste projeto precisa cumprir para ser seguro: defesas contra os ataques do OWASP Top 10, proteção de dados, segurança de aplicação e uso do JWT com o front. Cada regra aponta o arquivo do repositório onde ela já está aplicada, e os testes que provam que funciona estão em `backend/test/seguranca.test.js` e `backend/test/plataforma.test.js`.

Antes de mexer em login, entrada de dados, cookie ou segredo, leia a seção correspondente. Depois de mexer, rode a conferência do fim desta página. As regras de estrutura do back-end estão na skill irmã, `arquitetura-backend`.

## 1. OWASP Top 10

**SQL injection.** O valor digitado nunca vira pedaço de SQL.

- Use os métodos do cliente do Prisma (`findMany`, `create`, `update`). Eles mandam os valores como parâmetros.
- Se precisar de SQL puro, use `$queryRaw` com template (`$queryRaw\`... WHERE id = ${id}\``), que também parametriza.
- `$queryRawUnsafe` e `$executeRawUnsafe` são proibidos com qualquer valor vindo de requisição. O único uso no projeto é aplicar as migrations, cujo SQL vem do repositório.
- Identificador de rota passa por `lerId`, que só aceita inteiro positivo.

**XSS.** Nada que a pessoa digitou é executado como código.

- A API só devolve JSON, com `Content-Security-Policy: default-src 'none'`.
- No front, o React escapa todo texto. É proibido usar `dangerouslySetInnerHTML`.
- A CSP do site (`vercel.json`) só permite script do próprio domínio.
- O token de sessão longa fica em cookie `HttpOnly`, fora do alcance de script.
- O filtro de requisições em `seguranca.ts` recusa corpo com `<script`, `onerror=` e `javascript:`. Ele é uma camada a mais, não a defesa principal.

**CSRF.** Um site de fora não consegue agir em nome de quem está logado.

- As rotas de dados não aceitam cookie. Elas pedem o JWT no cabeçalho `Authorization`, que o navegador nunca envia sozinho.
- O cookie de sessão é `SameSite=Strict` e só vale em `/api/auth`.
- Toda rota pede o cabeçalho `X-API-Key`. Um formulário em outro site não consegue enviar cabeçalho próprio.
- Requisição com `Origin` fora da lista recebe 403.

**Controle de acesso** (o primeiro item do Top 10). Toda rota declara quem pode usá-la.

- `@Autenticado("chave.da.funcionalidade")` no controlador ou na rota. Sem a chave no perfil, a resposta é 403.
- Recurso de outra pessoa responde 404, não 403, para não revelar que existe.
- Campo sensível nunca vem do formulário: perfil no cadastro aberto, dono e situação na consignação, e preço no pedido são definidos pelo servidor.

**Força bruta e abuso.** Limite de 120 requisições por minuto por IP, e de 10 por minuto em login, cadastro e renovação. O login responde a mesma mensagem para e-mail errado, senha errada e conta desativada.

## 2. Proteção de dados

**Hash de senhas.**

- Senha é gravada com bcrypt (`bcryptjs`), custo 10. Nunca em texto, nunca com MD5 ou SHA puro.
- O hash nunca sai da API: as consultas usam `select` sem o campo `senhaHash`.
- Senha nunca aparece em log, em mensagem de erro nem na documentação.
- Quando o e-mail não existe, o login compara com um hash falso, para o tempo de resposta não entregar quem tem conta.

**Criptografia.**

- O JWT é assinado com HMAC SHA-256 (HS256). O algoritmo é fixado na verificação.
- O token de renovação tem 32 bytes aleatórios de `crypto.randomBytes`. No banco fica só o SHA-256 dele.
- Comparação de segredo usa `crypto.timingSafeEqual` (chave de API em `guardas.ts`).
- Número aleatório de segurança vem sempre de `node:crypto`, nunca de `Math.random`.

**HTTPS.**

- Em produção o site só responde por HTTPS (a hospedagem redireciona o HTTP).
- A API manda `Strict-Transport-Security`, que faz o navegador recusar HTTP nas visitas seguintes.
- O cookie de sessão sai com `Secure` em produção.

## 3. Segurança de aplicação

**Validação de entrada.** Tudo o que chega é validado no servidor, mesmo que o front já valide.

- A validação segue o padrão do Nest: `ValidationPipe` com class-validator e class-transformer. As regras ficam no DTO, como decoradores, e o pipe roda antes de o controlador ser chamado.
- Na rota, o corpo e a consulta entram por `@Body(validado(MeuDto))` ou `@Query(validado(MeuDto))`. O identificador da rota entra por `@Param("id", IdDaRota)`. Os dois estão em `backend/src/comum/validacao.ts`.
- O pipe usa `whitelist`: campo que o DTO não declara é descartado. É uma lista de permissão, então ninguém grava `perfilId` ou `situacao` onde não devia.
- Cada campo do DTO tem tipo (`@IsString`, `@IsInt`, `@IsNumber`, `@IsBoolean`), obrigatoriedade (`@IsDefined` ou `@IsOptional`) e limites (`@MinLength`, `@MaxLength`, `@Min`, `@Max`). Lista fechada de valores usa `@IsIn`. Formato usa `@Matches` com expressão regular. Número que pode chegar como texto usa `@Type(() => Number)`.
- As mensagens em português são as constantes de `validacao.ts` (`obrigatorio`, `texto`, `minimo`, `maximo`, `email`, `opcao`, `numero`...). Exemplo de campo: `@IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(80, maximo) nome!: string;`. Copie de `backend/src/pecas/pecas.dto.ts`.
- O erro volta com status 400 e uma mensagem por campo em `detalhes`.
- O corpo tem teto de 100 kB.

**Gestão de segredos.**

- Segredo vive em variável de ambiente, lida em um lugar só: `backend/src/config.ts`.
- `backend/.env.example` lista as variáveis com valores de mentira. O `.env` de verdade está no `.gitignore`.
- Em produção a API não sobe sem `JWT_SEGREDO` e `API_KEY`.
- Nunca escreva segredo em código, teste, commit, log ou resposta. Se um segredo vazar, troque-o. Apagar o commit não resolve.
- A senha `ciranda123` das contas de demonstração é pública de propósito: os dados são fictícios.

## 4. JWT: comunicação com o front

O front e a API conversam com dois tokens, cada um guardado onde é mais seguro.

| | JWT de acesso | Token de renovação |
| --- | --- | --- |
| Duração | 30 minutos | 7 dias |
| Onde fica | `sessionStorage` da aba | Cookie `HttpOnly` |
| Como viaja | Cabeçalho `Authorization: Bearer` | O navegador envia sozinho, só para `/api/auth` |
| Para que serve | Todas as rotas de dados | Só pedir um JWT novo |

Fluxo:

1. `POST /api/auth/login` devolve `{ token, usuario }` e grava o cookie.
2. O front guarda o token (`frontend/src/api.js`) e o envia em toda chamada.
3. A guarda de autenticação confere a assinatura e o prazo, e carrega o usuário **do banco** a cada requisição. O JWT só leva o identificador (`sub`). Mudar um perfil ou desativar uma conta vale na requisição seguinte.
4. Quando o JWT vence, a API responde 401. O front chama `POST /api/auth/renovar`, recebe outro JWT e repete a chamada.
5. O token de renovação é de uso único: a cada troca ele é apagado e nasce outro.
6. `POST /api/auth/sair` apaga a sessão no banco e o cookie.

Regras:

- Nada de dado sensível dentro do JWT: qualquer pessoa consegue ler o conteúdo dele.
- O algoritmo é fixado em HS256 ao verificar. Token com outro algoritmo é recusado.
- O JWT não vai em URL nem em cookie.

## Conferência antes de entregar

Rode na pasta `backend/`:

```bash
npm test   # inclui os testes de segurança, de cookie e de CSRF
```

E confira, para cada rota nova ou alterada:

- [ ] Tem `@Autenticado` com a funcionalidade certa, ou um motivo escrito para ser aberta.
- [ ] Valida o corpo e a consulta no servidor, com um DTO do class-validator e `validado(Dto)` na rota.
- [ ] Acessa o banco pelo Prisma, sem `$queryRawUnsafe` com valor de requisição.
- [ ] Filtra pelo dono quando o dado é de uma pessoa, e responde 404 para o que é de outra.
- [ ] Não devolve hash, segredo nem campo interno, nem na resposta nem no log.
- [ ] Não usa cookie como credencial de rota de dados.
- [ ] Nenhum segredo novo foi escrito no código: entrou em `config.ts` e em `.env.example`.
- [ ] Tem um teste que tenta o acesso indevido e espera 401, 403 ou 404.
