import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { gerarArquivo, lerMigracoes } from "../scripts/empacotar-migracoes.mjs";
import { COOKIE_DE_SESSAO } from "../src/auth/auth.controller.ts";
import { PecasService } from "../src/pecas/pecas.service.ts";
import { enderecoDoBanco } from "../src/config.ts";
import { CHAVE, montar } from "./apoio.js";

const DIA = 24 * 60 * 60 * 1000;
// Extrai o cookie de sessão da resposta: o valor para reenviar e o texto inteiro para conferir as travas.
const cookieDe = (resposta) => {
  const texto = (resposta.headers["set-cookie"] || []).find((c) => c.startsWith(`${COOKIE_DE_SESSAO}=`)) || "";
  return { texto, par: texto.split(";")[0], valor: texto.split(";")[0].split("=")[1] };
};
const login = (ctx, email = "ana@ciranda.app") => ctx.api("post", "/api/auth/login").send({ email, senha: "ciranda123" });

describe("padrão do banco: tbl + número + nome", () => {
  it("toda tabela segue o padrão, com números em sequência e sem repetição", async () => {
    const { db } = await montar();
    const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((t) => t.name);
    expect(tabelas).toEqual([
      "tbl_001_usuarios", "tbl_002_perfis", "tbl_003_funcionalidades", "tbl_004_perfis_funcionalidades", "tbl_005_pecas",
      "tbl_006_sacola_itens", "tbl_007_pedidos", "tbl_008_pedidos_itens", "tbl_009_pedidos_eventos", "tbl_010_sessoes",
    ]);
    for (const [i, nome] of tabelas.entries()) expect(nome).toMatch(new RegExp(`^tbl_${String(i + 1).padStart(3, "0")}_[a-z]+(_[a-z]+)*$`));
  });
  it("o esquema do Prisma mapeia cada modelo para uma tabela do padrão", () => {
    const esquema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    const modelos = esquema.match(/^model \w+/gm);
    const mapas = esquema.match(/@@map\("tbl_\d{3}_[a-z_]+"\)/g);
    expect(modelos).toHaveLength(10);
    expect(mapas).toHaveLength(modelos.length);
  });
});

describe("migrations do Prisma", () => {
  it("o SQL que a API aplica ao subir é o mesmo da pasta prisma/migrations", () => {
    const empacotado = fs.readFileSync(new URL("../src/banco/migracoes.ts", import.meta.url), "utf8").replaceAll("\r\n", "\n");
    expect(empacotado, "rode npm run migracoes:empacotar").toBe(gerarArquivo());
    expect(lerMigracoes().length).toBeGreaterThan(0);
  });
  it("um banco que já tem as tabelas não é migrado nem semeado de novo", async () => {
    const primeiro = await montar();
    await primeiro.api("post", "/api/auth/cadastro").send({ nome: "Camila Prado", email: "camila@ciranda.app", senha: "senha-forte-1" });
    const segundo = await montar({ banco: primeiro.prisma.endereco });
    expect(segundo.db.prepare("SELECT COUNT(*) AS n FROM tbl_001_usuarios").get().n).toBe(4);
    expect(segundo.db.prepare("SELECT COUNT(*) AS n FROM tbl_002_perfis").get().n).toBe(3);
  });
  it("resolve o endereço do banco: descartável, caminho de arquivo ou endereço pronto", () => {
    expect(enderecoDoBanco(":memory:")).toMatch(/^file:.*ciranda-\d+-\d+-\d+\.db$/);
    // Caminho do Windows vira endereço com barra normal.
    expect(enderecoDoBanco(":memory:")).not.toContain("\\");
    expect(enderecoDoBanco(":memory:")).not.toBe(enderecoDoBanco(":memory:"));
    expect(enderecoDoBanco("dados/x.db")).toMatch(/^file:.*\/dados\/x\.db$/);
    expect(enderecoDoBanco("file:/tmp/y.db")).toBe("file:/tmp/y.db");
  });
});

describe("documentação Swagger", () => {
  it("publica o OpenAPI com as rotas, os dois esquemas de segurança e os status codes", async () => {
    const { app } = await montar();
    const { body: doc } = await (await import("supertest")).default(app).get("/api/docs-json");
    expect(doc.info.title).toBe("Ciranda Web");
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining([
      "/api/saude", "/api/auth/login", "/api/auth/cadastro", "/api/auth/renovar", "/api/auth/sair", "/api/auth/eu",
      "/api/usuarios", "/api/usuarios/{id}", "/api/perfis", "/api/funcionalidades", "/api/pecas", "/api/sacola",
      "/api/pedidos", "/api/pedidos/{id}/pagar", "/api/consignacoes", "/api/consignacoes/{id}/aprovar", "/api/impacto", "/api/bastidores",
    ]));
    expect(Object.keys(doc.components.securitySchemes)).toEqual(expect.arrayContaining(["chave-de-api", "bearer", "cookie"]));
    const criar = doc.paths["/api/usuarios"].post;
    expect(Object.keys(criar.responses)).toEqual(expect.arrayContaining(["201", "400", "401", "403", "409"]));
    expect(criar.requestBody.content["application/json"].schema.$ref).toContain("UsuarioCriarDto");
    expect(doc.components.schemas.UsuarioCriarDto.properties.email.type).toBe("string");
    // A documentação nunca descreve o hash da senha como campo de resposta.
    expect(JSON.stringify(doc.components.schemas.UsuarioDto)).not.toMatch(/senha/i);
  });
  it("serve a página com uma CSP própria, sem afrouxar a do resto da API", async () => {
    const { app } = await montar();
    const pedir = (await import("supertest")).default(app);
    const pagina = await pedir.get("/api/docs");
    expect(pagina.status).toBe(200);
    expect(pagina.headers["content-security-policy"]).toContain("https://unpkg.com");
    expect((await pedir.get("/api/saude")).headers["content-security-policy"]).toContain("default-src 'none'");
  });
});

describe("cookie de sessão", () => {
  it("o login grava um cookie HttpOnly, SameSite=Strict, restrito às rotas de acesso", async () => {
    const ctx = await montar();
    const { texto, valor } = cookieDe(await login(ctx));
    expect(texto).toMatch(/HttpOnly/);
    expect(texto).toMatch(/SameSite=Strict/);
    expect(texto).toMatch(/Path=\/api\/auth/);
    expect(texto).not.toMatch(/Secure/);
    // No banco fica só o hash do token, nunca o token.
    const sessao = ctx.db.prepare("SELECT token_hash FROM tbl_010_sessoes").get();
    expect(sessao.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sessao.token_hash).not.toBe(valor);
  });
  it("em produção o cookie só viaja por HTTPS", async () => {
    const ctx = await montar({ cookieSeguro: true });
    expect(cookieDe(await login(ctx)).texto).toMatch(/Secure/);
  });
  it("o cadastro também abre sessão com cookie", async () => {
    const ctx = await montar();
    const r = await ctx.api("post", "/api/auth/cadastro").send({ nome: "Camila Prado", email: "camila@ciranda.app", senha: "senha-forte-1" });
    expect(cookieDe(r).texto).toMatch(/HttpOnly/);
  });
  it("renovar troca o cookie por um JWT novo e o token antigo deixa de valer", async () => {
    const ctx = await montar();
    const primeiro = cookieDe(await login(ctx));
    const r = await ctx.api("post", "/api/auth/renovar").set("Cookie", primeiro.par);
    expect(r.status).toBe(200);
    expect(r.body.usuario.email).toBe("ana@ciranda.app");
    expect((await ctx.api("get", "/api/auth/eu", r.body.token)).status).toBe(200);
    const segundo = cookieDe(r);
    expect(segundo.valor).not.toBe(primeiro.valor);
    const repetido = await ctx.api("post", "/api/auth/renovar").set("Cookie", primeiro.par);
    expect(repetido.status).toBe(401);
    expect(cookieDe(repetido).texto).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", segundo.par)).status).toBe(200);
  });
  it("sem cookie, com cookie inventado ou vencido, não renova", async () => {
    let agora = Date.now();
    const ctx = await montar({ agora: () => agora });
    expect((await ctx.api("post", "/api/auth/renovar")).status).toBe(401);
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", `${COOKIE_DE_SESSAO}=inventado`)).body.erro).toBe("Sessão encerrada. Entre de novo.");
    const { par } = cookieDe(await login(ctx));
    agora += 8 * DIA;
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", par)).status).toBe(401);
    expect(ctx.db.prepare("SELECT COUNT(*) AS n FROM tbl_010_sessoes").get().n).toBe(0);
  });
  it("conta desativada não renova", async () => {
    const ctx = await montar();
    const { par } = cookieDe(await login(ctx));
    ctx.db.prepare("UPDATE tbl_001_usuarios SET ativo = 0 WHERE email = 'ana@ciranda.app'").run();
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", par)).status).toBe(401);
  });
  it("sair apaga a sessão no banco e o cookie no navegador", async () => {
    const ctx = await montar();
    const { par } = cookieDe(await login(ctx));
    const r = await ctx.api("post", "/api/auth/sair").set("Cookie", par);
    expect(r.status).toBe(204);
    expect(cookieDe(r).texto).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", par)).status).toBe(401);
    expect((await ctx.api("post", "/api/auth/sair")).status).toBe(204);
  });
  it("trocar a senha ou desativar a conta derruba as sessões abertas", async () => {
    const ctx = await montar();
    const admin = await ctx.entrar("lucia@ciranda.app");
    const { par } = cookieDe(await login(ctx));
    const ana = ctx.db.prepare("SELECT id, perfil_id FROM tbl_001_usuarios WHERE email = 'ana@ciranda.app'").get();
    await ctx.api("put", `/api/usuarios/${ana.id}`, admin).send({ nome: "Ana Costa", email: "ana@ciranda.app", perfilId: ana.perfil_id, senha: "outra-senha-forte" });
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", par)).status).toBe(401);
  });
});

describe("CSRF", () => {
  it("a renovação por cookie é recusada quando vem de outro site", async () => {
    const ctx = await montar();
    const { par } = cookieDe(await login(ctx));
    const forjada = await ctx.api("post", "/api/auth/renovar").set("Cookie", par).set("Origin", "https://site-malicioso.example");
    expect(forjada.status).toBe(403);
    expect(forjada.body.erro).toBe("Origem não permitida pelo CORS.");
    // A sessão continua de pé: a requisição forjada nem chegou à rota.
    expect((await ctx.api("post", "/api/auth/renovar").set("Cookie", par).set("Origin", "http://localhost:5173")).status).toBe(200);
  });
  it("sem o cabeçalho X-API-Key, que um formulário de outro site não consegue enviar, o cookie sozinho não basta", async () => {
    const ctx = await montar();
    const { par } = cookieDe(await login(ctx));
    const r = await (await import("supertest")).default(ctx.app).post("/api/auth/renovar").set("Cookie", par);
    expect(r.status).toBe(401);
    expect(r.body.erro).toBe("Chave de API ausente ou inválida.");
  });
  it("as rotas de dados não aceitam o cookie como credencial: pedem o JWT no cabeçalho", async () => {
    const ctx = await montar();
    const { par } = cookieDe(await login(ctx));
    expect((await ctx.api("get", "/api/pecas").set("Cookie", par)).status).toBe(401);
  });
  it("a origem permitida recebe os cabeçalhos de CORS com credenciais", async () => {
    const ctx = await montar();
    const r = await ctx.api("get", "/api/saude").set("Origin", "http://localhost:5173");
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(r.headers["access-control-allow-credentials"]).toBe("true");
  });
});

describe("respostas de erro", () => {
  it("rota que não existe responde 404 no formato da API", async () => {
    const ctx = await montar();
    const r = await ctx.api("get", "/api/nao-existe");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ erro: "Rota não encontrada." });
  });
  it("método não previsto na rota responde 404", async () => {
    const ctx = await montar();
    expect((await ctx.api("patch", "/api/saude")).status).toBe(404);
  });
  it("erro inesperado vira 500 sem vazar o detalhe", async () => {
    const ctx = await montar();
    const token = await ctx.entrar("ana@ciranda.app");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(ctx.nest.get(PecasService), "listar").mockRejectedValue(new Error("SQLITE_ERROR: tabela secreta tbl_001_usuarios"));
    const r = await ctx.api("get", "/api/pecas", token);
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ erro: "Erro interno." });
    expect(log).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it("erro HTTP do próprio Nest sai no mesmo formato", async () => {
    const { HttpException } = await import("@nestjs/common");
    const ctx = await montar();
    const token = await ctx.entrar("ana@ciranda.app");
    vi.spyOn(ctx.nest.get(PecasService), "listar").mockRejectedValue(new HttpException("Serviço em manutenção.", 503));
    const r = await ctx.api("get", "/api/pecas", token);
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ erro: "Serviço em manutenção." });
    vi.restoreAllMocks();
  });
  it("a chave de API errada no tamanho certo também é recusada", async () => {
    const ctx = await montar();
    const r = await (await import("supertest")).default(ctx.app).get("/api/pecas").set("X-API-Key", "x".repeat(CHAVE.length));
    expect(r.status).toBe(401);
  });
});
