import { Module } from "@nestjs/common";
import { ReservasModule } from "../reservas/reservas.module.js";
import { PainelController } from "./painel.controller.js";
import { PainelService } from "./painel.service.js";

// Painéis de números: impacto de quem compra e bastidores do brechó.
@Module({ controllers: [PainelController], providers: [PainelService], imports: [ReservasModule] })
export class PainelModule {}
