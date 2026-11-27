import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { carregar3D, esquecer3D, tem3D, naArara, MODELOS, LIMITE } from "./arara.js";
import { Arara } from "./componentes/Arara.jsx";

const peca = (id, foto, extra = {}) => ({ id, titulo: `Peça ${id}`, preco: 10 * id, foto, ...extra });
const PECAS = [peca(1, "camiseta-verde.webp"), peca(2, "calca-jeans.webp"), peca(3, "moletom-clube.webp"), peca(4, "")];

function scriptDaArara() { return document.head.querySelector('script[src="/arara3d/ciranda3d.js"]'); }

beforeEach(() => { esquecer3D(); delete window.Ciranda3D; document.head.innerHTML = ""; });
afterEach(() => { delete window.Ciranda3D; vi.restoreAllMocks(); });

describe("modelos da arara", () => {
  it("só leva para a arara as peças que têm modelo 3D, até o limite", () => {
    expect(naArara(PECAS).map((p) => p.id)).toEqual([1, 3]);
    expect(naArara(null)).toEqual([]);
    const muitas = Array.from({ length: 30 }, (_, i) => peca(i + 1, "camiseta-preta.webp"));
    expect(naArara(muitas)).toHaveLength(LIMITE);
  });

  it("todo modelo tem tipo e cor", () => {
    for (const m of Object.values(MODELOS)) {
      expect(["tee", "shirt", "crewneck"]).toContain(m.kind);
      expect(m.colour).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe("carregamento do pacote 3D", () => {
  it("diz se há 3D sem quebrar quando o pacote falha", () => {
    expect(tem3D({})).toBe(false);
    expect(tem3D({ Ciranda3D: { disponivel: () => true } })).toBe(true);
    expect(tem3D({ Ciranda3D: { disponivel: () => { throw new Error("sem WebGL"); } } })).toBe(false);
  });

  it("baixa o script uma vez só e resolve quando ele carrega", async () => {
    const a = carregar3D();
    const b = carregar3D();
    expect(a).toBe(b);
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
    expect(document.head.querySelector('link[href="/arara3d/tw.css"]')).not.toBeNull();
    window.Ciranda3D = { disponivel: () => true };
    scriptDaArara().onload();
    await expect(a).resolves.toBe(true);
  });

  it("resolve com falso se o script não carregar, e permite tentar de novo", async () => {
    const a = carregar3D();
    scriptDaArara().onerror();
    await expect(a).resolves.toBe(false);
    expect(carregar3D()).not.toBe(a);
  });

  it("não baixa nada se o pacote já está na página", async () => {
    window.Ciranda3D = { disponivel: () => false };
    await expect(carregar3D()).resolves.toBe(false);
    expect(scriptDaArara()).toBeNull();
  });
});

describe("componente Arara", () => {
  it("monta a arara com as peças certas e avisa qual foi escolhida", async () => {
    const desmontar = vi.fn();
    const arara = vi.fn(() => desmontar);
    window.Ciranda3D = { disponivel: () => true, arara };
    const aoEscolher = vi.fn();
    const { unmount } = render(<Arara pecas={PECAS} aoEscolher={aoEscolher} />);
    expect(screen.getByRole("region", { name: "Arara 3D" })).toHaveTextContent("2 peças giram aqui");
    await waitFor(() => expect(arara).toHaveBeenCalledTimes(1));
    const [el, itens, escolher, opcoes] = arara.mock.calls[0];
    expect(el).toHaveClass("arara-palco");
    expect(itens).toEqual([
      { name: expect.stringContaining("Peça 1"), kind: "tee", colour: "#7C8A6A" },
      expect.objectContaining({ kind: "crewneck", print: expect.objectContaining({ kind: "serif" }) }),
    ]);
    expect(opcoes).toMatchObject({ size: 0.56, showCaption: true });
    await waitFor(() => expect(el).toHaveAttribute("data-estado", "pronta"));
    act(() => escolher(1));
    expect(aoEscolher).toHaveBeenCalledWith(PECAS[2]);
    unmount();
    expect(desmontar).toHaveBeenCalled();
  });

  it("usa medidas menores e sem brisa em tela estreita de toque", async () => {
    const arara = vi.fn(() => () => {});
    window.Ciranda3D = { disponivel: () => true, arara };
    const largura = window.innerWidth;
    window.innerWidth = 390;
    const antes = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    render(<Arara pecas={[PECAS[0]]} aoEscolher={() => {}} />);
    expect(screen.getByRole("region")).toHaveTextContent("1 peça gira aqui");
    await waitFor(() => expect(arara).toHaveBeenCalled());
    expect(arara.mock.calls[0][3]).toMatchObject({ size: 0.42, gap: 4, showCaption: false, breeze: 0 });
    window.innerWidth = largura;
    window.matchMedia = antes;
  });

  it("some sem deixar buraco quando não há WebGL", async () => {
    window.Ciranda3D = { disponivel: () => false };
    render(<Arara pecas={PECAS} aoEscolher={() => {}} />);
    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
  });

  it("some se o pacote quebrar ao montar", async () => {
    window.Ciranda3D = { disponivel: () => true, arara: () => { throw new Error("contexto perdido"); } };
    render(<Arara pecas={PECAS} aoEscolher={() => {}} />);
    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
  });

  it("não aparece sem peça de cima, e não monta depois de sair da tela", async () => {
    const arara = vi.fn();
    const { container } = render(<Arara pecas={[PECAS[1]]} aoEscolher={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    const { unmount } = render(<Arara pecas={PECAS} aoEscolher={() => {}} />);
    unmount();
    window.Ciranda3D = { disponivel: () => true, arara };
    scriptDaArara().onload();
    await Promise.resolve();
    expect(arara).not.toHaveBeenCalled();
  });
});
