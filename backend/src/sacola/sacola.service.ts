import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { conflito, naoEncontrado } from "../comum/erros.js";
import { CONFIG, type Config } from "../config.js";
import { FORA_DO_CATALOGO } from "../pecas/pecas.constantes.js";
import { centavos, PRAZO_MS } from "../reservas/reservas.constantes.js";
import type { SacolaEntradaDto } from "./sacola.dto.js";

// Sacola: colocar uma peça nela reserva a peça por 30 minutos para aquela pessoa.
@Injectable()
export class SacolaService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(CONFIG) private readonly config: Config) {}

  async ver(usuarioId: number) {
    const linhas = await this.prisma.sacolaItem.findMany({ where: { usuarioId }, include: { peca: true }, orderBy: [{ reservadaAte: "asc" }, { pecaId: "asc" }] });
    const itens = linhas.map(({ peca: p, reservadaAte }) => ({ id: p.id, titulo: p.titulo, marca: p.marca, tamanho: p.tamanho, categoria: p.categoria, preco: p.preco, foto: p.foto, reservadaAte: reservadaAte.getTime() }));
    return { itens, total: centavos(itens.reduce((t, i) => t + i.preco, 0)) };
  }

  async colocar({ pecaId }: SacolaEntradaDto, quem: UsuarioDaSessao) {
    await this.prisma.$transaction(async (tx) => {
      const p = await tx.peca.findUnique({ where: { id: pecaId } });
      if (!p || FORA_DO_CATALOGO.includes(p.situacao)) throw naoEncontrado("Peça");
      if (await tx.sacolaItem.findFirst({ where: { pecaId, usuarioId: quem.id } })) return;
      if (p.donoId === quem.id) throw conflito("Esta peça é sua. Ela não pode ir para a sua sacola.");
      // A troca de situação só acontece se a peça ainda estiver disponível neste instante.
      // Se duas pessoas tentarem juntas, o banco deixa uma só passar.
      const { count } = await tx.peca.updateMany({ where: { id: pecaId, situacao: "Disponível" }, data: { situacao: "Reservada" } });
      if (!count) throw conflito(p.situacao === "Vendida" ? "Esta peça já foi vendida." : "Esta peça acabou de ser reservada por outra pessoa.");
      await tx.sacolaItem.create({ data: { pecaId, usuarioId: quem.id, reservadaAte: new Date(this.config.agora() + PRAZO_MS) } });
    });
    return this.ver(quem.id);
  }

  async tirar(pecaId: number, quem: UsuarioDaSessao) {
    // O filtro por usuário impede que alguém mexa na sacola de outra pessoa trocando o número na rota.
    if (!(await this.prisma.sacolaItem.findFirst({ where: { pecaId, usuarioId: quem.id } }))) throw naoEncontrado("Item da sacola");
    await this.prisma.$transaction([
      this.prisma.sacolaItem.delete({ where: { pecaId } }),
      this.prisma.peca.updateMany({ where: { id: pecaId, situacao: "Reservada" }, data: { situacao: "Disponível" } }),
    ]);
    return this.ver(quem.id);
  }
}
