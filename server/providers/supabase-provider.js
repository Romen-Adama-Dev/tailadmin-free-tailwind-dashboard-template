const { createClient } = require("@supabase/supabase-js");

const createSupabaseProvider = (env) => {
  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let cache = {
    fetchedAt: 0,
    orders: [],
  };

  const fetchOrders = async () => {
    const now = Date.now();

    if (cache.fetchedAt && now - cache.fetchedAt < env.cacheTtlMs) {
      return {
        orders: cache.orders,
        warnings: [],
      };
    }

    const { data, error } = await client
      .from(env.supabaseOrdersTable)
      .select("*")
      .order(env.supabaseCreatedAtColumn, { ascending: false })
      .limit(env.supabaseFetchLimit);

    if (error) {
      throw error;
    }

    cache = {
      fetchedAt: now,
      orders: Array.isArray(data) ? data : [],
    };

    return {
      orders: cache.orders,
      warnings: [],
    };
  };

  const updateOrderStatus = async ({ orderId, numPedido, status }) => {
    if (!status) {
      throw new Error("Hace falta un estado destino para actualizar el pedido.");
    }

    let query = client
      .from(env.supabaseOrdersTable)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .limit(1);

    if (orderId) {
      query = query.eq("order_id", orderId);
    } else if (numPedido) {
      query = query.eq("num_pedido", numPedido);
    } else {
      throw new Error("Hace falta orderId o numPedido para actualizar el estado.");
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const updatedOrder = Array.isArray(data) ? data[0] : data;

    if (!updatedOrder) {
      throw new Error("No se encontro el pedido para actualizar su estado.");
    }

    cache = {
      fetchedAt: 0,
      orders: [],
    };

    return {
      order: updatedOrder,
      warnings: [],
    };
  };

  return {
    kind: "supabase",
    supportsOrderUpdates: true,
    listOrders: fetchOrders,
    updateOrderStatus,
  };
};

module.exports = {
  createSupabaseProvider,
};
