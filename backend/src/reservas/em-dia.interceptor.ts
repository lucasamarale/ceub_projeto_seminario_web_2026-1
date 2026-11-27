import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { from, switchMap } from "rxjs";
import { ReservasService } from "./reservas.service.js";

/** Interceptador das rotas da loja: solta as reservas vencidas antes de a rota responder. */
@Injectable()
export class EmDia implements NestInterceptor {
  constructor(@Inject(ReservasService) private readonly reservas: ReservasService) {}

  intercept(_contexto: ExecutionContext, proximo: CallHandler) {
    return from(this.reservas.liberarVencidas()).pipe(switchMap(() => proximo.handle()));
  }
}
