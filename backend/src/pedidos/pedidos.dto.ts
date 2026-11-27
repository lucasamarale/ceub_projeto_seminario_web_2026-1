import { ApiProperty } from "@nestjs/swagger";
import { PAGOS } from "../reservas/reservas.constantes.js";

export const SITUACOES_DO_PEDIDO = ["Aguardando pagamento", ...PAGOS, "Cancelado", "Expirado"];

export class PedidoItemDto {
  @ApiProperty({ type: Number, nullable: true }) pecaId!: number | null;
  @ApiProperty({ type: String }) titulo!: string;
  @ApiProperty({ type: String }) categoria!: string;
  @ApiProperty({ type: Number }) preco!: number;
  @ApiProperty({ type: String }) foto!: string;
}
export class PedidoEventoDto {
  @ApiProperty({ type: String, example: "Pagamento confirmado" }) etapa!: string;
  @ApiProperty({ type: Number, description: "Quando aconteceu, em milissegundos." }) quando!: number;
}
export class PedidoDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: Number }) usuarioId!: number;
  @ApiProperty({ type: String }) cliente!: string;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: String, enum: SITUACOES_DO_PEDIDO }) situacao!: string;
  @ApiProperty({ type: String, description: "Código do Pix simulado." }) pix!: string;
  @ApiProperty({ type: String, description: "Código de rastreio simulado, depois do pagamento." }) rastreio!: string;
  @ApiProperty({ type: Number }) pontos!: number;
  @ApiProperty({ type: Number, description: "Litros de água poupados." }) agua!: number;
  @ApiProperty({ type: Number, description: "Quilos de CO2 evitados." }) co2!: number;
  @ApiProperty({ type: Number }) expiraEm!: number;
  @ApiProperty({ type: Number }) criadoEm!: number;
  @ApiProperty({ type: [PedidoItemDto] }) itens!: PedidoItemDto[];
  @ApiProperty({ type: [PedidoEventoDto] }) eventos!: PedidoEventoDto[];
}
