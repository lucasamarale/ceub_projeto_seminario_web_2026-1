import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { abrir } from "./teste/apoio.jsx";

describe("entrada no sistema", () => {
  it("retoma a sessão pelo cookie quando a aba não tem token", async () => {
    const { falsa } = abrir({ rota: "/catalogo", preparar: (banco) => { banco.cookie = 1; } });
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeInTheDocument();
    expect(falsa.pedidos[0]).toMatchObject({ metodo: "POST", caminho: "/auth/renovar" });
    expect(sessionStorage.getItem("ciranda.token")).toBe("token-1");
  });
  it("sem token e sem cookie, vai para o login", async () => {
    abrir({ rota: "/catalogo" });
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });
  it("manda para o login quem não está logado", async () => {
    abrir({ rota: "/usuarios" });
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });
  it("mostra erro com credenciais erradas e mantém a pessoa na tela", async () => {
    const { usuario } = abrir({ rota: "/entrar" });
    await usuario.type(await screen.findByLabelText("E-mail"), "lucia@ciranda.app");
    await usuario.type(screen.getByLabelText("Senha"), "senha-errada");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-describedby", "login-erro");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
  it("preenche pela conta de demonstração, entra e mostra o menu completo da administradora", async () => {
    const { usuario } = abrir({ rota: "/entrar" });
    await usuario.click(await screen.findByRole("button", { name: /Administradora/ }));
    expect(screen.getByLabelText("E-mail")).toHaveValue("lucia@ciranda.app");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));
    const menu = within(await screen.findByRole("navigation", { name: "Principal" }));
    expect(menu.getAllByRole("link").map((l) => l.textContent)).toEqual(["Catálogo", "Sacola", "Pedidos", "Vender", "Bastidores", "Peças", "Usuários", "Perfis", "Funcionalidades"]);
    expect(await screen.findByRole("heading", { name: "Catálogo" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ciranda.token")).toBe("token-3");
  });
});

describe("o perfil decide o que aparece", () => {
  it("cliente vê a loja e é barrada em tela de gestão", async () => {
    abrir({ rota: "/usuarios", como: "ana" });
    expect(await screen.findByRole("heading", { name: "Sem acesso" })).toBeInTheDocument();
    const menu = within(screen.getByRole("navigation", { name: "Principal" }));
    expect(menu.getAllByRole("link").map((l) => l.textContent)).toEqual(["Catálogo", "Sacola", "Pedidos", "Vender"]);
  });
  it("fornecedor vê a loja e o cadastro de peças", async () => {
    abrir({ como: "beatriz" });
    const menu = within(await screen.findByRole("navigation", { name: "Principal" }));
    expect(menu.getAllByRole("link").map((l) => l.textContent)).toEqual(["Catálogo", "Sacola", "Pedidos", "Vender", "Peças"]);
    expect(screen.getByText(/^Conectado como/).parentElement).toHaveTextContent("Conectado como Beatriz · Fornecedor");
  });
  it("avisa quando o perfil não tem nenhuma funcionalidade", async () => {
    abrir({ como: "ana", preparar: (banco) => { banco.perfis.find((p) => p.nome === "Cliente").funcionalidades = []; } });
    expect(await screen.findByText(/nenhuma funcionalidade liberada/)).toBeInTheDocument();
  });
});

describe("barra de cima", () => {
  it("separa as abas da loja das de gestão, cada grupo com o seu nome", async () => {
    abrir({ como: "lucia" });
    const loja = await screen.findByRole("group", { name: "Loja" });
    const gestao = screen.getByRole("group", { name: "Gestão" });
    expect(within(loja).getAllByRole("link").map((a) => a.textContent)).toEqual(["Catálogo", "Sacola", "Pedidos", "Vender"]);
    expect(within(gestao).getAllByRole("link").map((a) => a.textContent)).toEqual(["Bastidores", "Peças", "Usuários", "Perfis", "Funcionalidades"]);
    expect(screen.getByText("Loja")).toBeInTheDocument();
  });
  it("quem só tem a loja não vê nome de grupo", async () => {
    abrir({ como: "ana" });
    expect(await screen.findByRole("group", { name: "Loja" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Gestão" })).toBeNull();
    expect(screen.queryByText("Loja")).toBeNull();
  });
});

describe("sessão", () => {
  it("sai, limpa o token e volta ao login", async () => {
    const { usuario } = abrir({ como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Sair" }));
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ciranda.token")).toBeNull();
  });
  it("descarta token inválido guardado ao recarregar", async () => {
    sessionStorage.setItem("ciranda.token", "token-inexistente");
    abrir();
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ciranda.token")).toBeNull();
  });
  it("leva ao login com aviso quando a sessão expira no meio do uso", async () => {
    const { usuario, falsa } = abrir({ como: "lucia" });
    await screen.findByRole("heading", { name: "Catálogo" });
    falsa.banco.usuarios.length = 0;   // o servidor passa a recusar o token
    await usuario.click(screen.getByRole("link", { name: "Usuários" }));
    expect(await screen.findByText("Sua sessão expirou. Entre de novo.")).toBeInTheDocument();
  });
});

describe("navegação", () => {
  it("abre e fecha o menu no celular e marca a página atual", async () => {
    const { usuario } = abrir({ como: "lucia" });
    const botao = await screen.findByRole("button", { name: "Menu" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    await usuario.click(botao);
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
    await usuario.click(screen.getByRole("link", { name: "Perfis" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.getByRole("link", { name: "Perfis" })).toHaveAttribute("aria-current", "page"));
  });
  it("tem atalho para pular ao conteúdo e trata endereço inexistente", async () => {
    abrir({ rota: "/nao-existe", como: "lucia" });
    expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#conteudo");
  });
});
