import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Exigir, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { ConsignacaoDto, ConsignacaoEntradaDto, RecusaDto } from "./consignacao.dto.js";
import { ConsignacaoService } from "./consignacao.service.js";

@ApiTags("Consignação")
@ComChaveDeApi()
@Autenticado()
@Controller("api/consignacoes")
export class ConsignacaoController {
  constructor(@Inject(ConsignacaoService) private readonly servico: ConsignacaoService) {}

  @Get()
  @ApiOperation({ summary: "Lista as próprias peças em consignação", description: "Com fila=1, lista as peças esperando análise. Só para quem tem consignacao.aprovar." })
  @ApiQuery({ name: "fila", required: false, enum: ["1"] })
  @ApiResponse({ status: 200, type: [ConsignacaoDto] })
  @ApiForbiddenResponse(erro("Perfil sem consignacao.publicar, ou sem consignacao.aprovar quando fila=1."))
  listar(@Query("fila") fila: string, @Usuario() quem: UsuarioDaSessao) { return this.servico.listar(fila === "1", quem); }

  @Post()
  @Exigir("consignacao.publicar")
  @ApiOperation({ summary: "Envia uma peça para análise" })
  @ApiBody({ type: ConsignacaoEntradaDto })
  @ApiResponse({ status: 201, type: ConsignacaoDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  publicar(@Body(validado(ConsignacaoEntradaDto)) dados: ConsignacaoEntradaDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.publicar(dados, quem); }

  @Post(":id/aprovar")
  @HttpCode(200)
  @Exigir("consignacao.aprovar")
  @ApiOperation({ summary: "Aprova a peça", description: "A peça entra no catálogo." })
  @ApiResponse({ status: 200, type: ConsignacaoDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Peça em consignação não encontrada, ou de outra pessoa."))
  @ApiConflictResponse(erro("Peça já analisada."))
  aprovar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.aprovar(id, quem); }

  @Post(":id/recusar")
  @HttpCode(200)
  @Exigir("consignacao.aprovar")
  @ApiOperation({ summary: "Recusa a peça, com motivo" })
  @ApiBody({ type: RecusaDto })
  @ApiResponse({ status: 200, type: ConsignacaoDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Peça em consignação não encontrada, ou de outra pessoa."))
  @ApiConflictResponse(erro("Peça já analisada."))
  recusar(@Param("id", IdDaRota) id: number, @Body(validado(RecusaDto)) dados: RecusaDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.recusar(id, dados, quem); }

  @Delete(":id")
  @HttpCode(204)
  @Exigir("consignacao.publicar")
  @ApiOperation({ summary: "Retira uma peça que ainda não entrou no catálogo" })
  @ApiResponse({ status: 204 })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Peça em consignação não encontrada, ou de outra pessoa."))
  @ApiConflictResponse(erro("Peça que já está no catálogo."))
  retirar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.retirar(id, quem); }
}
