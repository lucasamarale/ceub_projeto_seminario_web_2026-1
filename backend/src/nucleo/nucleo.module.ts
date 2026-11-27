import { DynamicModule, Global, Module } from "@nestjs/common";
import { PrismaService } from "../banco/prisma.service.js";
import { CONFIG, type Config } from "../config.js";

// Núcleo global: a configuração e o acesso ao banco, que todos os módulos usam.
// A configuração entra de fora para os testes poderem trocar banco, relógio e limites.
@Global()
@Module({})
export class NucleoModule {
  static com(config: Config): DynamicModule {
    return { module: NucleoModule, providers: [{ provide: CONFIG, useValue: config }, PrismaService], exports: [CONFIG, PrismaService] };
  }
}
