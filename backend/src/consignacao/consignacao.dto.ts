import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsDefined, IsString, MaxLength, MinLength } from "class-validator";
import { maximo, minimo, obrigatorio, texto } from "../comum/validacao.js";
import { PecaEntradaDto } from "../pecas/pecas.dto.js";

// Quem envia uma peça preenche só estes campos, com as mesmas regras do cadastro de peças.
// Situação, dono, foto e voltas não entram: são definidos pelo brechó.
export class ConsignacaoEntradaDto extends PickType(PecaEntradaDto, ["titulo", "marca", "tamanho", "categoria", "conservacao", "preco"] as const) {}

export class RecusaDto {
  @ApiProperty({ type: String, example: "Zíper quebrado.", minLength: 3, maxLength: 200 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(200, maximo)
  motivo!: string;
}

export class ConsignacaoDto extends ConsignacaoEntradaDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: String }) foto!: string;
  @ApiProperty({ type: String, example: "Em análise" }) situacao!: string;
  @ApiProperty({ type: String }) motivo!: string;
  @ApiProperty({ type: Number }) donoId!: number;
  @ApiProperty({ type: String }) dono!: string;
  @ApiProperty({ type: Number, nullable: true, description: "Valor do repasse. Só existe depois que a peça é vendida." }) repasse!: number | null;
}
