import { ApiProperty } from "@nestjs/swagger";

/** Formato de toda resposta de erro da API. */
export class ErroDto {
  @ApiProperty({ type: String, example: "Dados inválidos." }) erro!: string;
  @ApiProperty({ type: Object, required: false, additionalProperties: { type: "string" }, example: { email: "E-mail inválido." }, description: "Só nos erros de validação: a mensagem de cada campo." }) detalhes?: Record<string, string>;
}

// Descrições prontas para os decoradores de resposta do Swagger (@ApiBadRequestResponse, @ApiNotFoundResponse...).
export const erro = (description: string) => ({ description, type: ErroDto });
export const DADOS_INVALIDOS = erro("Dados inválidos. O campo detalhes traz a mensagem de cada campo recusado.");
export const ID_INVALIDO = erro("Identificador inválido: precisa ser um inteiro positivo.");
