import { Module } from "@nestjs/common";
import { UsuariosController } from "./usuarios.controller.js";
import { UsuariosService } from "./usuarios.service.js";

// Cadastro de usuários (CRUD).
@Module({ controllers: [UsuariosController], providers: [UsuariosService] })
export class UsuariosModule {}
