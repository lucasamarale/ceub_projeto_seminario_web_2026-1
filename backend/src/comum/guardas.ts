import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata, UseGuards, applyDecorators, createParamDecorator } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiBearerAuth, ApiResponse, ApiSecurity } from "@nestjs/swagger";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AuthService, type UsuarioDaSessao } from "../auth/auth.service.js";
import { CONFIG, type Config } from "../config.js";
import { ErroHttp, semAcesso } from "./erros.js";
import { ErroDto } from "./respostas.js";

const SEM_CHAVE = "semChave";
const EXIGE = "exige";

/** Marca a rota como aberta: não pede a chave de API. Só a verificação de saúde usa. */
export const SemChave = () => SetMetadata(SEM_CHAVE, true);

// Chave de API: identifica o cliente autorizado a falar com a API. Vale para todas as rotas.
// A comparação em tempo constante evita vazar a chave pelo tempo de resposta.
@Injectable()
export class GuardaDaChaveDeApi implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: Config, @Inject(Reflector) private readonly refletor: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    if (this.refletor.getAllAndOverride<boolean>(SEM_CHAVE, [contexto.getHandler(), contexto.getClass()])) return true;
    const req = contexto.switchToHttp().getRequest();
    const esperada = Buffer.from(this.config.apiKey);
    const recebida = Buffer.from(String(req.get("x-api-key") || ""));
    if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) throw new ErroHttp(401, "Chave de API ausente ou inválida.");
    return true;
  }
}

// Autenticação por JWT: o front manda o token no cabeçalho Authorization: Bearer.
// O token só carrega o identificador. Nome, perfil e permissões são lidos do banco a cada requisição,
// então desativar alguém ou mudar um perfil vale na requisição seguinte.
@Injectable()
export class GuardaDeAutenticacao implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: Config, @Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const req = contexto.switchToHttp().getRequest();
    const [tipo, token] = String(req.get("authorization") || "").split(" ");
    if (tipo !== "Bearer" || !token) throw new ErroHttp(401, "Token de acesso ausente.");
    let dados: jwt.JwtPayload;
    try {
      // O algoritmo é fixado: um token assinado de outro jeito (ou sem assinatura) é recusado.
      dados = jwt.verify(token, this.config.jwtSegredo, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    } catch (e: any) {
      throw new ErroHttp(401, e.name === "TokenExpiredError" ? "Sessão expirada. Entre de novo." : "Token de acesso inválido.");
    }
    const usuario = await this.auth.carregar(Number(dados.sub));
    if (!usuario) throw new ErroHttp(401, "Usuário inativo ou removido.");
    req.usuario = usuario;
    return true;
  }
}

// Autorização por funcionalidade: o perfil do usuário precisa ter uma das chaves pedidas pela rota.
@Injectable()
export class GuardaDePermissao implements CanActivate {
  constructor(@Inject(Reflector) private readonly refletor: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const chaves = this.refletor.getAllAndOverride<string[]>(EXIGE, [contexto.getHandler(), contexto.getClass()]);
    if (!chaves?.length) return true;
    const { usuario } = contexto.switchToHttp().getRequest();
    if (!chaves.some((c) => usuario.funcionalidades.includes(c))) throw semAcesso();
    return true;
  }
}

/** Rota que pede login. Com chaves, pede também que o perfil tenha pelo menos uma delas. */
export const Autenticado = (...chaves: string[]) => applyDecorators(
  SetMetadata(EXIGE, chaves),
  UseGuards(GuardaDeAutenticacao, GuardaDePermissao),
  ApiBearerAuth(),
  ApiResponse({ status: 401, description: "Token ausente, inválido ou expirado.", type: ErroDto }),
  ...(chaves.length ? [ApiResponse({ status: 403, description: `O perfil precisa ter: ${chaves.join(" ou ")}.`, type: ErroDto })] : []),
);

/** Troca as chaves pedidas em uma rota específica de um controlador que já usa @Autenticado. */
export const Exigir = (...chaves: string[]) => applyDecorators(
  SetMetadata(EXIGE, chaves),
  ApiResponse({ status: 403, description: `O perfil precisa ter: ${chaves.join(" ou ")}.`, type: ErroDto }),
);

/** Documenta no Swagger que a rota pede a chave de API. */
export const ComChaveDeApi = () => applyDecorators(
  ApiSecurity("chave-de-api"),
  ApiResponse({ status: 401, description: "Chave de API ausente ou inválida, ou token ausente, inválido ou expirado.", type: ErroDto }),
  ApiResponse({ status: 429, description: "Muitas requisições. Aguarde um minuto.", type: ErroDto }),
);

/** Injeta no método o usuário da sessão, montado pela guarda de autenticação. */
export const Usuario = createParamDecorator((_dado: unknown, contexto: ExecutionContext): UsuarioDaSessao => contexto.switchToHttp().getRequest().usuario);
