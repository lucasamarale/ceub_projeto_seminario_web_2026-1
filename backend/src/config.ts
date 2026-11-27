import os from "node:os";
import path from "node:path";

export interface Config {
  porta: number;
  jwtSegredo: string;
  apiKey: string;
  corsOrigens: string[];
  banco: string;
  tokenExpiraEm: string;
  sessaoDias: number;
  limitePorMinuto: number;
  limiteLoginPorMinuto: number;
  custoDoHash: number;
  agora: () => number;
  atrasDeProxy: boolean;
  cookieSeguro: boolean;
}

/** Nome do provedor de configuração dentro do Nest. */
export const CONFIG = "CONFIG";

// Configuração lida do ambiente (gestão de segredos): nenhum segredo fica no código nem no repositório.
// Os padrões abaixo só servem para desenvolvimento, e em produção a API se recusa a subir sem os segredos.
export function lerConfig(env: Record<string, string | undefined> = process.env): Config {
  const producao = env.NODE_ENV === "production";
  const naVercel = !!env.VERCEL;
  const config: Config = {
    porta: Number(env.PORT) || 3333,
    jwtSegredo: env.JWT_SEGREDO || "segredo-de-desenvolvimento",
    apiKey: env.API_KEY || "ciranda-dev-key",
    corsOrigens: (env.CORS_ORIGENS || "http://localhost:5173,http://localhost:4173").split(",").map((o) => o.trim()).filter(Boolean),
    // ":memory:" quer dizer banco descartável: um arquivo temporário, novo a cada vez que a API sobe.
    banco: env.BANCO || ":memory:",
    tokenExpiraEm: env.TOKEN_EXPIRA_EM || "30m",
    sessaoDias: Number(env.SESSAO_DIAS) || 7,
    limitePorMinuto: Number(env.LIMITE_POR_MINUTO) || 120,
    limiteLoginPorMinuto: Number(env.LIMITE_LOGIN_POR_MINUTO) || 10,
    custoDoHash: Number(env.CUSTO_DO_HASH) || 10,
    // Relógio trocável: os testes adiantam o tempo para ver a reserva vencer.
    agora: () => Date.now(),
    // Atrás de um proxy (Vercel, por exemplo), o IP real do visitante vem no cabeçalho X-Forwarded-For.
    atrasDeProxy: env.ATRAS_DE_PROXY === "1" || naVercel,
    // O cookie de sessão só viaja por HTTPS em produção. Em desenvolvimento, o localhost usa HTTP.
    cookieSeguro: producao || naVercel,
  };
  // Na Vercel, o próprio endereço do site entra na lista do CORS sem precisar configurar.
  for (const host of [env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL]) {
    if (host && !config.corsOrigens.includes(`https://${host}`)) config.corsOrigens.push(`https://${host}`);
  }
  if (producao && (!env.JWT_SEGREDO || !env.API_KEY)) {
    throw new Error("Em produção, defina JWT_SEGREDO e API_KEY no ambiente.");
  }
  return config;
}

let contador = 0;
/** Endereço do SQLite para o Prisma. Banco descartável vira um arquivo novo na pasta temporária do sistema. */
export function enderecoDoBanco(banco: string): string {
  if (banco.startsWith("file:")) return banco;
  const arquivo = banco === ":memory:" ? path.join(os.tmpdir(), `ciranda-${process.pid}-${Date.now()}-${contador++}.db`) : path.resolve(banco);
  // No Windows o caminho vem com barra invertida. O endereço do banco usa sempre a barra normal.
  return `file:${arquivo.replaceAll("\\", "/")}`;
}
