import { Module } from "@nestjs/common";
import { ReservasModule } from "../reservas/reservas.module.js";
import { PedidosController } from "./pedidos.controller.js";
import { PedidosService } from "./pedidos.service.js";

// Pedidos, Pix simulado e linha do tempo.
@Module({ controllers: [PedidosController], providers: [PedidosService], imports: [ReservasModule] })
export class PedidosModule {}
