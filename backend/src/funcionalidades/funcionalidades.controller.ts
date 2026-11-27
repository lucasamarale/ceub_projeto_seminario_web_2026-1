import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Autenticado, ComChaveDeApi, Exigir } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { FuncionalidadeDto, FuncionalidadeEntradaDto } from "./funcionalidades.dto.js";
import { FuncionalidadesService } from "./funcionalidades.service.js";

@ApiTags("Funcionalidades")
@ComChaveDeApi()
@Autenticado("funcionalidades.gerenciar")
@Controller("api/funcionalidades")
export class FuncionalidadesController {
  constructor(@Inject(FuncionalidadesService) private readonly servico: FuncionalidadesService) {}

  // Quem gerencia perfis também precisa listar as funcionalidades para marcá-las.
  @Get()
  @Exigir("funcionalidades.gerenciar", "perfis.gerenciar")
  @ApiOperation({ summary: "Lista as funcionalidades" })
  @ApiResponse({ status: 200, type: [FuncionalidadeDto] })
  listar() { return this.servico.listar(); }

  @Get(":id")
  @ApiOperation({ summary: "Busca uma funcionalidade" })
  @ApiResponse({ status: 200, type: FuncionalidadeDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Funcionalidade não encontrado."))
  buscar(@Param("id", IdDaRota) id: number) { return this.servico.buscar(id); }

  @Post()
  @ApiOperation({ summary: "Cria uma funcionalidade" })
  @ApiBody({ type: FuncionalidadeEntradaDto })
  @ApiResponse({ status: 201, type: FuncionalidadeDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiConflictResponse(erro("Já existe uma funcionalidade com essa chave."))
  criar(@Body(validado(FuncionalidadeEntradaDto)) dados: FuncionalidadeEntradaDto) { return this.servico.criar(dados); }

  @Put(":id")
  @ApiOperation({ summary: "Edita uma funcionalidade" })
  @ApiBody({ type: FuncionalidadeEntradaDto })
  @ApiResponse({ status: 200, type: FuncionalidadeDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Funcionalidade não encontrado."))
  @ApiConflictResponse(erro("Já existe uma funcionalidade com essa chave."))
  editar(@Param("id", IdDaRota) id: number, @Body(validado(FuncionalidadeEntradaDto)) dados: FuncionalidadeEntradaDto) { return this.servico.editar(id, dados); }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove uma funcionalidade que nenhum perfil usa" })
  @ApiResponse({ status: 204 })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Funcionalidade não encontrado."))
  @ApiConflictResponse(erro("Em uso por algum perfil."))
  remover(@Param("id", IdDaRota) id: number) { return this.servico.remover(id); }
}
