import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SemChave } from "../comum/guardas.js";

@ApiTags("Saúde")
@Controller("api/saude")
export class SaudeController {
  @Get()
  @SemChave()
  @ApiOperation({ summary: "Diz se a API está no ar", description: "Única rota que não pede chave de API." })
  saude() {
    return { ok: true };
  }
}
