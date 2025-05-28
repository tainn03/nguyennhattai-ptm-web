import { UserLinkedAccountProvider } from "@prisma/client";

import { DEFAULT_LOCALE, LOCALES } from "@/constants/locale";
import { LocaleType } from "@/types/locale";
import { OrganizationInfo, OrganizationMemberInfo, UserInfo } from "@/types/strapi";

import { equalId } from "./number";
import { avatarLetterName, contrastColor, ensureString, stringToColor } from "./string";

/**
 * Extracts the organization code from a given pathname. It supports paths with or without language prefixes.
 * The pathname should follow the pattern "/<locale>/orgs/<organizationCode>/" or "/orgs/<organizationCode>/",
 * where <locale> is an optional language prefix and <organizationCode> is the extracted organization code.
 *
 * @param {string} pathname - The pathname from which to extract the organization code.
 * @returns {string | null} - The extracted organization code or null if the pattern does not match.
 */
export const getOrganizationCodeFromPathname = (pathname: string): string | null => {
  const getOrganizationCodeRegex = RegExp(`^(/(${LOCALES.join("|")}))?/orgs/([^/]+).*$`, "i");
  const matched = ensureString(pathname).match(getOrganizationCodeRegex);
  return matched ? matched[3] : null;
};

/**
 * Get the link to an organization based on its data.
 *
 * @param {Partial<OrganizationInfo>} organization - Partial information about the organization.
 * @returns {string} The link to the organization.
 */
export const getOrganizationLink = (organization: Partial<OrganizationInfo> = {}): string => {
  const { id, code } = organization;
  return `/orgs/${code || id}`;
};

/**
 * Generates the personal channel name for a specific user within an organization.
 *
 * The channel name format is `org<orgId>.user<userId>`, where <orgId> is the organization ID
 * and <userId> is the ID of the specific user.
 *
 * @param {number} orgId - The ID of the organization to which the user belongs.
 * @param {number} userId - The ID of the user for whom the personal channel is generated.
 * @returns {string} The name of the personal channel in the format `org<orgId>.user<userId>`.
 */
export const getUserSubscriptionChannel = (orgId: number, userId: number): string => `org${orgId}.user${userId}`;

/**
 * Generates a subscription channel name for a specific organization and order.
 *
 * @param {number} orgId - The ID of the organization.
 * @param {string} orderCode - The Code of the order.
 * @returns {string} - The subscription channel name in the format `org<orgId>.order<orderCode>`.
 *
 * @example
 * ```typescript
 * const channel = getOrderSubscriptionChannel(1, "GSSR4JWXCI");
 * console.log(channel); // Outputs: "org1.orderGSSR4JWXCI"
 * ```
 */
export const getOrderSubscriptionChannel = (orgId: number, orderCode: string): string =>
  `org${orgId}.order${orderCode}`;

/**
 * Checks if the provided user is the owner of the organization based on the organization's information.
 *
 * @param {Partial<OrganizationInfo> | undefined} organization - The partial organization information.
 * @param {Partial<UserInfo> | undefined} user - The partial user information.
 * @returns {boolean} - Returns true if the user is the owner, otherwise false.
 */
export const isOrganizationOwner = (organization?: Partial<OrganizationInfo>, user?: Partial<UserInfo>): boolean => {
  return equalId(organization?.createdByUser?.id, user?.id);
};

/**
 * Get account-related information for a user, including avatar and display name.
 *
 * @param {Partial<UserInfo>} user The user object, including details and linked accounts.
 * @param {Partial<OrganizationMemberInfo>} organizationMember The organization member object.
 * @param {LocaleType} locale The current locale.
 * @returns {{
 *    avatar: string | null,
 *    displayName: string
 * }} An object containing account information:
 * - `avatar`: The user's avatar URL, or `null` if not available.
 * - `displayName`: The user's display name, combining last name and first name if available.
 */
export const getAccountInfo = (
  user?: Partial<UserInfo>,
  organizationMember?: Partial<OrganizationMemberInfo>,
  locale?: LocaleType
) => {
  const { username, detail, linkedAccounts } = user || {};
  let avatar: string | undefined;
  let displayName = username;

  // Check if avatar is available in user's detail
  if (detail?.avatar) {
    avatar = detail?.avatar?.url;
  }

  // If no avatar in user's detail, check linked accounts
  if (!avatar && linkedAccounts && linkedAccounts.length > 0) {
    for (let i = 0; i < linkedAccounts.length; i++) {
      const linkedAccount = linkedAccounts[i];
      if (linkedAccount.avatar) {
        avatar = linkedAccount.avatar;
        break;
      }
    }
  }

  // Combine last name and first name if both are available
  if (detail?.lastName && detail?.firstName) {
    const { lastName, firstName } = detail;
    displayName = getFullName(firstName, lastName, locale || (user?.setting?.locale as LocaleType));
  }

  // Get contact info
  let contactInfo = "";
  if (organizationMember && user && equalId(organizationMember.member?.id, user.id)) {
    const isOwner = isOrganizationOwner(organizationMember.organization, user);
    const basicContactInfo = organizationMember.phoneNumber || organizationMember.email;
    contactInfo =
      basicContactInfo || (isOwner ? ensureString(user.phoneNumber || user.email) : `@${organizationMember.username}`);
  }

  return {
    avatar,
    displayName: ensureString(displayName),
    contactInfo,
  };
};

/**
 * Get avatar-related information for a user based on their display name.
 *
 * @param {string} displayName - The user's display name.
 * @returns {{
 *    avatarTwoLetter: string,
 *    avatarBgColor: string
 * }} An object containing avatar information:
 * - `avatarTwoLetter`: A two-letter abbreviation based on the user's display name.
 * - `avatarBgColor`: A background color for the avatar based on the user's display name.
 */
export const getAvatarInfo = (displayName: string) => {
  const avatarTwoLetter = avatarLetterName(displayName);
  const avatarBgColor = stringToColor(displayName);
  const avatarTextColor = contrastColor(avatarBgColor);

  return {
    avatarTwoLetter,
    avatarBgColor,
    avatarTextColor,
  };
};

/**
 * Checks if the given provider is "google" or "facebook".
 *
 * @param provider - The provider string to be checked.
 * @returns An object with the following properties:
 *   - `isValid` (boolean): Indicates whether the provider is valid (true) or not (false).
 *   - `providerName` (string | undefined): If valid, specifies the name of the provider ("google" or "facebook").
 */
export const checkProvider = (provider: string): { isValid: boolean; providerName?: UserLinkedAccountProvider } => {
  if (provider === "google" || provider === "facebook") {
    const providerName: UserLinkedAccountProvider = provider === "google" ? "GOOGLE" : "FACEBOOK";
    return { isValid: true, providerName };
  }

  return { isValid: false };
};

/**
 * Generates a formatted full name string from the given first name and last name.
 *
 * @param {string} firstName - The first name.
 * @param {string} lastName - The last name.
 * @param {LocaleType} locale The current locale.
 * @returns {string} - The formatted full name string.
 */
export const getFullName = (
  firstName?: string | null,
  lastName?: string | null,
  locale: LocaleType = DEFAULT_LOCALE
) => {
  if (!firstName && !lastName) {
    return "";
  }
  const [lastNameStr, firstNameStr] = [lastName || "", firstName || ""];
  const fullName = [lastNameStr, firstNameStr];

  return locale !== DEFAULT_LOCALE ? fullName.reverse().join(" ") : fullName.join(" ");
};
