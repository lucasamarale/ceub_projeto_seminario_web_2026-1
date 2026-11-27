import fs from "node:fs";
import { afterEach } from "vitest";
import { abertos } from "./apoio.js";

// Depois de cada teste, fecha as aplicações abertas e apaga os bancos temporários.
// No Windows o arquivo do banco pode continuar preso por um instante depois de fechado (EPERM ou EBUSY):
// a remoção tenta de novo algumas vezes e, se ainda assim não der, o arquivo fica na pasta temporária do sistema.
// Sobra de arquivo temporário não é motivo para um teste falhar.
afterEach(async () => {
  for (const { app, db, arquivo } of abertos.splice(0)) {
    db.close();
    await app.close();
    for (const sufixo of ["", "-journal", "-wal", "-shm"]) {
      try {
        fs.rmSync(arquivo + sufixo, { force: true, maxRetries: 5, retryDelay: 100 });
      } catch (erro) {
        if (!["EPERM", "EBUSY", "EACCES"].includes(erro.code)) throw erro;
      }
    }
  }
});
