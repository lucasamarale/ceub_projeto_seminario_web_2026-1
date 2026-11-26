import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { brl, CATEGORIAS } from "../menu.js";
import { Arara } from "../componentes/Arara.jsx";

// Entrada dos cartões: intervalos que diminuem, só nos primeiros, e tudo termina em cerca de 300 ms.
const ESPERAS = [0, 45, 85, 120, 150, 175, 195, 210];

// Quem gerencia o acervo recebe da API também as peças em análise e recusadas, que aparecem na tela Peças.
// No catálogo elas nunca entram: ali só fica o que já foi aprovado.
const noCatalogo = (p) => !["Em análise", "Recusada"].includes(p.situacao);

export function Catalogo() {
  const [pecas, setPecas] = useState(null);
  const [erro, setErro] = useState("");
  // Foto que não carrega vira "sem foto", em vez do ícone de imagem quebrada.
  const [semImagem, setSemImagem] = useState({});
  // Busca e categoria ficam na URL: o link pode ser compartilhado e o botão Voltar funciona.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const categoria = params.get("categoria") || "";
  const filtrar = (chave, valor) => setParams((atual) => {
    const novo = new URLSearchParams(atual);
    if (valor) novo.set(chave, valor); else novo.delete(chave);
    return novo;
  }, { replace: true });
  // O campo de busca tem estado próprio, para a digitação nunca atrasar. A URL recebe o texto
  // quando a pessoa para de digitar, e é a URL que dispara a consulta.
  const [texto, setTexto] = useState(q);
  const enviado = useRef(q);
  useEffect(() => {
    if (texto === enviado.current) return undefined;
    const espera = setTimeout(() => { enviado.current = texto; filtrar("q", texto); }, 250);
    return () => clearTimeout(espera);
  }, [texto]);
  // Se a URL mudar por fora (botão Voltar, Limpar filtros), o campo acompanha.
  useEffect(() => { if (q !== enviado.current) { enviado.current = q; setTexto(q); } }, [q]);
  const setCategoria = (v) => filtrar("categoria", v);

  useEffect(() => {
    let vivo = true;
    api.listar("/pecas", { q, categoria })
      .then((r) => { if (vivo) { setPecas(r.filter(noCatalogo)); setErro(""); } })
      .catch((e) => { if (vivo) { setPecas([]); setErro(e.message); } });
    return () => { vivo = false; };
  }, [q, categoria]);

  // Escolher uma peça, na arara ou na lista, abre a página dela. Os filtros vão junto, para o Voltar devolver a mesma lista.
  const navegar = useNavigate();
  const de = params.toString() ? `?${params}` : "";
  const escolher = (peca) => navegar(`/catalogo/${peca.id}`, { state: { de } });

  return (
    <section aria-labelledby="catalogo-titulo">
      <h1 id="catalogo-titulo" className="titulo">Catálogo</h1>
      <p className="mt-0 text-ceub-cinza">Peças únicas, cada uma com o número de voltas que já deu.</p>
      <Arara pecas={pecas} aoEscolher={escolher} />
      <form className="painel grid sm:grid-cols-[1fr_16rem] gap-4 mb-6" role="search" aria-label="Buscar peças" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="busca">Buscar por peça ou marca</label>
          <input id="busca" name="q" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={60} autoComplete="off" spellCheck={false} placeholder="Ex.: jaqueta, Levi’s…" />
        </div>
        <div className="campo">
          <label htmlFor="filtro-categoria">Categoria</label>
          <select id="filtro-categoria" name="categoria" className="browser-default" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </form>
      {erro && <p className="erro-geral" role="alert">{erro}</p>}
      <p role="status" aria-live="polite" className="text-sm text-ceub-cinza">{pecas === null ? "Carregando…" : `${pecas.length} ${pecas.length === 1 ? "peça encontrada" : "peças encontradas"}`}</p>
      {pecas === null && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto"><i className="f" /><i className="l" /><i className="l c" /></div>)}
        </div>
      )}
      {pecas !== null && pecas.length === 0 && !erro && (
        <div className="vazio">
          <strong>{q || categoria ? "Nenhuma peça com esse filtro" : "O catálogo ainda está vazio"}</strong>
          {q || categoria ? "Tente outro nome, outra marca ou todas as categorias." : "Assim que um fornecedor cadastrar uma peça, ela aparece aqui."}
          {(q || categoria) && <div><button type="button" className="btn tonal" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button></div>}
        </div>
      )}
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 list-none p-0 m-0">
        {(pecas || []).map((p, i) => (
          <li key={p.id} className="card peca entra m-0" style={{ "--espera": `${ESPERAS[Math.min(i, ESPERAS.length - 1)]}ms` }}>
            <div className="card-image foto">
              {p.foto && !semImagem[p.id]
                ? <img src={`/fotos/${p.foto}`} alt="" loading={i < 4 ? "eager" : "lazy"} decoding="async" width="480" height="600" onError={() => setSemImagem((m) => ({ ...m, [p.id]: true }))} />
                : <span aria-hidden="true" className="sem-foto">sem foto</span>}
              <span className="voltas">{p.voltas}ª volta</span>
            </div>
            <div className="card-content">
              <h2 className="nome"><Link className="abre-peca" to={`/catalogo/${p.id}`} state={{ de }}>{p.titulo}</Link></h2>
              <p className="m-0 text-sm text-ceub-cinza">{[p.marca, p.tamanho, p.conservacao].filter(Boolean).join(" · ")}</p>
              <p className="m-0 mt-2 flex items-center justify-between gap-2">
                <strong className="preco">{brl(p.preco)}</strong>
                <span className={`situacao ${p.situacao === "Disponível" ? "ok" : ""}`}>{p.situacao}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
