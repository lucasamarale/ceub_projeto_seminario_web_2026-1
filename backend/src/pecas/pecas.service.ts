import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { naoEncontrado } from "../comum/erros.js";
import { FORA_DO_CATALOGO } from "./pecas.constantes.js";
import type { FiltroDePecasDto, PecaEntradaDto } from "./pecas.dto.js";

@Injectable()
export class PecasService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private gerencia = (quem: UsuarioDaSessao) => quem.funcionalidades.includes("pecas.gerenciar");

  // Busca pelo cliente do Prisma: o texto digitado vira parâmetro da consulta, nunca um pedaço do SQL.
  async listar(f: FiltroDePecasDto, quem: UsuarioDaSessao) {
    return this.prisma.peca.findMany({
      where: {
        ...(f.q ? { OR: [{ titulo: { contains: f.q } }, { marca: { contains: f.q } }] } : {}),
        ...(f.categoria ? { categoria: f.categoria } : {}),
        AND: [f.situacao ? { situacao: f.situacao } : {}, this.gerencia(quem) ? {} : { situacao: { notIn: FORA_DO_CATALOGO } }],
      },
      orderBy: { id: "desc" },
    });
  }

  private async achar(id: number) {
    const p = await this.prisma.peca.findUnique({ where: { id } });
    if (!p) throw naoEncontrado("Peça");
    return p;
  }

  async buscar(id: number, quem: UsuarioDaSessao) {
    const p = await this.achar(id);
    if (FORA_DO_CATALOGO.includes(p.situacao) && !this.gerencia(quem)) throw naoEncontrado("Peça");
    return p;
  }

  async criar(d: PecaEntradaDto) {
    return this.prisma.peca.create({ data: { marca: "", tamanho: "", voltas: 1, foto: "", situacao: "Disponível", ...d } });
  }

  async editar(id: number, d: PecaEntradaDto) {
    const atual = await this.achar(id);
    return this.prisma.peca.update({ where: { id: atual.id }, data: { marca: "", tamanho: "", ...d } });
  }

  async remover(id: number) {
    const atual = await this.achar(id);
    await this.prisma.peca.delete({ where: { id: atual.id } });
  }
}
