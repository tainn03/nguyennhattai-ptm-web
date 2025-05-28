/**
 * Email suffix used for email addresses within the `autotms.vn` domain.
 * When creating email addresses, this suffix is appended to the username to form a complete email.
 *
 * Example:
 * - If username is "john.doe", the complete email address would be "john.doe@autotms.vn".
 */
export const EMAIL_SUFFIX = "@autotms.vn";

/**
 * The role identifier assigned to authenticated users in the Strapi system.
 * In Strapi, roles are used to define different levels of access and permissions for users.
 */
export const ROLE_AUTHENTICATED = 1;

/**
 * The default provider of the Strapi system.
 */
export const DEFAULT_PROVIDER = "local";
