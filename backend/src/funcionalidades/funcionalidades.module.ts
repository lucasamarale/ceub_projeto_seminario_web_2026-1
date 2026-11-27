import { Module } from "@nestjs/common";
import { FuncionalidadesController } from "./funcionalidades.controller.js";
import { FuncionalidadesService } from "./funcionalidades.service.js";

// Cadastro de funcionalidades (CRUD).
@Module({ controllers: [FuncionalidadesController], providers: [FuncionalidadesService] })
export class FuncionalidadesModule {}
