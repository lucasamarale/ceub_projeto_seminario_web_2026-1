import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { App } from "../App.jsx";
import { ProvedorDeSessao } from "../sessao.jsx";
import { criarApiFalsa } from "./apiFalsa.js";

// Sobe o aplicativo inteiro contra a API falsa. Se "como" vier, já entra com esse usuário.
export function abrir({ rota = "/", como, preparar } = {}) {
  const falsa = criarApiFalsa();
  if (preparar) preparar(falsa.banco);
  vi.stubGlobal("fetch", falsa.buscar);
  if (como) {
    const u = falsa.banco.usuarios.find((x) => x.email.startsWith(como));
    sessionStorage.setItem("ciranda.token", `token-${u.id}`);
  }
  const usuario = userEvent.setup();
  const tela = render(
    <MemoryRouter initialEntries={[rota]}>
      <ProvedorDeSessao><App /></ProvedorDeSessao>
    </MemoryRouter>,
  );
  return { ...tela, falsa, usuario };
}
