import { Module } from "@nestjs/common";
import { PerfisController } from "./perfis.controller.js";
import { PerfisService } from "./perfis.service.js";

// Cadastro de perfis e das funcionalidades de cada um (CRUD).
@Module({ controllers: [PerfisController], providers: [PerfisService] })
export class PerfisModule {}
