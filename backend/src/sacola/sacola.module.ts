import { Module } from "@nestjs/common";
import { ReservasModule } from "../reservas/reservas.module.js";
import { SacolaController } from "./sacola.controller.js";
import { SacolaService } from "./sacola.service.js";

// Sacola de compras, com reserva de 30 minutos.
@Module({ controllers: [SacolaController], providers: [SacolaService], imports: [ReservasModule] })
export class SacolaModule {}
