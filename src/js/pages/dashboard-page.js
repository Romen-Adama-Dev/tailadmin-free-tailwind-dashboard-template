import chart01 from "../components/charts/chart-01";
import chart02 from "../components/charts/chart-02";
import chart03 from "../components/charts/chart-03";
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

const setMetricValue = (key, value) => {
  document.querySelectorAll(`[data-kpi-value="${key}"]`).forEach((element) => {
    element.textContent = value ?? "0";
  });
};

const setMoneyValue = (key, value) => {
  document.querySelectorAll(`[data-kpi-money="${key}"]`).forEach((element) => {
    element.textContent = formatMoney(value);
  });
};

const renderRecentOrders = (orders = []) => {
  const tableBody = document.querySelector("[data-recent-orders-body]");

  if (!tableBody) {
    return;
  }

  if (!orders.length) {
    tableBody.innerHTML = renderEmptyTableRow(
      5,
      "No hay pedidos disponibles todavia.",
    );
    return;
  }

  tableBody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td class="py-3">
            <a href="${buildOrderDetailUrl(order)}" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              ${escapeHtml(order.numPedido)}
            </a>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">${escapeHtml(
              formatDateTime(order.createdAt),
            )}</p>
          </td>
          <td class="py-3">
            <p class="text-theme-sm text-gray-800 dark:text-white/90">${escapeHtml(
              order.contactName,
            )}</p>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">${escapeHtml(
              order.contactPhone,
            )}</p>
          </td>
          <td class="py-3">
            <p class="text-theme-sm text-gray-500 dark:text-gray-400">${escapeHtml(
              order.site.label,
            )}</p>
          </td>
          <td class="py-3">${renderStatusBadge(order.status, order.statusKey)}</td>
          <td class="py-3 text-theme-sm text-gray-500 dark:text-gray-400">${escapeHtml(
            formatMoney(order.totalAmount),
          )}</td>
        </tr>
      `,
    )
    .join("");
};

const renderSiteBreakdown = (sites = []) => {
  const container = document.querySelector("[data-site-breakdown]");

  if (!container) {
    return;
  }

  const totalOrders = sites.reduce((sum, site) => sum + site.totalOrders, 0);

  container.innerHTML = sites
    .filter((site) => site.totalOrders > 0 || site.active)
    .map((site) => {
      const percentage = totalOrders
        ? Math.round((site.totalOrders / totalOrders) * 100)
        : 0;

      return `
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">${escapeHtml(
              site.label,
            )}</p>
            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
              ${escapeHtml(`${site.totalOrders} pedidos - ${site.openOrders} abiertos`)}
            </span>
          </div>
          <div class="flex w-full max-w-[140px] items-center gap-3">
            <div class="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
              <div class="absolute left-0 top-0 flex h-full rounded-sm bg-brand-500" style="width:${percentage}%"></div>
            </div>
            <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">${percentage}%</p>
          </div>
        </div>
      `;
    })
    .join("");
};

const renderStatusBreakdown = (statuses = []) => {
  const container = document.querySelector("[data-status-breakdown]");

  if (!container) {
    return;
  }

  container.innerHTML = statuses
    .slice(0, 4)
    .map(
      (status) => `
        <div class="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${escapeHtml(
              status.label,
            )}</span>
            <span class="text-sm font-semibold text-gray-800 dark:text-white/90">${status.count}</span>
          </div>
        </div>
      `,
    )
    .join("");
};

const renderDashboard = async () => {
  const payload = await fetchJson("/api/dashboard/summary");

  applyMetaState(payload.meta);

  const { kpis, recentOrders, siteBreakdown, statusBreakdown, charts } =
    payload.summary;

  setMetricValue("totalOrders", kpis.totalOrders);
  setMetricValue("newOrders", kpis.newOrders);
  setMetricValue("openOrders", kpis.openOrders);
  setMetricValue("activeSites", kpis.activeSites);
  setMetricValue("completedOrders", kpis.completedOrders);
  setMetricValue("cancelledOrders", kpis.cancelledOrders);
  setMoneyValue("currentMonthRevenue", kpis.currentMonthRevenue);

  const completionPill = document.querySelector("[data-completion-rate-pill]");
  if (completionPill) {
    completionPill.textContent = `${kpis.completionRate}%`;
  }

  const chartCaption = document.querySelector("[data-chart-two-caption]");
  if (chartCaption) {
    chartCaption.textContent = `${kpis.completedOrders} pedidos resueltos de ${kpis.totalOrders} registrados.`;
  }

  const subtitle = document.querySelector("[data-page-subtitle]");
  if (subtitle) {
    subtitle.textContent = `Fuente activa: ${payload.filters.sites.length || 1} sede(s) detectada(s) y ${payload.filters.statuses.length || 0} estado(s) en el historico.`;
  }

  renderRecentOrders(recentOrders);
  renderSiteBreakdown(siteBreakdown);
  renderStatusBreakdown(statusBreakdown);

  chart01(charts.ordersByDay);
  chart02({ completionRate: kpis.completionRate });
  chart03(charts.monthly);
};

export default renderDashboard;
