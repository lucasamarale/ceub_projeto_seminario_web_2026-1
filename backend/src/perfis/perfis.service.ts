import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, invalido, naoEncontrado } from "../comum/erros.js";
import type { PerfilEntradaDto } from "./perfis.dto.js";

@Injectable()
export class PerfisService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private readonly incluir = { _count: { select: { usuarios: true } }, funcionalidades: { select: { funcionalidadeId: true }, orderBy: { funcionalidadeId: "asc" as const } } };
  private formatar = (p: any) => ({ id: p.id, nome: p.nome, descricao: p.descricao, usuarios: p._count.usuarios, funcionalidades: p.funcionalidades.map((f: any) => f.funcionalidadeId) });

  async listar() {
    return (await this.prisma.perfil.findMany({ include: this.incluir, orderBy: { nome: "asc" } })).map(this.formatar);
  }

  async buscar(id: number) {
    const p = await this.prisma.perfil.findUnique({ where: { id }, include: this.incluir });
    if (!p) throw naoEncontrado("Perfil");
    return this.formatar(p);
  }

  private async conferirFuncionalidades(ids: number[]) {
    const existentes = new Set((await this.prisma.funcionalidade.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((f) => f.id));
    const faltando = ids.filter((id) => !existentes.has(id));
    if (faltando.length) throw invalido({ funcionalidades: `Funcionalidade inexistente: ${faltando.join(", ")}.` });
  }

  async criar(d: PerfilEntradaDto) {
    if (await this.prisma.perfil.findUnique({ where: { nome: d.nome } })) throw conflito("Já existe um perfil com esse nome.");
    await this.conferirFuncionalidades(d.funcionalidades);
    const novo = await this.prisma.perfil.create({ data: { nome: d.nome, descricao: d.descricao || "", funcionalidades: { create: d.funcionalidades.map((funcionalidadeId: number) => ({ funcionalidadeId })) } } });
    return this.buscar(novo.id);
  }

  async editar(id: number, d: PerfilEntradaDto, quem: UsuarioDaSessao) {
    const atual = await this.buscar(id);
    const outro = await this.prisma.perfil.findUnique({ where: { nome: d.nome } });
    if (outro && outro.id !== atual.id) throw conflito("Já existe um perfil com esse nome.");
    await this.conferirFuncionalidades(d.funcionalidades);
    // Impede que a pessoa tire de si mesma o acesso à gestão de perfis e fique trancada para fora.
    const gerenciar = await this.prisma.funcionalidade.findUnique({ where: { chave: "perfis.gerenciar" } });
    if (atual.id === quem.perfilId && !(gerenciar && d.funcionalidades.includes(gerenciar.id))) {
      throw conflito("Você não pode remover a gestão de perfis do seu próprio perfil.");
    }
    // Nome e lista de funcionalidades mudam juntos ou não mudam: uma transação só.
    await this.prisma.$transaction([
      this.prisma.perfilFuncionalidade.deleteMany({ where: { perfilId: atual.id } }),
      this.prisma.perfil.update({ where: { id: atual.id }, data: { nome: d.nome, descricao: d.descricao || "", funcionalidades: { create: d.funcionalidades.map((funcionalidadeId: number) => ({ funcionalidadeId })) } } }),
    ]);
    return this.buscar(atual.id);
  }

  async remover(id: number) {
    const atual = await this.buscar(id);
    if (atual.usuarios > 0) throw conflito("Há usuários com este perfil. Troque o perfil deles antes de remover.");
    await this.prisma.perfil.delete({ where: { id: atual.id } });
  }
}
