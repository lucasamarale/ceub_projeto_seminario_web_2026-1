import { Injectable, type ArgumentMetadata, type PipeTransform, type Type, ValidationPipe } from "@nestjs/common";
import type { ValidationArguments, ValidationError } from "class-validator";
import { invalido } from "./erros.js";

// Validação de entrada no padrão do Nest: ValidationPipe com class-validator e class-transformer.
// As regras ficam nos DTOs, como decoradores (@IsString, @MinLength, @IsEmail...). Este arquivo guarda o que é comum:
// as mensagens em português, o pipe já configurado e o pipe do identificador de rota.

const limite = (a: ValidationArguments) => a.constraints[0];
// Mensagens usadas nos decoradores dos DTOs. Exemplo: @MinLength(3, minimo).
export const obrigatorio = { message: "Campo obrigatório." };
export const texto = { message: "Deve ser texto." };
export const minimo = { message: (a: ValidationArguments) => `Mínimo de ${limite(a)} caracteres.` };
export const maximo = { message: (a: ValidationArguments) => `Máximo de ${limite(a)} caracteres.` };
export const email = { message: "E-mail inválido." };
export const opcao = { message: "Valor não permitido." };
export const numero = { message: "Número inválido." };
export const de = { message: (a: ValidationArguments) => `Mínimo ${limite(a)}.` };
export const ate = { message: (a: ValidationArguments) => `Máximo ${limite(a)}.` };
export const booleano = { message: "Deve ser verdadeiro ou falso." };
export const listaDeIds = { message: "Deve ser uma lista de identificadores." };

/** Para usar com @Transform: guarda o e-mail sempre em minúsculas. */
export const emMinusculas = ({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value);
/** Para usar com @Transform: tira os repetidos de uma lista. */
export const semRepetidos = ({ value }: { value: unknown }) => (Array.isArray(value) ? [...new Set(value)] : value);

// Quando um campo quebra mais de uma regra, a tela recebe uma mensagem só: a da regra mais básica.
const ORDEM = ["isDefined", "isString", "isNumber", "isInt", "isBoolean", "isArray", "minLength", "maxLength", "isEmail", "isIn", "matches", "min", "max"];

// Os erros do class-validator viram o formato da API: { erro: "Dados inválidos.", detalhes: { campo: mensagem } }.
function recusar(erros: ValidationError[]) {
  const detalhes: Record<string, string> = {};
  for (const { property, constraints = {} } of erros) {
    const regra = ORDEM.find((nome) => nome in constraints) ?? Object.keys(constraints)[0];
    detalhes[property] = constraints[regra];
  }
  return invalido(detalhes);
}

// Campo vazio ("" ou null) conta como não enviado, e texto perde os espaços das pontas.
function limpar(valor: unknown) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return Object.fromEntries(Object.entries(valor).map(([campo, v]) => [campo, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v !== "" && v != null));
}

class Validacao extends ValidationPipe {
  constructor(dto: Type<object>) {
    super({
      // O tipo é informado aqui porque os testes e o pacote da Vercel rodam sem os metadados de tipo do TypeScript.
      expectedType: dto,
      // Lista de permissão: campo que o DTO não declara é descartado. Ninguém grava "perfilId" ou "situacao" onde não devia.
      whitelist: true,
      // Entrega ao controlador uma instância do DTO, com os números já convertidos.
      transform: true,
      transformOptions: { exposeUnsetFields: false },
      exceptionFactory: recusar,
    });
  }

  override transform(valor: unknown, meta: ArgumentMetadata) {
    return super.transform(limpar(valor), meta);
  }
}

/** Pipe de validação para um DTO. Uso: @Body(validado(LoginDto)) dados: LoginDto. */
export const validado = (dto: Type<object>) => new Validacao(dto);

/** Pipe do identificador de rota: só inteiro positivo. Qualquer outra coisa é recusada antes de chegar ao banco. */
@Injectable()
export class IdDaRota implements PipeTransform<unknown, number> {
  transform(valor: unknown): number {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw invalido({ id: "Identificador inválido." });
    return id;
  }
}
