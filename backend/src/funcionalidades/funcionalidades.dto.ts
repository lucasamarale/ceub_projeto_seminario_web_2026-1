import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { maximo, minimo, obrigatorio, texto } from "../comum/validacao.js";

export class FuncionalidadeEntradaDto {
  @ApiProperty({ type: String, example: "relatorios.ver", description: "Formato area.acao, em minúsculas." })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(60, maximo)
  @Matches(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/, { message: "Use o formato area.acao, em minúsculas." })
  chave!: string;

  @ApiProperty({ type: String, example: "Ver relatórios", minLength: 3, maxLength: 80 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(80, maximo)
  nome!: string;

  @ApiProperty({ type: String, required: false, maxLength: 200 })
  @IsOptional() @IsString(texto) @MaxLength(200, maximo)
  descricao?: string;
}

export class FuncionalidadeDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: String }) chave!: string;
  @ApiProperty({ type: String }) nome!: string;
  @ApiProperty({ type: String }) descricao!: string;
  @ApiProperty({ type: Number, description: "Quantos perfis usam esta funcionalidade." }) perfis!: number;
}
