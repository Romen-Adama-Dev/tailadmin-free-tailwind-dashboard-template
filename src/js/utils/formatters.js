const LOCALE = "es-ES";
const CURRENCY = "EUR";

export const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const formatMoney = (value, currency = CURRENCY) =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDateTime = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const buildOrderDetailUrl = (order) => {
  const params = new URLSearchParams();

  if (order.id) {
    params.set("orderId", order.id);
  }

  if (order.numPedido) {
    params.set("numPedido", order.numPedido);
  }

  return `order-detail.html?${params.toString()}`;
};

export const statusToneClass = (statusKey = "") => {
  if (
    statusKey.includes("done") ||
    statusKey.includes("complete") ||
    statusKey.includes("entreg") ||
    statusKey.includes("ready") ||
    statusKey.includes("served") ||
    statusKey.includes("preparad")
  ) {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  if (
    statusKey.includes("cancel") ||
    statusKey.includes("reject") ||
    statusKey.includes("fail") ||
    statusKey.includes("error")
  ) {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300";
};

export const renderStatusBadge = (status, statusKey = "") =>
  `<span class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium ${statusToneClass(
    statusKey,
  )}">${escapeHtml(status || "Sin estado")}</span>`;

export const renderEmptyTableRow = (columns, message) =>
  `<tr><td colspan="${columns}" class="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">${escapeHtml(
    message,
  )}</td></tr>`;

export const sourceLabel = (source) =>
  source === "supabase"
    ? "Supabase a traves del servidor local"
    : "Modo vacio, pendiente de credenciales";

export const applyMetaState = (meta = {}) => {
  const label = sourceLabel(meta.dataSource);

  document.querySelectorAll("[data-data-source-badge]").forEach((element) => {
    element.textContent = label;
  });

  document.querySelectorAll("[data-header-source]").forEach((element) => {
    element.textContent = label;
  });

  document.querySelectorAll("[data-source-dot]").forEach((element) => {
    element.classList.remove("bg-warning-500", "bg-success-500");
    element.classList.add(meta.dataSource === "supabase" ? "bg-success-500" : "bg-warning-500");
  });

  const warningText = (meta.warnings || []).filter(Boolean).join(" ");
  document.querySelectorAll("[data-alert-region]").forEach((element) => {
    if (warningText) {
      element.textContent = warningText;
      element.classList.remove("hidden");
    } else {
      element.textContent = "";
      element.classList.add("hidden");
    }
  });
};
