// Sobe a API para os testes de ponta a ponta: banco descartável e limites de requisição folgados,
// porque o Cypress faz muitos logins seguidos. As variáveis são definidas aqui, e não na linha de comando,
// para o mesmo script funcionar no Windows, no macOS e no Linux.
process.env.BANCO = ":memory:";
process.env.LIMITE_POR_MINUTO = "5000";
process.env.LIMITE_LOGIN_POR_MINUTO = "1000";
await import("../dist/main.js");
