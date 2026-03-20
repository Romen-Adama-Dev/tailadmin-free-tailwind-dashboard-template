import { fetchJson, sendJson } from "../services/api";
import {
  applyMetaState,
  escapeHtml,
  formatDateTime,
  formatMoney,
  renderEmptyTableRow,
  renderStatusBadge,
} from "../utils/formatters";

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const modalState = {
  action: null,
  order: null,
  isSubmitting: false,
};

const getItemName = (item, index) =>
  pickFirst(
    item?.name,
    item?.description,
    item?.product?.nombre,
    item?.product?.name,
    item?.sku,
    item?.reference,
    item?.productId,
    `Linea ${index + 1}`,
  );

const getItemQuantity = (item) =>
  pickFirst(
    item?.quantity,
    item?.qty,
    item?.units,
    item?.requestedQuantity,
    "-",
  );

const getItemAmount = (item) =>
  pickFirst(
    item?.subtotal,
    item?.total,
    item?.amount,
    item?.price,
    item?.importe,
    0,
  );

const getItemReference = (item) =>
  pickFirst(
    item?.reference,
    item?.ref,
    item?.product?.referencia,
    item?.productId,
    item?.product?.id,
  );

const getItemId = (item) =>
  pickFirst(
    item?.productId,
    item?.id,
    item?.product?.id,
    item?.product?.referencia,
    item?.reference,
  );

const getItemBrand = (item) =>
  pickFirst(
    item?.brand,
    item?.marca,
    item?.product?.brand,
    item?.product?.marca,
  );

const buildHeadline = (item, index) => {
  const quantity = getItemQuantity(item);
  const name = getItemName(item, index);

  return quantity === "-" ? name : `${quantity} x ${name}`;
};

const buildMetaLine = (item) => {
  const reference = getItemReference(item);
  const itemId = getItemId(item);
  const brand = getItemBrand(item);
  const amount = getItemAmount(item);

  return [
    reference ? `Ref: ${reference}` : null,
    itemId ? `ID: ${itemId}` : null,
    brand ? `Marca: ${brand}` : null,
    `Subtotal: ${formatMoney(amount)}`,
  ]
    .filter(Boolean)
    .join(" | ");
};

const renderItems = (items = []) => {
  const tableBody = document.querySelector("[data-order-items-body]");

  if (!tableBody) {
    return;
  }

  if (!Array.isArray(items) || !items.length) {
    tableBody.innerHTML = renderEmptyTableRow(
      4,
      "Este pedido no trae lineas visibles en el historico cargado.",
    );
    return;
  }

  tableBody.innerHTML = items
    .map((item, index) => {
      const headline = buildHeadline(item, index);
      const metaLine = buildMetaLine(item);
      const quantity = getItemQuantity(item);
      const amount = getItemAmount(item);

      return `
        <tr>
          <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${index + 1}</td>
          <td class="px-4 py-3">
            <div class="space-y-1">
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">${escapeHtml(
                headline,
              )}</p>
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">${escapeHtml(
                metaLine,
              )}</p>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(
            quantity,
          )}</td>
          <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(
            formatMoney(amount),
          )}</td>
        </tr>
      `;
    })
    .join("");
};

const setActionFeedback = (message = "", tone = "success") => {
  const feedback = document.querySelector("[data-order-action-feedback]");

  if (!feedback) {
    return;
  }

  feedback.classList.remove(
    "hidden",
    "text-success-700",
    "dark:text-success-400",
    "text-error-700",
    "dark:text-error-400",
  );

  if (!message) {
    feedback.textContent = "";
    feedback.classList.add("hidden");
    return;
  }

  feedback.textContent = message;
  if (tone === "error") {
    feedback.classList.add("text-error-700", "dark:text-error-400");
  } else {
    feedback.classList.add("text-success-700", "dark:text-success-400");
  }
};

const renderActions = (order) => {
  const actionsContainer = document.querySelector("[data-order-actions]");

  if (!actionsContainer) {
    return;
  }

  const actions = Array.isArray(order.availableActions) ? order.availableActions : [];

  if (!actions.length) {
    actionsContainer.innerHTML = `
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Sin acciones pendientes para el estado actual.
      </p>
    `;
    return;
  }

  actionsContainer.innerHTML = actions
    .map(
      (action) => `
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          data-order-action-button
          data-action-id="${escapeHtml(action.id)}"
        >
          ${escapeHtml(action.label)}
        </button>
      `,
    )
    .join("");
};

const renderOrder = (order) => {
  document.querySelector("[data-order-title]").textContent = order.numPedido;
  document.querySelector("[data-order-subtitle]").textContent = [
    order.site.label,
    order.source,
  ]
    .filter(Boolean)
    .join(" - ");
  document.querySelector("[data-order-created-at]").textContent = formatDateTime(
    order.createdAt,
  );
  document.querySelector("[data-order-site]").textContent = order.site.label;
  document.querySelector("[data-order-total]").textContent = formatMoney(
    order.totalAmount,
  );
  document.querySelector("[data-order-item-count]").textContent = order.itemCount;
  document.querySelector("[data-order-contact-name]").textContent =
    order.contactName;
  document.querySelector("[data-order-contact-phone]").textContent =
    order.contactPhone;
  document.querySelector("[data-order-source]").textContent = order.source;
  document.querySelector("[data-order-stock-validation]").textContent =
    order.stockValidationState;
  document.querySelector("[data-order-notification]").textContent =
    order.notificationState;
  document.querySelector("[data-order-updated-at]").textContent = formatDateTime(
    order.updatedAt || order.createdAt,
  );
  document.querySelector("[data-order-notes]").textContent =
    order.notes || "Sin notas registradas.";
  const badgeMarkup = renderStatusBadge(order.status, order.statusKey);
  document.querySelector("[data-order-status-badge]").innerHTML = badgeMarkup;
  document.querySelector("[data-order-status-badge-inline]").innerHTML =
    badgeMarkup;
  document.querySelector("[data-order-items-caption]").textContent = `${order.itemCount} linea(s) detectada(s).`;
  document.querySelector("[data-order-raw-json]").textContent = JSON.stringify(
    order.raw,
    null,
    2,
  );

  renderItems(order.raw?.items);
  renderActions(order);
};

const getStatusModalElements = () => ({
  root: document.querySelector("[data-status-modal]"),
  title: document.querySelector("[data-status-modal-title]"),
  description: document.querySelector("[data-status-modal-description]"),
  orderLabel: document.querySelector("[data-status-modal-order]"),
  confirm: document.querySelector("[data-status-modal-confirm]"),
});

const closeModal = () => {
  const elements = getStatusModalElements();

  modalState.action = null;
  modalState.isSubmitting = false;

  elements.root?.classList.add("hidden");
  elements.root?.classList.remove("flex");
};

const openModal = (order, action) => {
  const elements = getStatusModalElements();

  modalState.order = order;
  modalState.action = action;
  modalState.isSubmitting = false;

  if (elements.title) {
    elements.title.textContent = action.modalTitle || "Confirmar accion";
  }

  if (elements.description) {
    elements.description.textContent =
      action.modalDescription || "Confirma esta actualizacion del pedido.";
  }

  if (elements.orderLabel) {
    elements.orderLabel.textContent = `${order.numPedido} - ${order.site.label}`;
  }

  if (elements.confirm) {
    elements.confirm.textContent = action.confirmLabel || "Confirmar";
    elements.confirm.disabled = false;
  }

  elements.root?.classList.remove("hidden");
  elements.root?.classList.add("flex");
};

const loadOrder = async () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");
  const numPedido = params.get("numPedido");
  const query = new URLSearchParams();

  if (orderId) {
    query.set("orderId", orderId);
  }

  if (numPedido) {
    query.set("numPedido", numPedido);
  }

  const payload = await fetchJson(`/api/orders/lookup?${query.toString()}`);
  applyMetaState(payload.meta);
  modalState.order = payload.order;
  renderOrder(payload.order);
};

const submitStatusAction = async () => {
  const elements = getStatusModalElements();

  if (!modalState.action || !modalState.order || modalState.isSubmitting) {
    return;
  }

  modalState.isSubmitting = true;
  if (elements.confirm) {
    elements.confirm.disabled = true;
    elements.confirm.textContent = "Guardando...";
  }

  try {
    const payload = await sendJson("/api/orders/status", {
      body: {
        orderId: modalState.order.id,
        numPedido: modalState.order.numPedido,
        action: modalState.action.id,
      },
    });

    applyMetaState(payload.meta);
    modalState.order = payload.order;
    renderOrder(payload.order);
    setActionFeedback(
      `Estado actualizado a '${payload.order.status}'.`,
      "success",
    );
    closeModal();
  } catch (error) {
    setActionFeedback(error.message, "error");

    if (elements.confirm) {
      elements.confirm.disabled = false;
      elements.confirm.textContent =
        modalState.action?.confirmLabel || "Confirmar";
    }

    modalState.isSubmitting = false;
  }
};

const initModalHandlers = () => {
  document.querySelectorAll("[data-status-modal-close]").forEach((element) => {
    element.addEventListener("click", () => {
      if (!modalState.isSubmitting) {
        closeModal();
      }
    });
  });

  document
    .querySelector("[data-status-modal-confirm]")
    ?.addEventListener("click", submitStatusAction);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalState.isSubmitting) {
      closeModal();
    }
  });
};

const initActionHandlers = () => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-action-button]");

    if (!button || !modalState.order) {
      return;
    }

    const action = modalState.order.availableActions.find(
      (availableAction) => availableAction.id === button.dataset.actionId,
    );

    if (action) {
      openModal(modalState.order, action);
    }
  });
};

const initOrderDetailPage = async () => {
  initModalHandlers();
  initActionHandlers();
  await loadOrder();
};

export default initOrderDetailPage;
