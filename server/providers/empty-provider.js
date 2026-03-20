const createEmptyProvider = (reason = "Sin conexion configurada a Supabase.") => ({
  kind: "empty",
  supportsOrderUpdates: false,
  async listOrders() {
    return {
      orders: [],
      warnings: [reason],
    };
  },
  async updateOrderStatus() {
    throw new Error("La actualizacion de estados no esta disponible en modo vacio.");
  },
});

module.exports = {
  createEmptyProvider,
};
