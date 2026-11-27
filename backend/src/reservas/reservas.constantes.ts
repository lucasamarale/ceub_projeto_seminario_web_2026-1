// Regras de tempo da loja: quanto dura uma reserva e o que acontece quando ela vence.
export const MINUTOS_DE_RESERVA = 30;
export const PRAZO_MS = MINUTOS_DE_RESERVA * 60 * 1000;
// Parte do preço que volta para quem deixou a peça em consignação.
export const PARTE_DO_DONO = 0.6;
// Situações de um pedido que já foi pago.
export const PAGOS = ["Pago", "Em separação", "Enviado", "Entregue"];
export const centavos = (n: number | null | undefined) => Math.round((n || 0) * 100) / 100;
