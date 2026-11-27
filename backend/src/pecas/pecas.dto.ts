import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDefined, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { ate, de, maximo, minimo, numero, obrigatorio, opcao, texto } from "../comum/validacao.js";
import { CATEGORIAS, CONSERVACOES, SITUACOES } from "./pecas.constantes.js";

export class PecaEntradaDto {
  @ApiProperty({ type: String, example: "Jaqueta jeans oversized", minLength: 3, maxLength: 80 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(80, maximo)
  titulo!: string;

  @ApiProperty({ type: String, required: false, example: "Zara", maxLength: 40 })
  @IsOptional() @IsString(texto) @MaxLength(40, maximo)
  marca?: string;

  @ApiProperty({ type: String, required: false, example: "G", maxLength: 10 })
  @IsOptional() @IsString(texto) @MaxLength(10, maximo)
  tamanho?: string;

  @ApiProperty({ type: String, enum: CATEGORIAS })
  @IsDefined(obrigatorio) @IsString(texto) @IsIn(CATEGORIAS, opcao)
  categoria!: string;

  @ApiProperty({ type: String, enum: CONSERVACOES })
  @IsDefined(obrigatorio) @IsString(texto) @IsIn(CONSERVACOES, opcao)
  conservacao!: string;

  @ApiProperty({ type: Number, example: 129.9, minimum: 0.01, maximum: 100000 })
  @IsDefined(obrigatorio) @Type(() => Number) @IsNumber({}, numero) @Min(0.01, de) @Max(100000, ate)
  preco!: number;

  @ApiProperty({ type: Number, required: false, example: 2, minimum: 1, maximum: 99 })
  @IsOptional() @Type(() => Number) @IsInt(numero) @Min(1, de) @Max(99, ate)
  voltas?: number;

  @ApiProperty({ type: String, required: false, example: "jaqueta-jeans.webp", description: "Só o nome do arquivo." })
  @IsOptional() @IsString(texto) @MaxLength(120, maximo) @Matches(/^[a-z0-9-]+\.(webp|png|jpg)$/, { message: "Informe só o nome do arquivo da foto." })
  foto?: string;

  @ApiProperty({ type: String, required: false, enum: SITUACOES })
  @IsOptional() @IsString(texto) @IsIn(SITUACOES, opcao)
  situacao?: string;
}

/** Filtros da listagem do catálogo, lidos da query string. */
export class FiltroDePecasDto {
  @ApiProperty({ type: String, required: false, maxLength: 60, description: "Busca em título e marca." })
  @IsOptional() @IsString(texto) @MaxLength(60, maximo)
  q?: string;

  @ApiProperty({ type: String, required: false, enum: CATEGORIAS })
  @IsOptional() @IsString(texto) @IsIn(CATEGORIAS, opcao)
  categoria?: string;

  @ApiProperty({ type: String, required: false, enum: SITUACOES })
  @IsOptional() @IsString(texto) @IsIn(SITUACOES, opcao)
  situacao?: string;
}

export class PecaDto extends PecaEntradaDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: Number, nullable: true, description: "Quem deixou a peça em consignação." }) donoId!: number | null;
  @ApiProperty({ type: String, description: "Motivo da recusa, quando houver." }) motivo!: string;
}
