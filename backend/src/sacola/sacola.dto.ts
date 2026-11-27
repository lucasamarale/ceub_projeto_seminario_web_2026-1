import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDefined, IsInt, Min } from "class-validator";
import { de, numero, obrigatorio } from "../comum/validacao.js";

export class SacolaEntradaDto {
  @ApiProperty({ type: Number, example: 4, description: "Identificador da peça." })
  @IsDefined(obrigatorio) @Type(() => Number) @IsInt(numero) @Min(1, de)
  pecaId!: number;
}

export class SacolaItemDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: String }) titulo!: string;
  @ApiProperty({ type: String }) marca!: string;
  @ApiProperty({ type: String }) tamanho!: string;
  @ApiProperty({ type: String }) categoria!: string;
  @ApiProperty({ type: Number }) preco!: number;
  @ApiProperty({ type: String }) foto!: string;
  @ApiProperty({ type: Number, description: "Até quando a peça fica reservada, em milissegundos." }) reservadaAte!: number;
}

export class SacolaDto {
  @ApiProperty({ type: [SacolaItemDto] }) itens!: SacolaItemDto[];
  @ApiProperty({ type: Number, example: 129.9 }) total!: number;
}
