import { Module } from "@nestjs/common";
import { ConsignacaoController } from "./consignacao.controller.js";
import { ConsignacaoService } from "./consignacao.service.js";

// Consignação: envio, análise e repasse.
@Module({ controllers: [ConsignacaoController], providers: [ConsignacaoService] })
export class ConsignacaoModule {}
