import { Module } from "@nestjs/common";
import { EmDia } from "./em-dia.interceptor.js";
import { ReservasService } from "./reservas.service.js";

// Regras de reserva da loja. Os módulos que mostram ou vendem peças importam este para usar o interceptador EmDia.
@Module({ providers: [ReservasService, EmDia], exports: [ReservasService, EmDia] })
export class ReservasModule {}
