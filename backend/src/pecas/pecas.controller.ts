import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Exigir, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { EmDia } from "../reservas/em-dia.interceptor.js";
import { FiltroDePecasDto, PecaDto, PecaEntradaDto } from "./pecas.dto.js";
import { PecasService } from "./pecas.service.js";

@ApiTags("Peças")
@ComChaveDeApi()
@Autenticado("pecas.gerenciar")
@UseInterceptors(EmDia)
@Controller("api/pecas")
export class PecasController {
  constructor(@Inject(PecasService) private readonly servico: PecasService) {}

  @Get()
  @Exigir("catalogo.ver")
  @ApiOperation({ summary: "Lista o catálogo", description: "Quem não gerencia o acervo não vê peça em análise nem recusada." })
  @ApiResponse({ status: 200, type: [PecaDto] })
  @ApiBadRequestResponse(erro("Filtro inválido: categoria ou situação fora da lista, ou busca com mais de 60 caracteres."))
  listar(@Query(validado(FiltroDePecasDto)) filtro: FiltroDePecasDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.listar(filtro, quem); }

  @Get(":id")
  @Exigir("catalogo.ver")
  @ApiOperation({ summary: "Busca uma peça" })
  @ApiResponse({ status: 200, type: PecaDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Peça não encontrado."))
  buscar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.buscar(id, quem); }

  @Post()
  @ApiOperation({ summary: "Cadastra uma peça no acervo" })
  @ApiBody({ type: PecaEntradaDto })
  @ApiResponse({ status: 201, type: PecaDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  criar(@Body(validado(PecaEntradaDto)) dados: PecaEntradaDto) { return this.servico.criar(dados); }

  @Put(":id")
  @ApiOperation({ summary: "Edita uma peça" })
  @ApiBody({ type: PecaEntradaDto })
  @ApiResponse({ status: 200, type: PecaDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Peça não encontrada."))
  editar(@Param("id", IdDaRota) id: number, @Body(validado(PecaEntradaDto)) dados: PecaEntradaDto) { return this.servico.editar(id, dados); }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove uma peça" })
  @ApiResponse({ status: 204 })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Peça não encontrada."))
  remover(@Param("id", IdDaRota) id: number) { return this.servico.remover(id); }
}
