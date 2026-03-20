import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "../css/style.css";

import Alpine from "alpinejs";
import persist from "@alpinejs/persist";

import initDashboardPage from "./pages/dashboard-page";
import initOrdersPage from "./pages/orders-page";
import initOrderDetailPage from "./pages/order-detail-page";
import initSitesPage from "./pages/sites-page";

Alpine.plugin(persist);
window.Alpine = Alpine;
Alpine.start();

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const initGlobalSearch = () => {
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  const searchForm = document.querySelector("[data-global-search-form]");

  if (!searchInput || !searchButton || !searchForm) {
    return;
  }

  const focusSearchInput = () => {
    searchInput.focus();
  };

  const submitSearch = () => {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) {
      params.set("search", searchInput.value.trim());
    }

    const target = params.toString()
      ? `orders.html?${params.toString()}`
      : "orders.html";

    window.location.href = target;
  };

  searchButton.addEventListener("click", () => {
    if (searchInput.value.trim()) {
      submitSearch();
      return;
    }

    focusSearchInput();
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSearch();
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      focusSearchInput();
    }
  });
};

const initPage = async () => {
  const currentPage = document.body.dataset.appPage;

  if (currentPage === "dashboard") {
    await initDashboardPage();
  }

  if (currentPage === "orders") {
    await initOrdersPage();
  }

  if (currentPage === "order-detail") {
    await initOrderDetailPage();
  }

  if (currentPage === "sites") {
    await initSitesPage();
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  initGlobalSearch();

  try {
    await initPage();
  } catch (error) {
    document.querySelectorAll("[data-alert-region]").forEach((element) => {
      element.textContent = error.message;
      element.classList.remove("hidden");
    });
  }
});
