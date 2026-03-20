const defaultSites = require("./sites");

require("dotenv").config();

const toNumber = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const configuredSites = parseJson(process.env.SITES_JSON, defaultSites);

const env = {
  appName: process.env.APP_NAME || "Dielca Kiosko Backoffice",
  host: process.env.HOST || "0.0.0.0",
  port: toNumber(process.env.PORT, 3000),
  timeZone: process.env.LOCAL_TIME_ZONE || "Atlantic/Canary",
  currency: process.env.CURRENCY || "EUR",
  dataSource: process.env.DATA_SOURCE || "supabase",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseOrdersTable: process.env.SUPABASE_ORDERS_TABLE || "kiosk_orders",
  supabaseCreatedAtColumn: process.env.SUPABASE_CREATED_AT_COLUMN || "created_at",
  supabaseFetchLimit: toNumber(process.env.SUPABASE_FETCH_LIMIT, 500),
  cacheTtlMs: toNumber(process.env.DATA_CACHE_TTL_MS, 30000),
  sites: Array.isArray(configuredSites) ? configuredSites : defaultSites,
};

const hasSupabaseCredentials =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseServiceRoleKey);

module.exports = {
  env,
  hasSupabaseCredentials,
};
