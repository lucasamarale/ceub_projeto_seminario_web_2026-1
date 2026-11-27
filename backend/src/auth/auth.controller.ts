import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Autenticado, ComChaveDeApi, Usuario } from "../comum/guardas.js";
import { DADOS_INVALIDOS, erro } from "../comum/respostas.js";
import { validado } from "../comum/validacao.js";
import { CONFIG, type Config } from "../config.js";
import { CadastroDto, EuDto, LoginDto, SessaoDto } from "./auth.dto.js";
import { AuthService, type UsuarioDaSessao } from "./auth.service.js";

/** Nome do cookie de sessão. */
export const COOKIE_DE_SESSAO = "ciranda_sessao";

@ApiTags("Acesso")
@ComChaveDeApi()
@Controller("api/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(CONFIG) private readonly config: Config) {}

  // Cookie de sessão, com as quatro travas:
  // HttpOnly: o JavaScript da página não lê, então um XSS não leva a sessão.
  // Secure: só viaja por HTTPS (em produção).
  // SameSite=Strict: o navegador não manda o cookie em requisição vinda de outro site, o que barra CSRF.
  // Path=/api/auth: o cookie só acompanha as rotas de acesso, não o resto da API.
  private opcoesDoCookie() {
    return { httpOnly: true, secure: this.config.cookieSeguro, sameSite: "strict" as const, path: "/api/auth" };
  }

  private responder(res: Response, sessao: Awaited<ReturnType<AuthService["entrar"]>>) {
    res.cookie(COOKIE_DE_SESSAO, sessao.renovacao, { ...this.opcoesDoCookie(), expires: sessao.expiraEm });
    return { token: sessao.token, usuario: sessao.usuario };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Entra com e-mail e senha", description: "Devolve o JWT de acesso e grava o cookie HttpOnly de sessão. Limite de 10 tentativas por minuto por IP." })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: SessaoDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiUnauthorizedResponse(erro("E-mail ou senha incorretos."))
  @ApiTooManyRequestsResponse(erro("Muitas tentativas. Aguarde um minuto."))
  async entrar(@Body(validado(LoginDto)) corpo: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.responder(res, await this.auth.entrar(corpo));
  }

  @Post("cadastro")
  @ApiOperation({ summary: "Cria uma conta", description: "A conta nova entra sempre com o perfil Cliente." })
  @ApiBody({ type: CadastroDto })
  @ApiResponse({ status: 201, type: SessaoDto })
  @ApiBadRequestResponse(DADOS_INVALIDOS)
  @ApiConflictResponse(erro("E-mail já cadastrado."))
  async cadastrar(@Body(validado(CadastroDto)) corpo: CadastroDto, @Res({ passthrough: true }) res: Response) {
    return this.responder(res, await this.auth.cadastrar(corpo));
  }

  @Post("renovar")
  @HttpCode(200)
  @ApiCookieAuth(COOKIE_DE_SESSAO)
  @ApiOperation({ summary: "Troca o cookie de sessão por um JWT novo", description: "O token do cookie é de uso único e é trocado a cada chamada. Protegida contra CSRF por SameSite=Strict, pela lista de origens e pelo cabeçalho X-API-Key." })
  @ApiResponse({ status: 200, type: SessaoDto })
  @ApiUnauthorizedResponse(erro("Sem cookie, cookie vencido ou já usado."))
  async renovar(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.responder(res, await this.auth.renovar(req.cookies?.[COOKIE_DE_SESSAO]));
    } catch (erro) {
      res.clearCookie(COOKIE_DE_SESSAO, this.opcoesDoCookie());
      throw erro;
    }
  }

  @Post("sair")
  @HttpCode(204)
  @ApiCookieAuth(COOKIE_DE_SESSAO)
  @ApiOperation({ summary: "Encerra a sessão", description: "Apaga a sessão no banco e o cookie no navegador." })
  @ApiResponse({ status: 204 })
  async sair(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.sair(req.cookies?.[COOKIE_DE_SESSAO]);
    res.clearCookie(COOKIE_DE_SESSAO, this.opcoesDoCookie());
  }

  @Get("eu")
  @Autenticado()
  @ApiOperation({ summary: "Quem está logado", description: "Lê o usuário, o perfil e as funcionalidades direto do banco." })
  @ApiResponse({ status: 200, type: EuDto })
  eu(@Usuario() usuario: UsuarioDaSessao) {
    return { usuario };
  }
}
