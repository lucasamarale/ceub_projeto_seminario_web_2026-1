import { Controller, Get, Inject, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Usuario } from "../comum/guardas.js";
import { EmDia } from "../reservas/em-dia.interceptor.js";
import { BastidoresDto, ImpactoDto } from "./painel.dto.js";
import { PainelService } from "./painel.service.js";

@ApiTags("Painéis")
@ComChaveDeApi()
@UseInterceptors(EmDia)
@Controller("api")
export class PainelController {
  constructor(@Inject(PainelService) private readonly servico: PainelService) {}

  @Get("impacto")
  @Autenticado("sacola.usar")
  @ApiOperation({ summary: "O que as compras da pessoa já pouparam" })
  @ApiResponse({ status: 200, type: ImpactoDto })
  impacto(@Usuario() quem: UsuarioDaSessao) { return this.servico.impacto(quem); }

  @Get("bastidores")
  @Autenticado("bastidores.ver")
  @ApiOperation({ summary: "Painel do brechó", description: "Vendido, a repassar, peças e pedidos por situação." })
  @ApiResponse({ status: 200, type: BastidoresDto })
  bastidores() { return this.servico.bastidores(); }
}
