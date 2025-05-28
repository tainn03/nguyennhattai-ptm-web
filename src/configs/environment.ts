/** Is development mode */
export const __DEV__ =
  process.env.VERCEL_ENV === "development" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.NODE_ENV === "development";

/** App secret token */
export const APP_DEVELOPMENT_KEY = process.env.APP_DEVELOPMENT_KEY || "";
export const NEXT_PUBLIC_APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET || "";
export const APP_SECRET = process.env.APP_SECRET || "";
export const APP_IMPERSONATION_PASSWORD = process.env.APP_IMPERSONATION_PASSWORD || "";
export const CLIENT_API_KEY = process.env.CLIENT_API_KEY || "";

/** Next Auth */
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "";
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

/** Order share url */
export const NEXT_PUBLIC_ORDER_SHARE_URL = process.env.NEXT_PUBLIC_ORDER_SHARE_URL || "";

/** Strapi Configurations */
export const STRAPI_URL = process.env.STRAPI_URL || "";
export const STRAPI_API_URL = `${STRAPI_URL}/api`;
export const STRAPI_GRAPHQL_URL = `${STRAPI_URL}/graphql`;
export const STRAPI_HEALTH_URL = `${STRAPI_URL}/_health`;
export const STRAPI_REQUEST_TIMEOUT = Number(process.env.STRAPI_REQUEST_TIMEOUT);
export const STRAPI_TOKEN_KEY = process.env.STRAPI_TOKEN_KEY || "";

/** TMS Report Configurations */
export const REPORT_URL = process.env.REPORT_URL || "";
export const REPORT_API_URL = `${REPORT_URL}/api`;
export const REPORT_TOKEN_KEY = process.env.REPORT_TOKEN_KEY || "";

/** TMS NATS Configurations */
export const NATS_SERVER = process.env.NATS_SERVER || "";
export const NEXT_PUBLIC_NATS_WEBSOCKET_SERVER = process.env.NEXT_PUBLIC_NATS_WEBSOCKET_SERVER || "";
export const NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN = process.env.NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN || "";

/** TMS NATS Configurations */
export const NEXT_PUBLIC_SUPERSET_BASE_URL = process.env.NEXT_PUBLIC_SUPERSET_BASE_URL || "";
export const SUPERSET_API_URL = process.env.SUPERSET_API_URL || "";
export const SUPERSET_USERNAME = process.env.SUPERSET_USERNAME || "";
export const SUPERSET_PASSWORD = process.env.SUPERSET_PASSWORD || "";

/** TMS Import Configurations */
export const IMPORT_URL = process.env.IMPORT_URL || "";
export const IMPORT_HEADER_NAME = process.env.IMPORT_HEADER_NAME || "";
export const IMPORT_API_KEY = process.env.IMPORT_API_KEY || "";

/** TMS Warehouse Configurations */
export const WAREHOUSE_URL = process.env.WAREHOUSE_URL || "";
export const WAREHOUSE_HEADER_NAME = process.env.WAREHOUSE_HEADER_NAME || "";
export const WAREHOUSE_API_KEY = process.env.WAREHOUSE_API_KEY || "";

/** Auto Dispatch Configurations */
export const AUTO_DISPATCH_URL = process.env.AUTO_DISPATCH_URL || "";

/** Social client: GOOGLE */
export const NEXT_PUBLIC_GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/** Social client: GOOGLE */
export const NEXT_PUBLIC_FACEBOOK_CLIENT_ID = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
export const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || "";
