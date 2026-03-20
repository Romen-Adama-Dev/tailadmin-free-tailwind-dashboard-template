const path = require("path");
const express = require("express");

const { env } = require("./config");
const { createProvider } = require("./provider");
const {
  filterOrders,
  findOrder,
  getAvailableFilters,
  getDerivedOrder,
  buildOperationalSummary,
  sortOrders,
} = require("./lib/order-utils");
const { getWorkflowAction } = require("./lib/order-workflow");

const app = express();
const provider = createProvider();
const buildDirectory = path.resolve(__dirname, "..", "build");

app.use(express.json());
app.use(express.static(buildDirectory));

const buildMeta = (warnings = []) => ({
  appName: env.appName,
  dataSource: provider.kind,
  timeZone: env.timeZone,
  currency: env.currency,
  orderActionsEnabled: Boolean(provider.supportsOrderUpdates),
  warnings,
});

const loadOrders = async () => {
  const response = await provider.listOrders();
  const derivedOrders = response.orders.map((order) => getDerivedOrder(order, env.sites));

  return {
    orders: derivedOrders,
    warnings: response.warnings || [],
  };
};

app.get("/api/health", async (request, response) => {
  response.json({
    ok: true,
    meta: buildMeta(),
  });
});

app.get("/api/dashboard/summary", async (request, response) => {
  try {
    const { orders, warnings } = await loadOrders();
    const filteredOrders = filterOrders(orders, {
      site: request.query.site,
      status: request.query.status,
    });
    const summary = buildOperationalSummary(filteredOrders, env.sites);

    response.json({
      meta: buildMeta(warnings),
      summary,
      filters: getAvailableFilters(orders, env.sites),
    });
  } catch (error) {
    response.status(500).json({
      meta: buildMeta([error.message]),
      error: "No se pudo cargar el resumen operativo.",
    });
  }
});

app.get("/api/orders", async (request, response) => {
  try {
    const { orders, warnings } = await loadOrders();
    const filteredOrders = filterOrders(orders, {
      search: request.query.search,
      site: request.query.site,
      status: request.query.status,
    });
    const sort = request.query.sort || "attention_oldest";
    const sortedOrders = sortOrders(filteredOrders, sort);

    response.json({
      meta: buildMeta(warnings),
      total: sortedOrders.length,
      sort,
      filters: getAvailableFilters(orders, env.sites),
      orders: sortedOrders,
    });
  } catch (error) {
    response.status(500).json({
      meta: buildMeta([error.message]),
      error: "No se pudo cargar el listado de pedidos.",
    });
  }
});

app.get("/api/orders/lookup", async (request, response) => {
  try {
    const orderId = request.query.orderId;
    const numPedido = request.query.numPedido;

    if (!orderId && !numPedido) {
      response.status(400).json({
        meta: buildMeta(),
        error: "Hace falta orderId o numPedido.",
      });
      return;
    }

    const { orders, warnings } = await loadOrders();
    const order = findOrder(orders, { orderId, numPedido });

    if (!order) {
      response.status(404).json({
        meta: buildMeta(warnings),
        error: "Pedido no encontrado.",
      });
      return;
    }

    response.json({
      meta: buildMeta(warnings),
      order,
    });
  } catch (error) {
    response.status(500).json({
      meta: buildMeta([error.message]),
      error: "No se pudo cargar el detalle del pedido.",
    });
  }
});

app.post("/api/orders/status", async (request, response) => {
  try {
    const orderId = request.body?.orderId;
    const numPedido = request.body?.numPedido;
    const actionId = request.body?.action;

    if (!orderId && !numPedido) {
      response.status(400).json({
        meta: buildMeta(),
        error: "Hace falta orderId o numPedido.",
      });
      return;
    }

    const action = getWorkflowAction(actionId);
    if (!action) {
      response.status(400).json({
        meta: buildMeta(),
        error: "La accion solicitada no es valida.",
      });
      return;
    }

    const { orders, warnings } = await loadOrders();
    const currentOrder = findOrder(orders, { orderId, numPedido });

    if (!currentOrder) {
      response.status(404).json({
        meta: buildMeta(warnings),
        error: "Pedido no encontrado.",
      });
      return;
    }

    const isActionAllowed = currentOrder.availableActions.some(
      (availableAction) => availableAction.id === action.id,
    );

    if (!isActionAllowed) {
      response.status(409).json({
        meta: buildMeta(warnings),
        error: "La accion no es valida para el estado actual del pedido.",
      });
      return;
    }

    const updateResult = await provider.updateOrderStatus({
      orderId: currentOrder.raw?.order_id || currentOrder.id,
      numPedido: currentOrder.raw?.num_pedido || currentOrder.numPedido,
      status: action.nextStatus,
    });

    response.json({
      meta: buildMeta(updateResult.warnings || warnings),
      order: getDerivedOrder(updateResult.order, env.sites),
    });
  } catch (error) {
    response.status(500).json({
      meta: buildMeta([error.message]),
      error: "No se pudo actualizar el estado del pedido.",
    });
  }
});

app.get("/api/sites", async (request, response) => {
  try {
    const { orders, warnings } = await loadOrders();
    const siteSummary = buildOperationalSummary(orders, env.sites);

    response.json({
      meta: buildMeta(warnings),
      sites: siteSummary.siteBreakdown,
    });
  } catch (error) {
    response.status(500).json({
      meta: buildMeta([error.message]),
      error: "No se pudo cargar el resumen de sedes.",
    });
  }
});

app.get(["/", "/orders", "/sites"], (request, response) => {
  const routeFile =
    request.path === "/orders"
      ? "orders.html"
      : request.path === "/sites"
        ? "sites.html"
        : "index.html";

  response.sendFile(path.join(buildDirectory, routeFile));
});

app.get("/order/:orderLookup", (request, response) => {
  response.sendFile(path.join(buildDirectory, "order-detail.html"));
});

app.use((request, response) => {
  response.status(404).sendFile(path.join(buildDirectory, "404.html"));
});

app.listen(env.port, env.host, () => {
  console.log(
    `${env.appName} escuchando en http://${env.host}:${env.port} (${provider.kind})`,
  );
});
