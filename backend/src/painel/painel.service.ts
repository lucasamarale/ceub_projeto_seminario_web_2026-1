import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { PrismaService } from "../banco/prisma.service.js";
import { centavos, PAGOS } from "../reservas/reservas.constantes.js";

// Duas leituras de números: o impacto de quem compra e o painel de quem cuida do brechó.
@Injectable()
export class PainelService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async impacto(quem: UsuarioDaSessao) {
    const meus = { usuarioId: quem.id, situacao: { in: PAGOS } };
    const [t, pecas] = await Promise.all([
      this.prisma.pedido.aggregate({ where: meus, _count: true, _sum: { pontos: true, agua: true, co2: true } }),
      this.prisma.pedidoItem.count({ where: { pedido: meus } }),
    ]);
    return { pedidos: t._count, pecas, pontos: t._sum.pontos || 0, agua: t._sum.agua || 0, co2: Math.round((t._sum.co2 || 0) * 10) / 10 };
  }

  async bastidores() {
    const pagos = { situacao: { in: PAGOS } };
    const contar = (linhas: { situacao: string; _count: number }[]) => Object.fromEntries(linhas.map((l) => [l.situacao, l._count]));
    const [pecas, pedidos, v, porDono] = await Promise.all([
      this.prisma.peca.groupBy({ by: ["situacao"], _count: true }),
      this.prisma.pedido.groupBy({ by: ["situacao"], _count: true }),
      this.prisma.pedido.aggregate({ where: pagos, _sum: { total: true, agua: true, co2: true, pontos: true } }),
      this.prisma.pedidoItem.groupBy({ by: ["donoId"], where: { pedido: pagos, repasse: { gt: 0 }, donoId: { not: null } }, _count: true, _sum: { repasse: true } }),
    ]);
    const nomes = Object.fromEntries((await this.prisma.usuario.findMany({ where: { id: { in: porDono.map((l) => l.donoId!) } }, select: { id: true, nome: true } })).map((u) => [u.id, u.nome]));
    const repasses = porDono.map((l) => ({ dono: nomes[l.donoId!], pecas: l._count, valor: centavos(l._sum.repasse) })).sort((a, b) => b.valor - a.valor);
    const faturamento = centavos(v._sum.total);
    const repasseDevido = centavos(repasses.reduce((t, l) => t + l.valor, 0));
    return {
      pecas: contar(pecas), pedidos: contar(pedidos), faturamento, repasseDevido, ficaNoBrecho: centavos(faturamento - repasseDevido), repasses,
      agua: v._sum.agua || 0, co2: Math.round((v._sum.co2 || 0) * 10) / 10, pontos: v._sum.pontos || 0,
    };
  }
}
