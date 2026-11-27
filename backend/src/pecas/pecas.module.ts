import { Module } from "@nestjs/common";
import { ReservasModule } from "../reservas/reservas.module.js";
import { PecasController } from "./pecas.controller.js";
import { PecasService } from "./pecas.service.js";

// Acervo de peças (CRUD) e catálogo.
@Module({ controllers: [PecasController], providers: [PecasService], imports: [ReservasModule] })
export class PecasModule {}
