import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Exigir, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { PerfilDto, PerfilEntradaDto } from "./perfis.dto.js";
import { PerfisService } from "./perfis.service.js";

@ApiTags("Perfis")
@ComChaveDeApi()
@Autenticado("perfis.gerenciar")
@Controller("api/perfis")
export class PerfisController {
  constructor(@Inject(PerfisService) private readonly servico: PerfisService) {}

  // Quem gerencia usuários também precisa listar os perfis para escolher um.
  @Get()
  @Exigir("perfis.gerenciar", "usuarios.gerenciar")
  @ApiOperation({ summary: "Lista os perfis" })
  @ApiResponse({ status: 200, type: [PerfilDto] })
  listar() { return this.servico.listar(); }

  @Get(":id")
  @ApiOperation({ summary: "Busca um perfil" })
  @ApiResponse({ status: 200, type: PerfilDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Perfil não encontrado."))
  buscar(@Param("id", IdDaRota) id: number) { return this.servico.buscar(id); }

  @Post()
  @ApiOperation({ summary: "Cria um perfil com as funcionalidades dele" })
  @ApiBody({ type: PerfilEntradaDto })
  @ApiResponse({ status: 201, type: PerfilDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiConflictResponse(erro("Já existe um perfil com esse nome."))
  criar(@Body(validado(PerfilEntradaDto)) dados: PerfilEntradaDto) { return this.servico.criar(dados); }

  @Put(":id")
  @ApiOperation({ summary: "Edita um perfil" })
  @ApiBody({ type: PerfilEntradaDto })
  @ApiResponse({ status: 200, type: PerfilDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Perfil não encontrado."))
  @ApiConflictResponse(erro("Nome já usado, ou tentativa de tirar a gestão de perfis do próprio perfil."))
  editar(@Param("id", IdDaRota) id: number, @Body(validado(PerfilEntradaDto)) dados: PerfilEntradaDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.editar(id, dados, quem); }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove um perfil sem usuários" })
  @ApiResponse({ status: 204 })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Perfil não encontrado."))
  @ApiConflictResponse(erro("Há usuários com este perfil."))
  remover(@Param("id", IdDaRota) id: number) { return this.servico.remover(id); }
}
