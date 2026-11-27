import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, ErroHttp } from "../comum/erros.js";
import { CONFIG, type Config } from "../config.js";
import type { CadastroDto, LoginDto } from "./auth.dto.js";

export interface UsuarioDaSessao {
  id: number;
  nome: string;
  email: string;
  perfilId: number;
  perfil: string;
  funcionalidades: string[];
}

const DIA_MS = 24 * 60 * 60 * 1000;
const sha256 = (texto: string) => crypto.createHash("sha256").update(texto).digest("hex");

@Injectable()
export class AuthService {
  // Hash de comparação usado quando o e-mail não existe, para o tempo de resposta
  // não revelar quais e-mails estão cadastrados.
  private readonly hashFalso: string;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(CONFIG) private readonly config: Config) {
    this.hashFalso = bcrypt.hashSync("senha-inexistente", config.custoDoHash);
  }

  // Monta o usuário da sessão sempre a partir do banco, nunca só do token.
  async carregar(id: number): Promise<UsuarioDaSessao | null> {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      include: { perfil: { include: { funcionalidades: { include: { funcionalidade: true }, orderBy: { funcionalidadeId: "asc" } } } } },
    });
    if (!u || !u.ativo) return null;
    return { id: u.id, nome: u.nome, email: u.email, perfilId: u.perfilId, perfil: u.perfil.nome, funcionalidades: u.perfil.funcionalidades.map((f) => f.funcionalidade.chave) };
  }

  /** JWT de acesso: curto, assinado com HS256, só com o identificador do usuário. */
  emitirToken(usuarioId: number): string {
    return jwt.sign({ sub: String(usuarioId) }, this.config.jwtSegredo, { expiresIn: this.config.tokenExpiraEm as any, algorithm: "HS256" });
  }

  async entrar({ email, senha }: LoginDto) {
    const u = await this.prisma.usuario.findUnique({ where: { email } });
    const confere = bcrypt.compareSync(senha, u ? u.senhaHash : this.hashFalso);
    // A mesma mensagem para e-mail errado, senha errada e conta desativada: não dá para descobrir quem tem conta.
    if (!u || !confere || !u.ativo) throw new ErroHttp(401, "E-mail ou senha incorretos.");
    return this.abrirSessao(u.id);
  }

  // Cadastro aberto: quem se cadastra entra sempre como Cliente. Perfil nunca vem do formulário.
  async cadastrar(d: CadastroDto) {
    const perfil = await this.prisma.perfil.findUnique({ where: { nome: "Cliente" } });
    if (!perfil) throw new ErroHttp(503, "O cadastro está fechado no momento.");
    if (await this.prisma.usuario.findUnique({ where: { email: d.email } })) throw conflito("Já existe uma conta com esse e-mail. Entre com ela.");
    const novo = await this.prisma.usuario.create({ data: { nome: d.nome, email: d.email, senhaHash: bcrypt.hashSync(d.senha, this.config.custoDoHash), perfilId: perfil.id } });
    return this.abrirSessao(novo.id);
  }

  // Sessão longa: um token aleatório que só o navegador guarda, em cookie HttpOnly. No banco fica o SHA-256 dele,
  // então um vazamento do banco não entrega sessões prontas para uso.
  private async abrirSessao(usuarioId: number) {
    const renovacao = crypto.randomBytes(32).toString("base64url");
    const expiraEm = new Date(this.config.agora() + this.config.sessaoDias * DIA_MS);
    await this.prisma.sessao.create({ data: { usuarioId, tokenHash: sha256(renovacao), expiraEm } });
    return { token: this.emitirToken(usuarioId), usuario: (await this.carregar(usuarioId))!, renovacao, expiraEm };
  }

  // Troca o cookie de sessão por um JWT novo. O token de renovação é de uso único: a cada troca ele é
  // apagado e nasce outro (rotação), então um token copiado deixa de valer assim que o dono usa o dele.
  async renovar(renovacao: unknown) {
    const recusa = new ErroHttp(401, "Sessão encerrada. Entre de novo.");
    if (typeof renovacao !== "string" || !renovacao) throw recusa;
    const sessao = await this.prisma.sessao.findUnique({ where: { tokenHash: sha256(renovacao) } });
    if (!sessao) throw recusa;
    await this.prisma.sessao.delete({ where: { id: sessao.id } });
    if (sessao.expiraEm.getTime() <= this.config.agora() || !(await this.carregar(sessao.usuarioId))) throw recusa;
    return this.abrirSessao(sessao.usuarioId);
  }

  async sair(renovacao: unknown) {
    if (typeof renovacao === "string" && renovacao) await this.prisma.sessao.deleteMany({ where: { tokenHash: sha256(renovacao) } });
  }
}
