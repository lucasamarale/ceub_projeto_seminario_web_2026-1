import { Controller, Get, HttpCode, Inject, Param, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Exigir, Usuario } from "../comum/guardas.js";
import { erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota } from "../comum/validacao.js";
import { EmDia } from "../reservas/em-dia.interceptor.js";
import { PedidoDto } from "./pedidos.dto.js";
import { PedidosService } from "./pedidos.service.js";

@ApiTags("Pedidos")
@ComChaveDeApi()
@Autenticado()
@UseInterceptors(EmDia)
@Controller("api/pedidos")
export class PedidosController {
  constructor(@Inject(PedidosService) private readonly servico: PedidosService) {}

  @Get()
  @ApiOperation({ summary: "Lista os próprios pedidos", description: "Com todos=1, lista os pedidos de todo mundo. Só para quem tem bastidores.ver." })
  @ApiQuery({ name: "todos", required: false, enum: ["1"] })
  @ApiResponse({ status: 200, type: [PedidoDto] })
  @ApiForbiddenResponse(erro("Perfil sem sacola.usar, ou sem bastidores.ver quando todos=1."))
  listar(@Query("todos") todos: string, @Usuario() quem: UsuarioDaSessao) { return this.servico.listar(todos === "1", quem); }

  @Get(":id")
  @ApiOperation({ summary: "Busca um pedido", description: "Pedido de outra pessoa responde 404." })
  @ApiResponse({ status: 200, type: PedidoDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Pedido não encontrado, ou de outra pessoa."))
  buscar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.buscar(id, quem); }

  @Post()
  @Exigir("sacola.usar")
  @ApiOperation({ summary: "Fecha a sacola em um pedido", description: "Gera o código do Pix simulado e dá 30 minutos para pagar." })
  @ApiResponse({ status: 201, type: PedidoDto })
  @ApiConflictResponse(erro("Sacola vazia."))
  fechar(@Usuario() quem: UsuarioDaSessao) { return this.servico.fechar(quem); }

  @Post(":id/pagar")
  @HttpCode(200)
  @Exigir("sacola.usar")
  @ApiOperation({ summary: "Confirma o Pix simulado", description: "Vende as peças, gera o rastreio e credita os pontos. Nenhum dinheiro circula." })
  @ApiResponse({ status: 200, type: PedidoDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Pedido não encontrado, ou de outra pessoa."))
  @ApiConflictResponse(erro("Pedido que não está aguardando pagamento, ou reserva vencida."))
  pagar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.pagar(id, quem); }

  @Post(":id/cancelar")
  @HttpCode(200)
  @Exigir("sacola.usar")
  @ApiOperation({ summary: "Cancela um pedido ainda não pago" })
  @ApiResponse({ status: 200, type: PedidoDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Pedido não encontrado, ou de outra pessoa."))
  @ApiConflictResponse(erro("Pedido que já foi pago."))
  cancelar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.cancelar(id, quem); }

  @Post(":id/avancar")
  @HttpCode(200)
  @Exigir("bastidores.ver")
  @ApiOperation({ summary: "Move o pedido para a etapa seguinte", description: "Pago, Em separação, Enviado, Entregue." })
  @ApiResponse({ status: 200, type: PedidoDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Pedido não encontrado, ou de outra pessoa."))
  @ApiConflictResponse(erro("Pedido que não foi pago, ou que já foi entregue."))
  avancar(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.avancar(id, quem); }
}
