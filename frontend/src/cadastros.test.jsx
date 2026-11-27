import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { abrir } from "./teste/apoio.jsx";

const linha = (nome) => screen.getByRole("rowheader", { name: nome }).closest("tr");

describe("CRUD 01: usuários", () => {
  it("lista os usuários em tabela com cabeçalhos", async () => {
    abrir({ rota: "/usuarios", como: "lucia" });
    expect(await screen.findByRole("rowheader", { name: "Ana Costa" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Nome", "E-mail", "Perfil", "Situação", "Ações"]);
    expect(within(linha("Beatriz Ribeiro")).getByText("Fornecedor")).toBeInTheDocument();
  });
  it("cria um usuário e envia os dados no formato da API", async () => {
    const { usuario, falsa } = abrir({ rota: "/usuarios", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Novo usuário" }));
    expect(screen.getByRole("heading", { name: "Novo usuário" })).toHaveFocus();
    await usuario.type(screen.getByLabelText(/Nome completo/), "Thiago Villar");
    await usuario.type(screen.getByLabelText(/E-mail/), "thiago@ciranda.app");
    await usuario.selectOptions(screen.getByLabelText(/Perfil/), "Cliente");
    await usuario.type(screen.getByLabelText(/Senha/), "senha-forte-1");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Usuário criado com sucesso.")).toBeInTheDocument();
    expect(falsa.ultimo("POST").corpo).toEqual({ nome: "Thiago Villar", email: "thiago@ciranda.app", perfilId: 2, ativo: true, senha: "senha-forte-1" });
    expect(await screen.findByRole("rowheader", { name: "Thiago Villar" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Novo usuário" })).not.toBeInTheDocument();
  });
  it("mostra os erros de validação em cada campo, ligados por aria", async () => {
    const { usuario } = abrir({ rota: "/usuarios", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Novo usuário" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Dados inválidos.")).toBeInTheDocument();
    const nome = screen.getByLabelText(/Nome completo/);
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(nome).toHaveAccessibleDescription("Campo obrigatório.");
    await waitFor(() => expect(nome).toHaveFocus());
    expect(screen.getByLabelText(/Senha/)).toHaveAccessibleDescription(/Campo obrigatório/);
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(4);
  });
  it("edita sem mandar senha quando ela fica em branco, e desativa a conta", async () => {
    const { usuario, falsa } = abrir({ rota: "/usuarios", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Editar Ana Costa" }));
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Ana Costa");
    expect(screen.getByText("Deixe em branco para manter a senha atual.")).toBeInTheDocument();
    await usuario.clear(screen.getByLabelText(/Nome completo/));
    await usuario.type(screen.getByLabelText(/Nome completo/), "Ana C.");
    await usuario.click(screen.getByLabelText("Conta ativa"));
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Usuário atualizado com sucesso.")).toBeInTheDocument();
    expect(falsa.ultimo("PUT")).toMatchObject({ caminho: "/usuarios/1", corpo: { nome: "Ana C.", email: "ana@ciranda.app", perfilId: 2, ativo: false } });
    expect(falsa.ultimo("PUT").corpo).not.toHaveProperty("senha");
    expect(within(linha("Ana C.")).getByText("Inativo")).toBeInTheDocument();
  });
  it("mostra conflito de e-mail vindo do servidor e deixa cancelar", async () => {
    const { usuario } = abrir({ rota: "/usuarios", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Editar Ana Costa" }));
    await usuario.clear(screen.getByLabelText(/E-mail/));
    await usuario.type(screen.getByLabelText(/E-mail/), "lucia@ciranda.app");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Já existe um usuário com esse e-mail.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: "Editar usuário" })).not.toBeInTheDocument();
  });
  it("pede confirmação antes de remover e permite desistir", async () => {
    const { usuario, falsa } = abrir({ rota: "/usuarios", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Remover Ana Costa" }));
    const confirmar = screen.getByRole("group", { name: "Confirmar remoção de Ana Costa" });
    await usuario.click(within(confirmar).getByRole("button", { name: "Não" }));
    expect(falsa.ultimo("DELETE")).toBeUndefined();
    await usuario.click(screen.getByRole("button", { name: "Remover Ana Costa" }));
    await usuario.click(screen.getByRole("button", { name: "Sim, remover" }));
    expect(await screen.findByText("Usuário removido.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("rowheader", { name: "Ana Costa" })).not.toBeInTheDocument());
  });
  it("mostra falha ao carregar e tenta de novo", async () => {
    const { usuario, falsa } = abrir({ rota: "/catalogo", como: "lucia" });
    await screen.findByText("2 peças encontradas");
    // A primeira requisição da tela de usuários é a lista. Ela falha uma vez.
    falsa.buscar.mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({ erro: "Erro interno." }) }));
    await usuario.click(screen.getByRole("link", { name: "Usuários" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("rowheader", { name: "Ana Costa" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("CRUD 02: perfis", () => {
  it("mostra as funcionalidades de cada perfil pelo nome", async () => {
    abrir({ rota: "/perfis", como: "lucia" });
    await waitFor(() => expect(within(linha("Fornecedor")).getByText("Ver o catálogo, Gerenciar peças, Comprar, Vender em consignação")).toBeInTheDocument());
    expect(within(linha("Cliente")).getByText("Ver o catálogo, Comprar, Vender em consignação")).toBeInTheDocument();
  });
  it("cria um perfil marcando funcionalidades", async () => {
    const { usuario, falsa } = abrir({ rota: "/perfis", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Novo perfil" }));
    await usuario.type(screen.getByLabelText(/Nome do perfil/), "Curadoria");
    const grupo = screen.getByRole("group", { name: /Funcionalidades liberadas/ });
    await usuario.click(within(grupo).getByLabelText(/Ver o catálogo/));
    await usuario.click(within(grupo).getByLabelText(/Gerenciar peças/));
    await usuario.click(within(grupo).getByLabelText(/Gerenciar usuários/));
    await usuario.click(within(grupo).getByLabelText(/Gerenciar usuários/));   // desmarca
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Perfil criado com sucesso.")).toBeInTheDocument();
    expect(falsa.ultimo("POST").corpo).toEqual({ nome: "Curadoria", descricao: "", funcionalidades: [1, 2] });
  });
  it("edita já com as funcionalidades atuais marcadas", async () => {
    const { usuario } = abrir({ rota: "/perfis", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Editar Fornecedor" }));
    const grupo = screen.getByRole("group", { name: /Funcionalidades liberadas/ });
    await waitFor(() => expect(within(grupo).getByLabelText(/Gerenciar peças/)).toBeChecked());
    expect(within(grupo).getByLabelText(/Gerenciar perfis/)).not.toBeChecked();
  });
  it("mostra o motivo quando o servidor recusa a remoção", async () => {
    const { usuario } = abrir({ rota: "/perfis", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Remover Cliente" }));
    await usuario.click(screen.getByRole("button", { name: "Sim, remover" }));
    expect(await screen.findByText(/Há usuários com este perfil/)).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Cliente" })).toBeInTheDocument();
  });
});

describe("CRUD 03: funcionalidades", () => {
  it("lista com a chave e cria uma nova", async () => {
    const { usuario, falsa } = abrir({ rota: "/funcionalidades", como: "lucia" });
    expect(await screen.findByText("usuarios.gerenciar")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Nova funcionalidade" }));
    await usuario.type(screen.getByLabelText(/^Nome/), "Ver relatórios");
    await usuario.type(screen.getByLabelText(/Chave/), "relatorios.ver");
    expect(screen.getByLabelText(/Chave/)).toHaveAccessibleDescription(/area\.acao/);
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("rowheader", { name: "Ver relatórios" })).toBeInTheDocument();
    expect(falsa.ultimo("POST").corpo).toEqual({ nome: "Ver relatórios", chave: "relatorios.ver", descricao: "" });
  });
  it("edita e remove", async () => {
    const { usuario, falsa } = abrir({ rota: "/funcionalidades", como: "lucia" });
    await usuario.click(await screen.findByRole("button", { name: "Editar Gerenciar peças" }));
    await usuario.type(screen.getByLabelText(/Descrição/), "Cadastro de peças.");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Cadastro de peças.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Remover Gerenciar peças" }));
    await usuario.click(screen.getByRole("button", { name: "Sim, remover" }));
    await waitFor(() => expect(falsa.ultimo("DELETE").caminho).toBe("/funcionalidades/2"));
  });
});

describe("peças do brechó", () => {
  it("cria uma peça convertendo preço e voltas para número", async () => {
    const { usuario, falsa } = abrir({ rota: "/pecas", como: "beatriz" });
    expect(await screen.findByRole("rowheader", { name: "Calça jeans reta" })).toBeInTheDocument();
    expect(within(linha("Calça jeans reta")).getByText(/119,90/)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Nova peça" }));
    await usuario.type(screen.getByLabelText(/Título/), "Saia midi plissada");
    await usuario.selectOptions(screen.getByLabelText(/Categoria/), "Saias");
    await usuario.selectOptions(screen.getByLabelText(/Conservação/), "Ótimo estado");
    await usuario.type(screen.getByLabelText(/Preço em reais/), "69.9");
    await usuario.selectOptions(screen.getByLabelText(/Foto/), "saia verde");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Peça criada com sucesso.")).toBeInTheDocument();
    expect(falsa.ultimo("POST").corpo).toMatchObject({ titulo: "Saia midi plissada", categoria: "Saias", preco: 69.9, voltas: 1, situacao: "Disponível", foto: "saia-verde.webp" });
  });
  it("edita uma peça existente e aceita campos numéricos vazios", async () => {
    const { usuario, falsa } = abrir({ rota: "/pecas", como: "beatriz" });
    await usuario.click(await screen.findByRole("button", { name: "Editar Vestido midi floral" }));
    expect(screen.getByLabelText(/Preço em reais/)).toHaveValue(149);
    await usuario.clear(screen.getByLabelText(/Preço em reais/));
    await usuario.clear(screen.getByLabelText(/Voltas/));
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Dados inválidos.")).toBeInTheDocument();
    expect(falsa.ultimo("PUT").corpo.preco).toBeUndefined();
  });
  it("mostra estado vazio quando não há nada cadastrado", async () => {
    abrir({ rota: "/pecas", como: "beatriz", preparar: (banco) => { banco.pecas.length = 0; } });
    expect(await screen.findByText(/Nada cadastrado ainda/)).toBeInTheDocument();
  });
});

describe("catálogo", () => {
  it("lista as peças com preço, voltas e situação", async () => {
    abrir({ rota: "/catalogo", como: "ana" });
    expect(await screen.findByRole("heading", { name: "Calça jeans reta" })).toBeInTheDocument();
    expect(screen.getByText("2 peças encontradas")).toBeInTheDocument();
    expect(screen.getByText("3ª volta")).toBeInTheDocument();
    expect(screen.getByText("Reservada")).toBeInTheDocument();
    expect(screen.getByText("sem foto")).toBeInTheDocument();
  });
  it("filtra por busca e por categoria", async () => {
    const { usuario, falsa } = abrir({ rota: "/catalogo", como: "ana" });
    await screen.findByText("2 peças encontradas");
    await usuario.type(screen.getByLabelText("Buscar por peça ou marca"), "vestido");
    expect(await screen.findByText("1 peça encontrada")).toBeInTheDocument();
    expect(falsa.pedidos.at(-1).filtros).toEqual({ q: "vestido" });
    await usuario.clear(screen.getByLabelText("Buscar por peça ou marca"));
    await usuario.selectOptions(screen.getByLabelText("Categoria"), "Saias");
    expect(await screen.findByText("0 peças encontradas")).toBeInTheDocument();
  });
  it("lê os filtros da URL, mostra o estado vazio e limpa os filtros", async () => {
    const { usuario, falsa } = abrir({ rota: "/catalogo?q=nada-disso&categoria=Saias", como: "ana" });
    expect(await screen.findByText("Nenhuma peça com esse filtro")).toBeInTheDocument();
    expect(falsa.pedidos.at(-1).filtros).toEqual({ q: "nada-disso", categoria: "Saias" });
    expect(screen.getByLabelText("Buscar por peça ou marca")).toHaveValue("nada-disso");
    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(await screen.findByText("2 peças encontradas")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toHaveValue("");
  });
  it("troca a foto que não carrega por um aviso, sem ícone de imagem quebrada", async () => {
    const { container } = abrir({ rota: "/catalogo", como: "ana" });
    await screen.findByText("2 peças encontradas");
    expect(screen.getAllByText("sem foto")).toHaveLength(1);
    fireEvent.error(container.querySelector(".peca img"));
    expect(screen.getAllByText("sem foto")).toHaveLength(2);
  });
  it("não mostra no catálogo a peça que ainda espera análise, nem para quem gerencia o acervo", async () => {
    abrir({ rota: "/catalogo", como: "lucia", preparar: (banco) => { banco.pecas.push({ id: 9, titulo: "Saia midi plissada", marca: "Amaro", tamanho: "M", categoria: "Saias", conservacao: "Ótimo estado", preco: 69.9, voltas: 1, foto: "", situacao: "Em análise", donoId: 2 }); } });
    expect(await screen.findByText("2 peças encontradas")).toBeInTheDocument();
    expect(screen.queryByText("Saia midi plissada")).toBeNull();
  });
  it("apertar Enter na busca não recarrega a página", async () => {
    abrir({ rota: "/catalogo", como: "ana" });
    await screen.findByText("2 peças encontradas");
    const envio = new Event("submit", { bubbles: true, cancelable: true });
    screen.getByRole("search").dispatchEvent(envio);
    expect(envio.defaultPrevented).toBe(true);
  });
  it("mostra um convite quando o catálogo não tem peça nenhuma", async () => {
    abrir({ rota: "/catalogo", como: "ana", preparar: (banco) => { banco.pecas.length = 0; } });
    expect(await screen.findByText("O catálogo ainda está vazio")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
  });
  it("põe o nome da página no título da aba", async () => {
    const { usuario } = abrir({ rota: "/catalogo", como: "lucia" });
    await screen.findByText("2 peças encontradas");
    expect(document.title).toBe("Catálogo · Ciranda");
    await usuario.click(screen.getByRole("link", { name: "Perfis" }));
    await screen.findByRole("heading", { name: "Perfis", level: 1 });
    expect(document.title).toBe("Perfis · Ciranda");
  });
  it("avisa quando a busca falha", async () => {
    const { falsa } = abrir({ rota: "/catalogo", como: "ana" });
    await screen.findByText("2 peças encontradas");
    falsa.buscar.mockRejectedValue(new TypeError("sem rede"));
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "Vestidos" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/conexão/);
  });
});
