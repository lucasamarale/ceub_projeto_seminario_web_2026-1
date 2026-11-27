import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { EmDia } from "../reservas/em-dia.interceptor.js";
import { SacolaDto, SacolaEntradaDto } from "./sacola.dto.js";
import { SacolaService } from "./sacola.service.js";

@ApiTags("Sacola")
@ComChaveDeApi()
@Autenticado("sacola.usar")
@UseInterceptors(EmDia)
@Controller("api/sacola")
export class SacolaController {
  constructor(@Inject(SacolaService) private readonly servico: SacolaService) {}

  @Get()
  @ApiOperation({ summary: "Vê a própria sacola" })
  @ApiResponse({ status: 200, type: SacolaDto })
  ver(@Usuario() quem: UsuarioDaSessao) { return this.servico.ver(quem.id); }

  @Post()
  @ApiOperation({ summary: "Coloca uma peça na sacola", description: "Reserva a peça por 30 minutos." })
  @ApiBody({ type: SacolaEntradaDto })
  @ApiResponse({ status: 201, type: SacolaDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Peça não encontrada."))
  @ApiConflictResponse(erro("Peça vendida, reservada por outra pessoa ou da própria pessoa."))
  colocar(@Body(validado(SacolaEntradaDto)) dados: SacolaEntradaDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.colocar(dados, quem); }

  @Delete(":pecaId")
  @ApiOperation({ summary: "Tira uma peça da sacola", description: "A peça volta ao catálogo." })
  @ApiResponse({ status: 200, type: SacolaDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Item da sacola não encontrado."))
  tirar(@Param("pecaId", IdDaRota) pecaId: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.tirar(pecaId, quem); }
}
