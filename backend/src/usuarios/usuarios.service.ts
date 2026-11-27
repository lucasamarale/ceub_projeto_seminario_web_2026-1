import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, invalido, naoEncontrado } from "../comum/erros.js";
import { CONFIG, type Config } from "../config.js";
import type { UsuarioCriarDto, UsuarioEditarDto } from "./usuarios.dto.js";

@Injectable()
export class UsuariosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(CONFIG) private readonly config: Config) {}

  // A senha nunca sai da API: o select lista os campos devolvidos e o hash não está entre eles.
  private readonly campos = { id: true, nome: true, email: true, perfilId: true, ativo: true, criadoEm: true, perfil: { select: { nome: true } } } as const;
  private formatar = (u: { perfil: { nome: string } } & Record<string, any>) => ({ id: u.id, nome: u.nome, email: u.email, perfilId: u.perfilId, perfil: u.perfil.nome, ativo: u.ativo, criadoEm: u.criadoEm });
  private hash = (senha: string) => bcrypt.hashSync(senha, this.config.custoDoHash);

  async listar() {
    return (await this.prisma.usuario.findMany({ select: this.campos, orderBy: { nome: "asc" } })).map(this.formatar);
  }

  async buscar(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id }, select: this.campos });
    if (!u) throw naoEncontrado("Usuário");
    return this.formatar(u);
  }

  private async conferirPerfil(id: number) {
    if (!(await this.prisma.perfil.findUnique({ where: { id } }))) throw invalido({ perfilId: "Perfil inexistente." });
  }

  async criar(d: UsuarioCriarDto) {
    if (await this.prisma.usuario.findUnique({ where: { email: d.email } })) throw conflito("Já existe um usuário com esse e-mail.");
    await this.conferirPerfil(d.perfilId);
    const novo = await this.prisma.usuario.create({ data: { nome: d.nome, email: d.email, senhaHash: this.hash(d.senha), perfilId: d.perfilId, ativo: d.ativo !== false } });
    return this.buscar(novo.id);
  }

  async editar(id: number, d: UsuarioEditarDto, quem: UsuarioDaSessao) {
    const atual = await this.buscar(id);
    const outro = await this.prisma.usuario.findUnique({ where: { email: d.email } });
    if (outro && outro.id !== atual.id) throw conflito("Já existe um usuário com esse e-mail.");
    await this.conferirPerfil(d.perfilId);
    const ativo = d.ativo === undefined ? atual.ativo : d.ativo;
    if (atual.id === quem.id && (!ativo || d.perfilId !== atual.perfilId)) {
      throw conflito("Você não pode desativar a própria conta nem trocar o próprio perfil.");
    }
    await this.prisma.usuario.update({ where: { id: atual.id }, data: { nome: d.nome, email: d.email, perfilId: d.perfilId, ativo, ...(d.senha ? { senhaHash: this.hash(d.senha) } : {}) } });
    // Conta desativada ou com senha nova perde as sessões abertas.
    if (!ativo || d.senha) await this.prisma.sessao.deleteMany({ where: { usuarioId: atual.id } });
    return this.buscar(atual.id);
  }

  async remover(id: number, quem: UsuarioDaSessao) {
    const atual = await this.buscar(id);
    if (atual.id === quem.id) throw conflito("Você não pode remover a própria conta.");
    await this.prisma.usuario.delete({ where: { id: atual.id } });
  }
}
