import { DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { FiltroDeErros } from "./comum/filtro-de-erros.js";
import { GuardaDaChaveDeApi } from "./comum/guardas.js";
import type { Config } from "./config.js";
import { ConsignacaoModule } from "./consignacao/consignacao.module.js";
import { FuncionalidadesModule } from "./funcionalidades/funcionalidades.module.js";
import { NucleoModule } from "./nucleo/nucleo.module.js";
import { PainelModule } from "./painel/painel.module.js";
import { PecasModule } from "./pecas/pecas.module.js";
import { PedidosModule } from "./pedidos/pedidos.module.js";
import { PerfisModule } from "./perfis/perfis.module.js";
import { SacolaModule } from "./sacola/sacola.module.js";
import { SaudeModule } from "./saude/saude.module.js";
import { UsuariosModule } from "./usuarios/usuarios.module.js";

// Módulo raiz: junta um módulo por recurso. Cada pasta tem o seu módulo, controlador, serviço e DTOs.
@Module({})
export class AppModule {
  static com(config: Config): DynamicModule {
    return {
      module: AppModule,
      imports: [
        NucleoModule.com(config), AuthModule, SaudeModule,
        UsuariosModule, PerfisModule, FuncionalidadesModule, PecasModule,
        SacolaModule, PedidosModule, ConsignacaoModule, PainelModule,
      ],
      providers: [
        // A chave de API vale para todas as rotas, e o filtro de erros para todas as respostas.
        { provide: APP_GUARD, useClass: GuardaDaChaveDeApi },
        { provide: APP_FILTER, useClass: FiltroDeErros },
      ],
    };
  }
}
