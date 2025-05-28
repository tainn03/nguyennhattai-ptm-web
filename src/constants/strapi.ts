/**
 * The ID of the system administrator.
 * This constant is used to identify the system administrator user in the application.
 */
export const SYSTEM_ADMIN_ID = 1;

/**
 * The role identifier assigned to authenticated users in the Strapi system.
 * In Strapi, roles are used to define different levels of access and permissions for users.
 * This role is typically assigned to users who have successfully logged in.
 */
export const ROLE_AUTHENTICATED = 1;

/**
 * The default authentication provider used by the Strapi system.
 * This defines the default method or service for authenticating users (e.g., "local" for username/password).
 */
export const DEFAULT_PROVIDER = "local";
