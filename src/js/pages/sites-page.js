import { fetchJson } from "../services/api";
import { applyMetaState, escapeHtml, formatDateTime } from "../utils/formatters";

const initSitesPage = async () => {
  const payload = await fetchJson("/api/sites");
  applyMetaState(payload.meta);

  const container = document.querySelector("[data-sites-grid]");
  if (!container) {
    return;
  }

  container.innerHTML = payload.sites
    .map(
      (site) => `
        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase text-gray-400">Sede</p>
              <h3 class="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">${escapeHtml(
                site.label,
              )}</h3>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(
                site.description || "Configurada para el backoffice local.",
              )}</p>
            </div>
            <span class="rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-400">
              ${site.active ? "Activa" : "En espera"}
            </span>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
              <p class="text-xs uppercase text-gray-400">Pedidos</p>
              <p class="mt-2 text-xl font-semibold text-gray-800 dark:text-white/90">${site.totalOrders}</p>
            </div>
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
              <p class="text-xs uppercase text-gray-400">Abiertos</p>
              <p class="mt-2 text-xl font-semibold text-gray-800 dark:text-white/90">${site.openOrders}</p>
            </div>
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
              <p class="text-xs uppercase text-gray-400">Resueltos</p>
              <p class="mt-2 text-xl font-semibold text-gray-800 dark:text-white/90">${site.completedOrders}</p>
            </div>
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
              <p class="text-xs uppercase text-gray-400">Ultimo pedido</p>
              <p class="mt-2 text-sm font-semibold text-gray-800 dark:text-white/90">${escapeHtml(
                site.lastOrderAt ? formatDateTime(site.lastOrderAt) : "Sin registros",
              )}</p>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  container.insertAdjacentHTML(
    "beforeend",
    `
      <article class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <p class="text-xs uppercase text-gray-400">Proxima sede</p>
        <h3 class="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">Preparada para alta futura</h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">La app ya puede absorber mas sedes sin cambiar layout ni navegacion.</p>
      </article>
    `,
  );
};

export default initSitesPage;
