import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDefined, IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { email, emMinusculas, maximo, minimo, obrigatorio, texto } from "../comum/validacao.js";

export class LoginDto {
  @ApiProperty({ type: String, example: "ana@ciranda.app", maxLength: 120 })
  @IsDefined(obrigatorio) @IsString(texto) @MaxLength(120, maximo) @IsEmail({}, email) @Transform(emMinusculas)
  email!: string;

  @ApiProperty({ type: String, example: "ciranda123", maxLength: 200 })
  @IsDefined(obrigatorio) @IsString(texto) @MaxLength(200, maximo)
  senha!: string;
}

export class CadastroDto {
  @ApiProperty({ type: String, example: "Camila Prado", minLength: 3, maxLength: 80 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(3, minimo) @MaxLength(80, maximo)
  nome!: string;

  @ApiProperty({ type: String, example: "camila@exemplo.com", maxLength: 120 })
  @IsDefined(obrigatorio) @IsString(texto) @MaxLength(120, maximo) @IsEmail({}, email) @Transform(emMinusculas)
  email!: string;

  @ApiProperty({ type: String, example: "uma-senha-longa", minLength: 8, maxLength: 200 })
  @IsDefined(obrigatorio) @IsString(texto) @MinLength(8, minimo) @MaxLength(200, maximo)
  senha!: string;
}

export class UsuarioDaSessaoDto {
  @ApiProperty({ type: Number, example: 3 }) id!: number;
  @ApiProperty({ type: String, example: "Ana Costa" }) nome!: string;
  @ApiProperty({ type: String, example: "ana@ciranda.app" }) email!: string;
  @ApiProperty({ type: Number, example: 3 }) perfilId!: number;
  @ApiProperty({ type: String, example: "Cliente" }) perfil!: string;
  @ApiProperty({ type: [String], example: ["catalogo.ver", "sacola.usar"] }) funcionalidades!: string[];
}

export class SessaoDto {
  @ApiProperty({ type: String, description: "JWT de acesso. Vai no cabeçalho Authorization: Bearer." }) token!: string;
  @ApiProperty({ type: UsuarioDaSessaoDto }) usuario!: UsuarioDaSessaoDto;
}

export class EuDto {
  @ApiProperty({ type: UsuarioDaSessaoDto }) usuario!: UsuarioDaSessaoDto;
}
