// Copia o SQL das migrations do Prisma para um arquivo TypeScript.
// Motivo: o banco de demonstração é descartável e nasce vazio a cada vez que a API sobe (inclusive na Vercel, onde
// não dá para rodar o "prisma migrate deploy" antes). A API então aplica estas mesmas migrations ao iniciar.
// Rode "npm run migracoes:empacotar" depois de criar uma migration. Um teste falha se você esquecer.
import fs from "node:fs";
import path from "node:path";

const pasta = path.resolve(import.meta.dirname, "../prisma/migrations");
export function lerMigracoes() {
  return fs.readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((nome) => ({ nome, sql: fs.readFileSync(path.join(pasta, nome, "migration.sql"), "utf8").replaceAll("\r\n", "\n") }));
}
export function gerarArquivo() {
  return `// Arquivo gerado por scripts/empacotar-migracoes.mjs a partir de prisma/migrations. Não edite à mão.
export const MIGRACOES: { nome: string; sql: string }[] = ${JSON.stringify(lerMigracoes(), null, 2)};
`;
}
if (process.argv[1] === import.meta.filename) {
  const destino = path.resolve(import.meta.dirname, "../src/banco/migracoes.ts");
  fs.writeFileSync(destino, gerarArquivo());
  console.log(`${lerMigracoes().length} migration(s) empacotada(s) em src/banco/migracoes.ts`);
}
