import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, naoEncontrado } from "../comum/erros.js";
import type { FuncionalidadeEntradaDto } from "./funcionalidades.dto.js";

@Injectable()
export class FuncionalidadesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private readonly incluir = { _count: { select: { perfis: true } } };
  private formatar = (f: any) => ({ id: f.id, chave: f.chave, nome: f.nome, descricao: f.descricao, perfis: f._count.perfis });

  async listar() {
    return (await this.prisma.funcionalidade.findMany({ include: this.incluir, orderBy: { chave: "asc" } })).map(this.formatar);
  }

  async buscar(id: number) {
    const f = await this.prisma.funcionalidade.findUnique({ where: { id }, include: this.incluir });
    if (!f) throw naoEncontrado("Funcionalidade");
    return this.formatar(f);
  }

  async criar(d: FuncionalidadeEntradaDto) {
    if (await this.prisma.funcionalidade.findUnique({ where: { chave: d.chave } })) throw conflito("Já existe uma funcionalidade com essa chave.");
    const nova = await this.prisma.funcionalidade.create({ data: { chave: d.chave, nome: d.nome, descricao: d.descricao || "" } });
    return this.buscar(nova.id);
  }

  async editar(id: number, d: FuncionalidadeEntradaDto) {
    const atual = await this.buscar(id);
    const outra = await this.prisma.funcionalidade.findUnique({ where: { chave: d.chave } });
    if (outra && outra.id !== atual.id) throw conflito("Já existe uma funcionalidade com essa chave.");
    await this.prisma.funcionalidade.update({ where: { id: atual.id }, data: { chave: d.chave, nome: d.nome, descricao: d.descricao || "" } });
    return this.buscar(atual.id);
  }

  async remover(id: number) {
    const atual = await this.buscar(id);
    if (atual.perfis > 0) throw conflito("Esta funcionalidade está em uso por um ou mais perfis. Remova dos perfis antes.");
    await this.prisma.funcionalidade.delete({ where: { id: atual.id } });
  }
}
