import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsDefined, IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { listaDeIds, maximo, minimo, obrigatorio, semRepetidos, texto } from "../comum/validacao.js";

export class PerfilEntradaDto {
  @ApiProperty({ type: String, example: "Curadoria", minLength: 3, maxLength: 60 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(60, maximo)
  nome!: string;

  @ApiProperty({ type: String, required: false, maxLength: 200 })
  @IsOptional() @IsString(texto) @MaxLength(200, maximo)
  descricao?: string;

  @ApiProperty({ type: [Number], example: [1, 2], description: "Identificadores das funcionalidades do perfil." })
  @IsDefined(obrigatorio) @IsArray(listaDeIds) @IsInt({ ...listaDeIds, each: true }) @Transform(semRepetidos)
  funcionalidades!: number[];
}

export class PerfilDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: String }) nome!: string;
  @ApiProperty({ type: String }) descricao!: string;
  @ApiProperty({ type: Number, description: "Quantos usuários têm este perfil." }) usuarios!: number;
  @ApiProperty({ type: [Number] }) funcionalidades!: number[];
}
