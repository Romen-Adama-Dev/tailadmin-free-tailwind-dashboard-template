const {
  getWorkflowActionsForStatus,
  getWorkflowDisplayStatus,
} = require("./order-workflow");

const KNOWN_STATUS_GROUPS = {
  resolved: ["done", "completed", "completado", "entregado", "served", "ready"],
  cancelled: ["cancel", "cancelado", "rechaz", "failed", "error"],
  inProgress: [
    "pend",
    "nuevo",
    "new",
    "prep",
    "proces",
    "valid",
    "stock",
    "curso",
  ],
};
const ATTENTION_THRESHOLD_HOURS = 8;

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value).toLowerCase();
    } catch (error) {
      return "";
    }
  }

  return String(value).trim().toLowerCase();
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const getObjectValue = (value, keys) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return pickFirst(...keys.map((key) => value[key]));
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const parseAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

const getOrderId = (order) =>
  pickFirst(
    order?.orderId,
    order?.order_id,
    order?.id,
    order?.numPedido,
    order?.num_pedido,
    order?.numeroPedido,
  );

const getOrderNumber = (order) =>
  pickFirst(
    order?.numPedido,
    order?.num_pedido,
    order?.numeroPedido,
    order?.orderId,
    order?.order_id,
    order?.id,
  );

const getRawStatusValue = (order) =>
  pickFirst(order?.status, order?.state, order?.estado);

const getStatus = (order) => getWorkflowDisplayStatus(getRawStatusValue(order));

const getStatusKey = (status) => normalizeText(status);
const getDateTimestamp = (date) => (date instanceof Date ? date.getTime() : 0);

const statusMatches = (status, groupName) => {
  const normalizedStatus = getStatusKey(status);
  return KNOWN_STATUS_GROUPS[groupName].some((token) =>
    normalizedStatus.includes(token),
  );
};

const isResolvedOrder = (status) => statusMatches(status, "resolved");

const isCancelledOrder = (status) => statusMatches(status, "cancelled");

const isOpenOrder = (status) =>
  !isResolvedOrder(status) && !isCancelledOrder(status);

const isNewOrderStatus = (rawStatus) => {
  const normalizedStatus = normalizeText(rawStatus);
  return !normalizedStatus || normalizedStatus === "new" || normalizedStatus === "nuevo";
};

const resolveSiteFromCatalog = (siteCandidate, siteCatalog) => {
  const normalizedCandidate = normalizeText(siteCandidate);

  return (
    siteCatalog.find((site) => {
      const options = [site.code, site.name, site.label, site.city];
      return options.some(
        (option) => option && normalizeText(option) === normalizedCandidate,
      );
    }) || null
  );
};

const getPickupSite = (order, siteCatalog = []) => {
  const siteValue = pickFirst(order?.pickupSite, order?.pickup_site);
  const siteCode =
    getObjectValue(siteValue, ["code", "siteCode", "id"]) ||
    order?.pickupSiteCode ||
    order?.pickup_site_code ||
    (typeof siteValue === "string" ? siteValue : undefined);
  const siteName =
    getObjectValue(siteValue, ["name", "siteName", "label", "description"]) ||
    order?.pickupSiteName ||
    order?.pickup_site_name ||
    (typeof siteValue === "string" ? siteValue : undefined);

  const matchedCatalogSite =
    resolveSiteFromCatalog(siteCode, siteCatalog) ||
    resolveSiteFromCatalog(siteName, siteCatalog);

  if (matchedCatalogSite) {
    return {
      code: matchedCatalogSite.code,
      name: matchedCatalogSite.name,
      label: matchedCatalogSite.label,
      description: matchedCatalogSite.description,
      active: matchedCatalogSite.active,
      raw: siteValue,
    };
  }

  if (siteCode || siteName) {
    const code =
      typeof siteCode === "string" && siteCode.trim().length <= 6
        ? siteCode.trim()
        : undefined;
    const name = siteName || siteCode;

    return {
      code,
      name,
      label: code && name && !normalizeText(name).includes(normalizeText(code))
        ? `${name} / ${code}`
        : name,
      description: "Sede detectada en el histórico.",
      active: true,
      raw: siteValue,
    };
  }

  return {
    code: "NA",
    name: "Sin sede",
    label: "Sin sede",
    description: "Pedido sin sede asociada.",
    active: false,
    raw: siteValue,
  };
};

const extractTotalAmount = (order) => {
  const totals = order?.totals;
  const candidates = [
    getObjectValue(totals, [
      "total",
      "grandTotal",
      "totalAmount",
      "importeTotal",
      "amount",
      "final",
      "withTax",
      "estimatedTotal",
      "estimated_total",
    ]),
    order?.total,
    order?.amount,
    order?.importeTotal,
  ];

  const parsedAmounts = candidates.map(parseAmount).filter((value) => value > 0);
  return parsedAmounts[0] || 0;
};

const extractItemCount = (order) => {
  if (Array.isArray(order?.items)) {
    return order.items.length;
  }

  return Number(
    pickFirst(
      getObjectValue(order?.totals, [
        "itemCount",
        "itemsCount",
        "units",
        "lineCount",
        "line_count",
        "totalQuantity",
        "total_quantity",
      ]),
      order?.itemCount,
      order?.lineCount,
      order?.line_count,
      order?.total_quantity,
    ) || 0,
  );
};

const getContactName = (order) =>
  pickFirst(
    getObjectValue(order?.contact, ["name", "fullName", "person", "customer"]),
    order?.customerName,
    order?.cliente,
  ) || "Sin contacto";

const getContactPhone = (order) =>
  pickFirst(
    getObjectValue(order?.contact, [
      "phoneDisplay",
      "phone_display",
      "phone",
      "telefono",
      "mobile",
    ]),
    order?.contact_phone_display,
    order?.contact_phone,
    order?.phone,
    order?.telefono,
  ) || "Sin telefono";

const getOrderSource = (order) => {
  const sourceValue = pickFirst(order?.source, order?.origin, order?.canal);

  if (!sourceValue) {
    return "Kiosko";
  }

  if (typeof sourceValue === "string") {
    return titleCase(sourceValue);
  }

  if (typeof sourceValue === "object") {
    return (
      pickFirst(
        sourceValue.channel,
        sourceValue.name,
        sourceValue.app,
        sourceValue.appVersion,
      ) || "Kiosko"
    );
  }

  return "Kiosko";
};

const getNotificationState = (order) => {
  const notificationValue = pickFirst(
    order?.notification,
    order?.notification_status,
  );

  if (notificationValue === null || notificationValue === undefined) {
    return "Sin registro";
  }

  if (typeof notificationValue === "string") {
    return titleCase(notificationValue);
  }

  if (typeof notificationValue === "object") {
    return pickFirst(
      notificationValue.status,
      notificationValue.state,
      notificationValue.channel,
      "Registrada",
    );
  }

  return "Registrada";
};

const getStockValidationState = (order) => {
  const stockValidationValue = pickFirst(
    order?.stockValidation,
    order?.stock_validation,
  );

  if (stockValidationValue === null || stockValidationValue === undefined) {
    return "Sin validar";
  }

  if (typeof stockValidationValue === "string") {
    return titleCase(stockValidationValue);
  }

  if (typeof stockValidationValue === "object") {
    return pickFirst(
      stockValidationValue.status,
      stockValidationValue.state,
      stockValidationValue.result,
      stockValidationValue.allItemsAvailable === true ? "Validado" : undefined,
      stockValidationValue.allItemsAvailable === false
        ? "Incidencia"
        : undefined,
      "Validado",
    );
  }

  return "Validado";
};

const getDerivedOrder = (order, siteCatalog = []) => {
  const createdAtDate = parseDate(order?.createdAt || order?.created_at);
  const receivedAt = order?.receivedAt || order?.received_at || order?.createdAt || order?.created_at || null;
  const receivedAtDate = parseDate(receivedAt);
  const updatedAt = order?.updatedAt || order?.updated_at || null;
  const rawStatus = getRawStatusValue(order);
  const status = getStatus(order);
  const site = getPickupSite(order, siteCatalog);
  const ageHours =
    receivedAtDate instanceof Date
      ? Math.max(0, (Date.now() - receivedAtDate.getTime()) / (1000 * 60 * 60))
      : 0;
  const needsAttention = isNewOrderStatus(rawStatus) && ageHours >= ATTENTION_THRESHOLD_HOURS;

  return {
    id: String(getOrderId(order) || ""),
    numPedido: getOrderNumber(order) || "Sin numero",
    statusValue: rawStatus || "",
    status,
    statusKey: getStatusKey(status),
    createdAt: order?.createdAt || order?.created_at || null,
    createdAtDate,
    receivedAt,
    receivedAtDate,
    updatedAt,
    updatedAtDate: parseDate(updatedAt),
    site,
    totalAmount: extractTotalAmount(order),
    itemCount: extractItemCount(order),
    contactName: getContactName(order),
    contactPhone: getContactPhone(order),
    notes: order?.notes || "",
    source: getOrderSource(order),
    notificationState: getNotificationState(order),
    stockValidationState: getStockValidationState(order),
    isOpen: isOpenOrder(status),
    needsAttention,
    attentionThresholdHours: ATTENTION_THRESHOLD_HOURS,
    ageHours,
    availableActions: getWorkflowActionsForStatus(rawStatus),
    raw: order,
  };
};

const sameDayKey = (date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

const monthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const buildRecentDaySeries = (orders, days = 14) => {
  const seriesMap = new Map();
  const labels = [];
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const currentDate = new Date(now);
    currentDate.setUTCDate(now.getUTCDate() - index);
    const key = sameDayKey(currentDate);

    labels.push(
      currentDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
    );
    seriesMap.set(key, 0);
  }

  orders.forEach((order) => {
    if (!order.createdAtDate) {
      return;
    }

    const key = sameDayKey(order.createdAtDate);
    if (seriesMap.has(key)) {
      seriesMap.set(key, seriesMap.get(key) + 1);
    }
  });

  return {
    categories: labels,
    data: Array.from(seriesMap.values()),
  };
};

const buildMonthlySeries = (orders, months = 6) => {
  const createdMap = new Map();
  const resolvedMap = new Map();
  const categories = [];
  const now = new Date();

  for (let index = months - 1; index >= 0; index -= 1) {
    const currentDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    const key = monthKey(currentDate);

    categories.push(
      currentDate.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    );
    createdMap.set(key, 0);
    resolvedMap.set(key, 0);
  }

  orders.forEach((order) => {
    if (!order.createdAtDate) {
      return;
    }

    const key = monthKey(order.createdAtDate);
    if (createdMap.has(key)) {
      createdMap.set(key, createdMap.get(key) + 1);
      if (statusMatches(order.status, "resolved")) {
        resolvedMap.set(key, resolvedMap.get(key) + 1);
      }
    }
  });

  return {
    categories,
    created: Array.from(createdMap.values()),
    resolved: Array.from(resolvedMap.values()),
  };
};

const buildStatusBreakdown = (orders) => {
  const statusMap = new Map();

  orders.forEach((order) => {
    const label = order.status || "Sin estado";
    statusMap.set(label, (statusMap.get(label) || 0) + 1);
  });

  return Array.from(statusMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      key: getStatusKey(label),
    }))
    .sort((left, right) => right.count - left.count);
};

const buildSiteBreakdown = (orders, siteCatalog = []) => {
  const siteMap = new Map();

  siteCatalog.forEach((site) => {
    siteMap.set(site.label, {
      code: site.code,
      name: site.name,
      label: site.label,
      description: site.description,
      totalOrders: 0,
      openOrders: 0,
      completedOrders: 0,
      lastOrderAt: null,
      active: site.active,
    });
  });

  orders.forEach((order) => {
    const siteLabel = order.site.label;
    const siteSummary = siteMap.get(siteLabel) || {
      code: order.site.code,
      name: order.site.name,
      label: siteLabel,
      description: order.site.description,
      totalOrders: 0,
      openOrders: 0,
      completedOrders: 0,
      lastOrderAt: null,
      active: order.site.active,
    };

    siteSummary.totalOrders += 1;

    if (statusMatches(order.status, "resolved")) {
      siteSummary.completedOrders += 1;
    } else if (!statusMatches(order.status, "cancelled")) {
      siteSummary.openOrders += 1;
    }

    if (
      order.createdAtDate &&
      (!siteSummary.lastOrderAt ||
        order.createdAtDate.getTime() > siteSummary.lastOrderAt.getTime())
    ) {
      siteSummary.lastOrderAt = order.createdAtDate;
    }

    siteMap.set(siteLabel, siteSummary);
  });

  return Array.from(siteMap.values()).sort(
    (left, right) => right.totalOrders - left.totalOrders,
  );
};

const buildOperationalSummary = (orders, siteCatalog = []) => {
  const sortedOrders = [...orders].sort((left, right) => {
    const leftTimestamp = left.createdAtDate ? left.createdAtDate.getTime() : 0;
    const rightTimestamp = right.createdAtDate ? right.createdAtDate.getTime() : 0;
    return rightTimestamp - leftTimestamp;
  });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const totalOrders = sortedOrders.length;
  const newOrders = sortedOrders.filter(
    (order) => order.createdAtDate && order.createdAtDate >= dayAgo,
  ).length;
  const completedOrders = sortedOrders.filter((order) =>
    statusMatches(order.status, "resolved"),
  ).length;
  const cancelledOrders = sortedOrders.filter((order) =>
    statusMatches(order.status, "cancelled"),
  ).length;
  const openOrders = sortedOrders.filter(
    (order) =>
      !statusMatches(order.status, "resolved") &&
      !statusMatches(order.status, "cancelled"),
  ).length;
  const activeSites = buildSiteBreakdown(sortedOrders, siteCatalog).filter(
    (site) => site.totalOrders > 0 || site.active,
  ).length;

  const currentMonthRevenue = sortedOrders.reduce((sum, order) => {
    if (
      order.createdAtDate &&
      order.createdAtDate.getUTCFullYear() === now.getUTCFullYear() &&
      order.createdAtDate.getUTCMonth() === now.getUTCMonth()
    ) {
      return sum + order.totalAmount;
    }

    return sum;
  }, 0);

  const completionRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return {
    kpis: {
      totalOrders,
      newOrders,
      openOrders,
      completedOrders,
      cancelledOrders,
      activeSites,
      currentMonthRevenue,
      completionRate,
    },
    recentOrders: sortedOrders.slice(0, 6),
    statusBreakdown: buildStatusBreakdown(sortedOrders),
    siteBreakdown: buildSiteBreakdown(sortedOrders, siteCatalog),
    charts: {
      ordersByDay: buildRecentDaySeries(sortedOrders, 14),
      monthly: buildMonthlySeries(sortedOrders, 6),
    },
  };
};

const filterOrders = (orders, filters = {}) => {
  const searchTerm = normalizeText(filters.search);
  const statusTerm = normalizeText(filters.status);
  const siteTerm = normalizeText(filters.site);

  return orders.filter((order) => {
    const matchesStatus =
      !statusTerm || normalizeText(order.status) === statusTerm;
    const matchesSite =
      !siteTerm ||
      [order.site.code, order.site.name, order.site.label].some(
        (value) => normalizeText(value) === siteTerm,
      );

    if (!matchesStatus || !matchesSite) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const searchableText = [
      order.id,
      order.numPedido,
      order.notes,
      order.contactName,
      order.contactPhone,
      order.site.label,
      order.source,
      order.notificationState,
      order.stockValidationState,
    ]
      .filter(Boolean)
      .join(" ");

    return normalizeText(searchableText).includes(searchTerm);
  });
};

const compareByReceivedAt = (left, right, direction = "asc") => {
  const leftTimestamp = getDateTimestamp(left.receivedAtDate || left.createdAtDate);
  const rightTimestamp = getDateTimestamp(right.receivedAtDate || right.createdAtDate);
  return direction === "asc"
    ? leftTimestamp - rightTimestamp
    : rightTimestamp - leftTimestamp;
};

const sortOrders = (orders, sortKey = "attention_oldest") => {
  const sortedOrders = [...orders];

  sortedOrders.sort((left, right) => {
    if (sortKey === "price_asc") {
      if (left.totalAmount !== right.totalAmount) {
        return left.totalAmount - right.totalAmount;
      }

      return compareByReceivedAt(left, right, "asc");
    }

    if (sortKey === "price_desc") {
      if (left.totalAmount !== right.totalAmount) {
        return right.totalAmount - left.totalAmount;
      }

      return compareByReceivedAt(left, right, "asc");
    }

    if (sortKey === "oldest") {
      return compareByReceivedAt(left, right, "asc");
    }

    if (sortKey === "newest") {
      return compareByReceivedAt(left, right, "desc");
    }

    const getPriorityRank = (order) => {
      if (order.needsAttention) {
        return 0;
      }

      if (isNewOrderStatus(order.statusValue)) {
        return 1;
      }

      if (order.isOpen) {
        return 2;
      }

      return 3;
    };

    const rankDifference = getPriorityRank(left) - getPriorityRank(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return compareByReceivedAt(left, right, "asc");
  });

  return sortedOrders;
};

const getAvailableFilters = (orders, siteCatalog = []) => ({
  statuses: buildStatusBreakdown(orders).map((status) => status.label),
  sites: buildSiteBreakdown(orders, siteCatalog).map((site) => site.label),
});

const findOrder = (orders, lookup = {}) =>
  orders.find((order) => {
    const matchesId = lookup.orderId
      ? String(order.id) === String(lookup.orderId)
      : false;
    const matchesNumber = lookup.numPedido
      ? String(order.numPedido) === String(lookup.numPedido)
      : false;

    return matchesId || matchesNumber;
  }) || null;

module.exports = {
  filterOrders,
  findOrder,
  getAvailableFilters,
  getDerivedOrder,
  getStatusKey,
  buildOperationalSummary,
  sortOrders,
  titleCase,
};
