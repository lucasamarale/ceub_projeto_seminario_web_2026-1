import { ApiProperty } from "@nestjs/swagger";

export class ImpactoDto {
  @ApiProperty({ type: Number, description: "Pedidos pagos." }) pedidos!: number;
  @ApiProperty({ type: Number }) pecas!: number;
  @ApiProperty({ type: Number }) pontos!: number;
  @ApiProperty({ type: Number, description: "Litros de água poupados." }) agua!: number;
  @ApiProperty({ type: Number, description: "Quilos de CO2 evitados." }) co2!: number;
}
export class RepasseDto {
  @ApiProperty({ type: String }) dono!: string;
  @ApiProperty({ type: Number }) pecas!: number;
  @ApiProperty({ type: Number }) valor!: number;
}
export class BastidoresDto {
  @ApiProperty({ type: Object, example: { "Disponível": 11, "Vendida": 2 } }) pecas!: Record<string, number>;
  @ApiProperty({ type: Object, example: { Pago: 1 } }) pedidos!: Record<string, number>;
  @ApiProperty({ type: Number }) faturamento!: number;
  @ApiProperty({ type: Number }) repasseDevido!: number;
  @ApiProperty({ type: Number }) ficaNoBrecho!: number;
  @ApiProperty({ type: [RepasseDto] }) repasses!: RepasseDto[];
  @ApiProperty({ type: Number }) agua!: number;
  @ApiProperty({ type: Number }) co2!: number;
  @ApiProperty({ type: Number }) pontos!: number;
}
