import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../banco/cliente/client.js";
import { PrismaService } from "../banco/prisma.service.js";
import { CONFIG, type Config } from "../config.js";

type Tx = Prisma.TransactionClient;

@Injectable()
export class ReservasService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(CONFIG) private readonly config: Config) {}

  /** Devolve as peças de um pedido ao catálogo, muda a situação dele e registra o motivo na linha do tempo. */
  async soltarPedido(tx: Tx, pedidoId: number, situacao: string, etapa: string) {
    const itens = await tx.pedidoItem.findMany({ where: { pedidoId, pecaId: { not: null } }, select: { pecaId: true } });
    await tx.peca.updateMany({ where: { id: { in: itens.map((i) => i.pecaId!) }, situacao: "Reservada" }, data: { situacao: "Disponível" } });
    await tx.pedido.update({ where: { id: pedidoId }, data: { situacao } });
    await tx.pedidoEvento.create({ data: { pedidoId, etapa, quando: new Date(this.config.agora()) } });
  }

  // Devolve ao catálogo o que venceu: itens parados na sacola e pedidos que não foram pagos.
  // Roda antes das rotas da loja, então ninguém vê uma reserva vencida.
  async liberarVencidas() {
    const agora = new Date(this.config.agora());
    const [naSacola, pedidos] = await Promise.all([
      this.prisma.sacolaItem.findMany({ where: { reservadaAte: { lte: agora } }, select: { pecaId: true } }),
      this.prisma.pedido.findMany({ where: { situacao: "Aguardando pagamento", expiraEm: { lte: agora } }, select: { id: true } }),
    ]);
    if (!naSacola.length && !pedidos.length) return;
    await this.prisma.$transaction(async (tx) => {
      const ids = naSacola.map((s) => s.pecaId);
      await tx.peca.updateMany({ where: { id: { in: ids }, situacao: "Reservada" }, data: { situacao: "Disponível" } });
      await tx.sacolaItem.deleteMany({ where: { pecaId: { in: ids } } });
      for (const { id } of pedidos) await this.soltarPedido(tx, id, "Expirado", "Reserva vencida sem pagamento");
    });
  }
}
