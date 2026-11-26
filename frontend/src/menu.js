// Cada item do menu aponta a funcionalidade que o perfil precisa ter para vê-lo.
// O grupo separa o que é da loja (comprar e vender) do que é de gestão (bastidores e cadastros).
export const MENU = [
  { rota: "/catalogo", grupo: "Loja", rotulo: "Catálogo", exige: "catalogo.ver" },
  { rota: "/sacola", grupo: "Loja", rotulo: "Sacola", exige: "sacola.usar" },
  { rota: "/pedidos", grupo: "Loja", rotulo: "Pedidos", exige: "sacola.usar" },
  { rota: "/vender", grupo: "Loja", rotulo: "Vender", exige: "consignacao.publicar" },
  { rota: "/bastidores", grupo: "Gestão", rotulo: "Bastidores", exige: "bastidores.ver" },
  { rota: "/pecas", grupo: "Gestão", rotulo: "Peças", exige: "pecas.gerenciar" },
  { rota: "/usuarios", grupo: "Gestão", rotulo: "Usuários", exige: "usuarios.gerenciar" },
  { rota: "/perfis", grupo: "Gestão", rotulo: "Perfis", exige: "perfis.gerenciar" },
  { rota: "/funcionalidades", grupo: "Gestão", rotulo: "Funcionalidades", exige: "funcionalidades.gerenciar" },
];
export const CATEGORIAS = ["Camisetas e blusas", "Camisas", "Vestidos", "Saias", "Calças jeans", "Jaquetas e casacos", "Calçados", "Bolsas e acessórios"];
export const CONSERVACOES = ["Novo com etiqueta", "Ótimo estado", "Bom estado", "Com marcas de uso"];
export const SITUACOES = ["Disponível", "Reservada", "Vendida", "Em análise", "Recusada"];
// Parte do preço que volta para quem deixa a peça em consignação. O servidor usa o mesmo valor.
export const PARTE_DO_DONO = 0.6;
export const FOTOS = ["camiseta-listrada", "camiseta-verde", "camiseta-bolso", "camiseta-preta", "camiseta-flor", "camiseta-vinho", "camisa-linho", "camisa-estampada", "moletom-clube", "trico-caramelo", "jaqueta-jeans", "jaqueta-caqui", "calca-jeans", "calca-escura", "saia-verde", "vestido-floral", "vestido-linho", "tenis-lona", "bolsa-couro"];
export const brl = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const hora = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const dia = (ms) => new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
export const litros = (n) => `${Number(n).toLocaleString("pt-BR")} L`;
export const quilos = (n) => `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
