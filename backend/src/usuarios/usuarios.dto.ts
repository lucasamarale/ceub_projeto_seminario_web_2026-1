import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDefined, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { booleano, de, email, emMinusculas, maximo, minimo, numero, obrigatorio, texto } from "../comum/validacao.js";

// Campos que criar e editar têm em comum. A senha muda de regra: obrigatória ao criar, opcional ao editar.
class UsuarioBaseDto {
  @ApiProperty({ type: String, example: "Marina Lopes", minLength: 3, maxLength: 80 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(80, maximo)
  nome!: string;

  @ApiProperty({ type: String, example: "marina@ciranda.app", maxLength: 120 })
  @IsDefined(obrigatorio) @IsString(texto) @MaxLength(120, maximo) @IsEmail({}, email) @Transform(emMinusculas)
  email!: string;

  @ApiProperty({ type: Number, example: 2, description: "Identificador do perfil." })
  @IsDefined(obrigatorio) @Type(() => Number) @IsInt(numero) @Min(1, de)
  perfilId!: number;

  @ApiProperty({ type: Boolean, required: false, default: true })
  @IsOptional() @IsBoolean(booleano)
  ativo?: boolean;
}

export class UsuarioCriarDto extends UsuarioBaseDto {
  @ApiProperty({ type: String, minLength: 8, maxLength: 200 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(8, minimo) @MaxLength(200, maximo)
  senha!: string;
}

export class UsuarioEditarDto extends UsuarioBaseDto {
  @ApiProperty({ type: String, required: false, minLength: 8, maxLength: 200, description: "Só mande para trocar a senha." })
  @IsOptional() @IsString(texto) @MinLength(8, minimo) @MaxLength(200, maximo)
  senha?: string;
}

export class UsuarioDto {
  @ApiProperty({ type: Number }) id!: number;
  @ApiProperty({ type: String }) nome!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ type: Number }) perfilId!: number;
  @ApiProperty({ type: String, example: "Fornecedor" }) perfil!: string;
  @ApiProperty({ type: Boolean }) ativo!: boolean;
  @ApiProperty({ type: String, format: "date-time" }) criadoEm!: Date;
}
