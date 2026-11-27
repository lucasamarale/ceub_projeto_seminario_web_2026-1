import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { montar } from "./apoio.js";

let ctx, admin;
beforeEach(async () => { ctx = await montar(); admin = await ctx.entrar("lucia@ciranda.app"); });
const peca = { titulo: "Saia midi plissada", categoria: "Saias", conservacao: "Ótimo estado", preco: 49.9 };

describe("validação de entrada com ValidationPipe e class-validator", () => {
  it("devolve uma mensagem por campo, em português, escolhendo a regra mais básica", async () => {
    const r = await ctx.api("post", "/api/pecas", admin).send({ titulo: "ab", categoria: "Chapéus", conservacao: 7, preco: "caro", voltas: 100, marca: "m".repeat(41), foto: "pasta/foto.png" });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({
      erro: "Dados inválidos.",
      detalhes: {
        titulo: "Mínimo de 3 caracteres.", categoria: "Valor não permitido.", conservacao: "Deve ser texto.", preco: "Número inválido.",
        voltas: "Máximo 99.", marca: "Máximo de 40 caracteres.", foto: "Informe só o nome do arquivo da foto.",
      },
    });
    const baixo = await ctx.api("post", "/api/pecas", admin).send({ ...peca, preco: 0 });
    expect(baixo.body.detalhes).toEqual({ preco: "Mínimo 0.01." });
  });
  it("campo vazio conta como não enviado, e campo obrigatório ausente é apontado", async () => {
    const r = await ctx.api("post", "/api/pecas", admin).send({ titulo: "   ", categoria: null, conservacao: "", marca: "" });
    expect(r.body.detalhes).toEqual({ titulo: "Campo obrigatório.", categoria: "Campo obrigatório.", conservacao: "Campo obrigatório.", preco: "Campo obrigatório." });
  });
  it("converte número enviado como texto, tira espaços e guarda o e-mail em minúsculas", async () => {
    const criada = await ctx.api("post", "/api/pecas", admin).send({ ...peca, titulo: "  Saia midi plissada  ", preco: "49.90", voltas: "3" });
    expect(criada.status).toBe(201);
    expect(criada.body).toMatchObject({ titulo: "Saia midi plissada", preco: 49.9, voltas: 3 });
    const conta = await ctx.api("post", "/api/auth/cadastro").send({ nome: "Camila Prado", email: "  Camila@Ciranda.APP ", senha: "senha-forte-1" });
    expect(conta.body.usuario.email).toBe("camila@ciranda.app");
  });
  it("descarta campo que o DTO não declara (lista de permissão)", async () => {
    const criada = await ctx.api("post", "/api/pecas", admin).send({ ...peca, donoId: 1, motivo: "invadido", id: 999 });
    expect(criada.status).toBe(201);
    expect(criada.body).toMatchObject({ donoId: null, motivo: "" });
    expect(criada.body.id).not.toBe(999);
    // No cadastro aberto, mandar perfilId não muda o perfil: a conta nasce sempre como Cliente.
    const conta = await ctx.api("post", "/api/auth/cadastro").send({ nome: "Camila Prado", email: "camila@ciranda.app", senha: "senha-forte-1", perfilId: 1, ativo: false });
    expect(conta.body.usuario.perfil).toBe("Cliente");
  });
  it("recusa corpo que não é um objeto e tipos trocados", async () => {
    const lista = await ctx.api("post", "/api/auth/login").send([{ email: "ana@ciranda.app", senha: "ciranda123" }]);
    expect(lista.status).toBe(400);
    expect(lista.body.detalhes).toEqual({ email: "Campo obrigatório.", senha: "Campo obrigatório." });
    const usuario = await ctx.api("post", "/api/usuarios", admin).send({ nome: "Thiago Villar", email: "thiago@ciranda.app", senha: "curta", perfilId: "dois", ativo: "sim" });
    expect(usuario.body.detalhes).toEqual({ senha: "Mínimo de 8 caracteres.", perfilId: "Número inválido.", ativo: "Deve ser verdadeiro ou falso." });
    const perfil = await ctx.api("post", "/api/perfis", admin).send({ nome: "Curadoria", funcionalidades: [1, "dois"] });
    expect(perfil.body.detalhes).toEqual({ funcionalidades: "Deve ser uma lista de identificadores." });
    const texto = await ctx.api("post", "/api/perfis", admin).send({ nome: "Curadoria", funcionalidades: "1,2" });
    expect(texto.body.detalhes).toEqual({ funcionalidades: "Deve ser uma lista de identificadores." });
  });
  it("valida também a query string e o identificador da rota", async () => {
    const filtro = await ctx.api("get", "/api/pecas?categoria=Chap%C3%A9us&q=" + "x".repeat(61), admin);
    expect(filtro.status).toBe(400);
    expect(filtro.body.detalhes).toEqual({ categoria: "Valor não permitido.", q: "Máximo de 60 caracteres." });
    expect((await ctx.api("get", "/api/pecas?categoria=&q=", admin)).status).toBe(200);
    for (const id of ["abc", "0", "-1", "1.5", "1%20OR%201=1"]) {
      const r = await ctx.api("get", `/api/usuarios/${id}`, admin);
      expect(r.status, id).toBe(400);
      expect(r.body.detalhes).toEqual({ id: "Identificador inválido." });
    }
  });
});

describe("Swagger: respostas de erro documentadas", () => {
  it("toda rota com identificador documenta 400 e 404, e toda rota com corpo documenta 400", async () => {
    const { body: doc } = await request(ctx.app).get("/api/docs-json");
    const faltando = [];
    let comId = 0, comCorpo = 0;
    for (const [caminho, metodos] of Object.entries(doc.paths)) {
      for (const [metodo, rota] of Object.entries(metodos)) {
        const status = Object.keys(rota.responses);
        if (caminho.includes("{")) { comId++; for (const s of ["400", "404"]) if (!status.includes(s)) faltando.push(`${metodo} ${caminho}: ${s}`); }
        if (rota.requestBody) { comCorpo++; if (!status.includes("400")) faltando.push(`${metodo} ${caminho}: 400`); }
        // Toda rota protegida pela chave de API documenta 401 e 429.
        if (caminho !== "/api/saude") for (const s of ["401", "429"]) if (!status.includes(s)) faltando.push(`${metodo} ${caminho}: ${s}`);
      }
    }
    expect(faltando).toEqual([]);
    expect(comId).toBeGreaterThanOrEqual(15);
    expect(comCorpo).toBeGreaterThanOrEqual(11);
  });
  it("as respostas de erro apontam para o formato único { erro, detalhes }", async () => {
    const { body: doc } = await request(ctx.app).get("/api/docs-json");
    expect(Object.keys(doc.components.schemas.ErroDto.properties)).toEqual(["erro", "detalhes"]);
    const buscar = doc.paths["/api/usuarios/{id}"].get.responses;
    for (const s of ["400", "401", "403", "404"]) expect(buscar[s].content["application/json"].schema.$ref, s).toContain("ErroDto");
    // O filtro do catálogo e os DTOs de entrada aparecem com as regras (tamanho, lista de valores).
    expect(doc.paths["/api/pecas"].get.parameters.map((p) => p.name).sort()).toEqual(["categoria", "q", "situacao"]);
    expect(doc.components.schemas.ConsignacaoEntradaDto.required.sort()).toEqual(["categoria", "conservacao", "preco", "titulo"]);
    expect(doc.components.schemas.UsuarioCriarDto.required).toContain("senha");
    expect(doc.components.schemas.UsuarioEditarDto.required).not.toContain("senha");
  });
});

describe("estrutura do Nest", () => {
  it("cada recurso tem o seu módulo, controlador, serviço e DTOs em arquivos separados", async () => {
    const fs = await import("node:fs");
    for (const recurso of ["usuarios", "perfis", "funcionalidades", "pecas", "sacola", "pedidos", "consignacao", "painel"]) {
      for (const parte of ["module", "controller", "service", "dto"]) {
        expect(fs.existsSync(new URL(`../src/${recurso}/${recurso}.${parte}.ts`, import.meta.url)), `${recurso}.${parte}.ts`).toBe(true);
      }
    }
  });
});
