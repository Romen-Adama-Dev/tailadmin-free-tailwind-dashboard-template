import { fetchJson } from "../services/api";
import {
  applyMetaState,
  buildOrderDetailUrl,
  escapeHtml,
  formatDateTime,
  formatMoney,
  renderEmptyTableRow,
  renderStatusBadge,
} from "../utils/formatters";

const DEFAULT_SORT = "attention_oldest";
const SORT_LABELS = {
  attention_oldest: "Prioridad operativa",
  oldest: "Mas antiguo primero",
  newest: "Mas nuevo primero",
  price_desc: "Mayor importe primero",
  price_asc: "Menor importe primero",
};

const populateSelect = (selector, values = [], placeholder) => {
  const select = document.querySelector(selector);

  if (!select) {
    return;
  }

  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>${values
    .map(
      (value) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
    )
    .join("")}`;
  select.value = currentValue;
};

const formatAgeLabel = (ageHours = 0) => {
  const totalMinutes = Math.max(0, Math.round(ageHours * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min sin atender`;
  }

  if (minutes === 0) {
    return `${hours} h sin atender`;
  }

  return `${hours} h ${minutes} min sin atender`;
};

const renderImportanceBadge = (order) => {
  if (!order.needsAttention) {
    return "";
  }

  return `
    <span class="mt-2 inline-flex rounded-full bg-error-50 px-2.5 py-1 text-theme-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400">
      Importancia alta
    </span>
  `;
};

const renderOrdersTable = (orders = []) => {
  const tableBody = document.querySelector("[data-orders-table-body]");

  if (!tableBody) {
    return;
  }

  if (!orders.length) {
    tableBody.innerHTML = renderEmptyTableRow(
      8,
      "No hay pedidos que coincidan con los filtros actuales.",
    );
    return;
  }

  tableBody.innerHTML = orders
    .map((order) => {
      const rowClass = order.needsAttention
        ? "bg-error-50 dark:bg-error-500/10"
        : "";
      const receivedAt = formatDateTime(order.receivedAt || order.createdAt);
      const createdAt =
        order.createdAt && order.createdAt !== order.receivedAt
          ? formatDateTime(order.createdAt)
          : "";
      const ageLabel = order.needsAttention ? formatAgeLabel(order.ageHours) : "";

      return `
        <tr class="${rowClass}">
          <td class="px-5 py-4 sm:px-6">
            <a href="${buildOrderDetailUrl(order)}" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">${escapeHtml(
              order.numPedido,
            )}</a>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">${escapeHtml(
              order.id,
            )}</p>
            ${renderImportanceBadge(order)}
          </td>
          <td class="px-5 py-4 sm:px-6">
            <p class="text-theme-sm text-gray-700 dark:text-gray-300">${escapeHtml(
              receivedAt,
            )}</p>
            ${
              ageLabel
                ? `<p class="mt-1 text-theme-xs font-medium text-error-700 dark:text-error-400">${escapeHtml(
                    ageLabel,
                  )}</p>`
                : createdAt
                  ? `<p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">Alta: ${escapeHtml(
                      createdAt,
                    )}</p>`
                  : ""
            }
          </td>
          <td class="px-5 py-4 sm:px-6 text-theme-sm text-gray-500 dark:text-gray-400">${escapeHtml(
            order.site.label,
          )}</td>
          <td class="px-5 py-4 sm:px-6">
            <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">${escapeHtml(
              order.contactName,
            )}</p>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">${escapeHtml(
              order.contactPhone,
            )}</p>
          </td>
          <td class="px-5 py-4 sm:px-6">
            ${renderStatusBadge(order.status, order.statusKey)}
            ${
              order.needsAttention
                ? '<p class="mt-2 text-theme-xs font-medium text-error-700 dark:text-error-400">Pendiente de atencion</p>'
                : ""
            }
          </td>
          <td class="px-5 py-4 sm:px-6 text-theme-sm text-gray-500 dark:text-gray-400">${escapeHtml(
            formatMoney(order.totalAmount),
          )}</td>
          <td class="px-5 py-4 sm:px-6 text-theme-sm text-gray-500 dark:text-gray-400">${order.itemCount}</td>
          <td class="px-5 py-4 sm:px-6">
            <a href="${buildOrderDetailUrl(order)}" class="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
              Ver detalle
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
};

const readFilters = () => {
  const form = document.querySelector("[data-orders-filters]");
  const formData = new FormData(form);

  return {
    search: formData.get("search") || "",
    site: formData.get("site") || "",
    status: formData.get("status") || "",
    sort: formData.get("sort") || DEFAULT_SORT,
  };
};

const syncUrl = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const nextUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", nextUrl);
};

const applyInitialFilters = () => {
  const params = new URLSearchParams(window.location.search);
  const form = document.querySelector("[data-orders-filters]");
  if (!form) {
    return;
  }

  ["search", "site", "status", "sort"].forEach((key) => {
    const field = form.elements.namedItem(key);
    if (!field) {
      return;
    }

    if (params.get(key)) {
      field.value = params.get(key);
      return;
    }

    if (key === "sort") {
      field.value = DEFAULT_SORT;
    }
  });
};

const loadOrders = async () => {
  const filters = readFilters();
  syncUrl(filters);

  const params = new URLSearchParams(filters);
  const payload = await fetchJson(`/api/orders?${params.toString()}`);

  applyMetaState(payload.meta);
  populateSelect("[data-site-filter]", payload.filters.sites, "Todas las sedes");
  populateSelect(
    "[data-status-filter]",
    payload.filters.statuses,
    "Todos los estados",
  );

  document.querySelector("[data-site-filter]").value = filters.site;
  document.querySelector("[data-status-filter]").value = filters.status;
  document.querySelector("[data-sort-filter]").value = filters.sort;

  const importantOrders = payload.orders.filter((order) => order.needsAttention)
    .length;
  const summary = document.querySelector("[data-orders-result-summary]");
  if (summary) {
    const importantLabel = importantOrders
      ? ` ${importantOrders} marcado(s) con importancia alta.`
      : "";
    summary.textContent = `${payload.total} pedido(s) mostrados. Orden actual: ${
      SORT_LABELS[payload.sort] || SORT_LABELS[DEFAULT_SORT]
    }.${importantLabel}`;
  }

  renderOrdersTable(payload.orders);
};

const initOrdersPage = async () => {
  applyInitialFilters();
  await loadOrders();

  const filtersForm = document.querySelector("[data-orders-filters]");
  const resetButton = document.querySelector("[data-reset-filters]");
  const sortFilter = document.querySelector("[data-sort-filter]");

  filtersForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadOrders();
  });

  sortFilter?.addEventListener("change", async () => {
    await loadOrders();
  });

  resetButton?.addEventListener("click", async () => {
    filtersForm.reset();
    const sortField = filtersForm.elements.namedItem("sort");
    if (sortField) {
      sortField.value = DEFAULT_SORT;
    }
    await loadOrders();
  });
};

export default initOrdersPage;
