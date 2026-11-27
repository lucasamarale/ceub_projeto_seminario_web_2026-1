import { Global, Module } from "@nestjs/common";
import { GuardaDeAutenticacao, GuardaDePermissao } from "../comum/guardas.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

// Acesso: login, cadastro, sessão por cookie e as guardas de JWT e de permissão.
// É global porque todo controlador protegido usa as guardas, que dependem do AuthService.
@Global()
@Module({ controllers: [AuthController], providers: [AuthService, GuardaDeAutenticacao, GuardaDePermissao], exports: [AuthService, GuardaDeAutenticacao, GuardaDePermissao] })
export class AuthModule {}
