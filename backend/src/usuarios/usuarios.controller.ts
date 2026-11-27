import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { UsuarioDaSessao } from "../auth/auth.service.js";
import { Autenticado, ComChaveDeApi, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro, ID_INVALIDO } from "../comum/respostas.js";
import { IdDaRota, validado } from "../comum/validacao.js";
import { UsuarioCriarDto, UsuarioDto, UsuarioEditarDto } from "./usuarios.dto.js";
import { UsuariosService } from "./usuarios.service.js";

@ApiTags("Usuários")
@ComChaveDeApi()
@Autenticado("usuarios.gerenciar")
@Controller("api/usuarios")
export class UsuariosController {
  constructor(@Inject(UsuariosService) private readonly servico: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: "Lista os usuários" })
  @ApiResponse({ status: 200, type: [UsuarioDto] })
  listar() { return this.servico.listar(); }

  @Get(":id")
  @ApiOperation({ summary: "Busca um usuário" })
  @ApiResponse({ status: 200, type: UsuarioDto })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Usuário não encontrado."))
  buscar(@Param("id", IdDaRota) id: number) { return this.servico.buscar(id); }

  @Post()
  @ApiOperation({ summary: "Cria um usuário" })
  @ApiBody({ type: UsuarioCriarDto })
  @ApiResponse({ status: 201, type: UsuarioDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiConflictResponse(erro("Já existe um usuário com esse e-mail."))
  criar(@Body(validado(UsuarioCriarDto)) dados: UsuarioCriarDto) { return this.servico.criar(dados); }

  @Put(":id")
  @ApiOperation({ summary: "Edita um usuário" })
  @ApiBody({ type: UsuarioEditarDto })
  @ApiResponse({ status: 200, type: UsuarioDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiNotFoundResponse(erro("Usuário não encontrado."))
  @ApiConflictResponse(erro("E-mail já usado, ou tentativa de desativar a própria conta ou trocar o próprio perfil."))
  editar(@Param("id", IdDaRota) id: number, @Body(validado(UsuarioEditarDto)) dados: UsuarioEditarDto, @Usuario() quem: UsuarioDaSessao) { return this.servico.editar(id, dados, quem); }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove um usuário" })
  @ApiResponse({ status: 204 })
  @ApiBadRequestResponse(ID_INVALIDO)
  @ApiNotFoundResponse(erro("Usuário não encontrado."))
  @ApiConflictResponse(erro("Ninguém remove a própria conta."))
  remover(@Param("id", IdDaRota) id: number, @Usuario() quem: UsuarioDaSessao) { return this.servico.remover(id, quem); }
}
