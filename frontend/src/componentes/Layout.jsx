import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { MENU } from "../menu.js";
import { useSessao } from "../sessao.jsx";
import { Logo } from "./Logo.jsx";

export function Layout() {
  const { usuario, pode, sair } = useSessao();
  const [aberto, setAberto] = useState(false);
  const itens = MENU.filter((i) => pode(i.exige));
  const grupos = ["Loja", "Gestão"].map((nome) => [nome, itens.filter((i) => i.grupo === nome)]).filter(([, lista]) => lista.length);
  const classe = ({ isActive }) => `item-menu ${isActive ? "ativo" : ""}`;
  const { pathname } = useLocation();
  // O título da aba acompanha a página, para o histórico e para quem usa leitor de tela.
  useEffect(() => {
    const atual = MENU.find((i) => pathname.startsWith(i.rota));
    document.title = `${atual ? atual.rotulo : "Sem acesso"} · Ciranda`;
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        {/* Linha de cima: marca à esquerda, quem está logado e a saída à direita. */}
        <div className="topo-barra bg-ceub-escuro text-white">
          <div className="topo-dentro">
            <NavLink to="/" aria-label="Ciranda, início" className="shrink-0"><Logo claro tamanho={28} /></NavLink>
            <p className="conta"><span className="sr-only">Conectado como </span>{usuario.nome.split(" ")[0]}<span className="perfil-nome"> · {usuario.perfil}</span></p>
            <button type="button" className="btn btn-small sair" onClick={() => sair()}>Sair</button>
            <button type="button" className="botao-menu" aria-expanded={aberto} aria-controls="menu-principal" onClick={() => setAberto((a) => !a)}>
              {aberto ? "Fechar menu" : "Menu"}
            </button>
          </div>
        </div>
        {/* Linha de baixo: as abas, separadas em grupos com nome quando o perfil enxerga mais de um. */}
        <nav id="menu-principal" aria-label="Principal" className={`abas ${aberto ? "aberto" : ""}`}>
          <div className="abas-dentro">
            {grupos.map(([nome, lista]) => (
              <div key={nome} className="abas-grupo" role="group" aria-label={nome}>
                {grupos.length > 1 && <span className="abas-rotulo" aria-hidden="true">{nome}</span>}
                <ul>
                  {lista.map((i) => (
                    <li key={i.rota}><NavLink to={i.rota} className={classe} onClick={() => setAberto(false)}>{i.rotulo}</NavLink></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </header>
      <main id="conteudo" tabIndex="-1" className="mx-auto w-full max-w-6xl px-4 py-8 flex-1"><Outlet /></main>
      <footer className="border-t border-ceub-linha">
        <p className="mx-auto max-w-6xl px-4 py-5 m-0 text-sm text-ceub-cinza">Ciranda · projeto de Desenvolvimento Web, CEUB 2026. Sistema acadêmico, sem vendas reais.</p>
      </footer>
    </div>
  );
}
