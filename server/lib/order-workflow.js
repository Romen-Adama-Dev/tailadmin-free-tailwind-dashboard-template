const normalizeText = (value) =>
  value === null || value === undefined
    ? ""
    : String(value).trim().toLowerCase();

const WORKFLOW_ACTIONS = {
  mark_bc_created: {
    id: "mark_bc_created",
    nextStatus: "bc_created",
    label: "Marcar pedido hecho en BC",
    helperText: "Confirma que el pedido ya se ha cargado en Business Central.",
    modalTitle: "Confirmar carga en Business Central",
    modalDescription:
      "Este pedido pasara al estado 'Pedido hecho en BC' para reflejar que ya se ha rellenado en Business Central.",
    confirmLabel: "Confirmar BC",
  },
  mark_prepared: {
    id: "mark_prepared",
    nextStatus: "prepared",
    label: "Marcar pedido preparado",
    helperText: "Confirma que el pedido ya esta preparado en almacen.",
    modalTitle: "Confirmar pedido preparado",
    modalDescription:
      "Este pedido pasara al estado 'Pedido preparado' para indicar que ya esta listo desde almacen.",
    confirmLabel: "Marcar preparado",
  },
};

const getWorkflowDisplayStatus = (rawStatus) => {
  const normalizedStatus = normalizeText(rawStatus);

  if (!normalizedStatus) {
    return "Sin estado";
  }

  if (normalizedStatus === "new" || normalizedStatus === "nuevo") {
    return "Nuevo";
  }

  if (
    normalizedStatus === "bc_created" ||
    normalizedStatus === "bc-created" ||
    normalizedStatus.includes("business central") ||
    normalizedStatus.includes("hecho en bc") ||
    normalizedStatus.includes("rellenado en bc")
  ) {
    return "Pedido hecho en BC";
  }

  if (
    normalizedStatus === "prepared" ||
    normalizedStatus === "preparado" ||
    normalizedStatus.includes("preparad")
  ) {
    return "Pedido preparado";
  }

  return String(rawStatus)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getWorkflowActionsForStatus = (rawStatus) => {
  const normalizedStatus = normalizeText(rawStatus);

  if (!normalizedStatus || normalizedStatus === "new" || normalizedStatus === "nuevo") {
    return [WORKFLOW_ACTIONS.mark_bc_created];
  }

  if (
    normalizedStatus === "bc_created" ||
    normalizedStatus === "bc-created" ||
    normalizedStatus.includes("business central") ||
    normalizedStatus.includes("hecho en bc") ||
    normalizedStatus.includes("rellenado en bc")
  ) {
    return [WORKFLOW_ACTIONS.mark_prepared];
  }

  if (
    normalizedStatus === "prepared" ||
    normalizedStatus === "preparado" ||
    normalizedStatus.includes("preparad") ||
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("done") ||
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("entreg") ||
    normalizedStatus.includes("served")
  ) {
    return [];
  }

  return [WORKFLOW_ACTIONS.mark_bc_created];
};

const getWorkflowAction = (actionId) => WORKFLOW_ACTIONS[actionId] || null;

module.exports = {
  getWorkflowAction,
  getWorkflowActionsForStatus,
  getWorkflowDisplayStatus,
};
