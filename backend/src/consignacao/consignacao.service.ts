import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, ErroHttp, naoEncontrado, semAcesso } from "../comum/erros.js";
import { PAGOS, PARTE_DO_DONO } from "../reservas/reservas.constantes.js";
import type { ConsignacaoEntradaDto, RecusaDto } from "./consignacao.dto.js";

// Consignação: a pessoa envia a peça, o brechó aprova ou recusa, e a venda gera um repasse.
@Injectable()
export class ConsignacaoService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // O repasse só existe depois que um pedido com a peça foi pago.
  private readonly incluir = { dono: { select: { nome: true } }, itens: { where: { pedido: { situacao: { in: PAGOS } } }, select: { repasse: true }, take: 1 } };
  private formatar = (p: any) => ({
    id: p.id, titulo: p.titulo, marca: p.marca, tamanho: p.tamanho, categoria: p.categoria, conservacao: p.conservacao, preco: p.preco, foto: p.foto,
    situacao: p.situacao, motivo: p.motivo, donoId: p.donoId, dono: p.dono.nome, repasse: p.itens[0]?.repasse ?? null,
  });
  private aprova = (quem: UsuarioDaSessao) => quem.funcionalidades.includes("consignacao.aprovar");

  async listar(fila: boolean, quem: UsuarioDaSessao) {
    if (fila ? !this.aprova(quem) : !quem.funcionalidades.includes("consignacao.publicar")) throw semAcesso();
    const lista = fila
      ? await this.prisma.peca.findMany({ where: { situacao: "Em análise", donoId: { not: null } }, include: this.incluir, orderBy: { id: "asc" } })
      : await this.prisma.peca.findMany({ where: { donoId: quem.id }, include: this.incluir, orderBy: { id: "desc" } });
    return lista.map(this.formatar);
  }

  // Peça de outra pessoa responde como inexistente para quem não aprova consignações.
  private async buscar(id: number, quem: UsuarioDaSessao) {
    const p = await this.prisma.peca.findFirst({ where: { id, donoId: { not: null } }, include: this.incluir });
    if (!p || (p.donoId !== quem.id && !this.aprova(quem))) throw naoEncontrado("Peça em consignação");
    return this.formatar(p);
  }

  async publicar(d: ConsignacaoEntradaDto, quem: UsuarioDaSessao) {
    // Situação e dono são definidos aqui, nunca pelo formulário: a peça sempre entra em análise, no nome de quem enviou.
    const nova = await this.prisma.peca.create({ data: { marca: "", tamanho: "", ...d, situacao: "Em análise", donoId: quem.id } });
    return { ...(await this.buscar(nova.id, quem)), parteDoDono: PARTE_DO_DONO };
  }

  private async emAnalise(id: number, quem: UsuarioDaSessao) {
    const p = await this.buscar(id, quem);
    if (p.situacao !== "Em análise") throw conflito("Esta peça já foi analisada.");
    return p;
  }

  async aprovar(id: number, quem: UsuarioDaSessao) {
    const p = await this.emAnalise(id, quem);
    await this.prisma.peca.update({ where: { id: p.id }, data: { situacao: "Disponível", motivo: "" } });
    return this.buscar(p.id, quem);
  }

  async recusar(id: number, { motivo }: RecusaDto, quem: UsuarioDaSessao) {
    const p = await this.emAnalise(id, quem);
    await this.prisma.peca.update({ where: { id: p.id }, data: { situacao: "Recusada", motivo } });
    return this.buscar(p.id, quem);
  }

  // Quem enviou pode desistir enquanto a peça não entrou no catálogo.
  async retirar(id: number, quem: UsuarioDaSessao) {
    const p = await this.buscar(id, quem);
    if (p.donoId !== quem.id) throw new ErroHttp(403, "Só quem enviou a peça pode retirá-la.");
    if (!["Em análise", "Recusada"].includes(p.situacao)) throw conflito("Esta peça já está no catálogo. Fale com o brechó para retirá-la.");
    await this.prisma.peca.delete({ where: { id: p.id } });
  }
}
