const { env, hasSupabaseCredentials } = require("./config");
const { createEmptyProvider } = require("./providers/empty-provider");
const { createSupabaseProvider } = require("./providers/supabase-provider");

const createProvider = () => {
  if (env.dataSource === "empty") {
    return createEmptyProvider("Modo vacio forzado por DATA_SOURCE=empty.");
  }

  if (!hasSupabaseCredentials) {
    return createEmptyProvider(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para leer pedidos reales.",
    );
  }

  return createSupabaseProvider(env);
};

module.exports = {
  createProvider,
};
