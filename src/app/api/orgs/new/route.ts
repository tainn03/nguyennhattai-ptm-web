import { EmailTemplateType } from "@prisma/client";

import { NEXTAUTH_URL } from "@/configs/environment";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { OrganizationNewForm } from "@/forms/organization";
import {
  checkOrganizationExists,
  checkOrganizationExistsByOwner,
  createOrganization,
} from "@/services/server/organization";
import { getSetting } from "@/services/server/setting";
import { getUserById } from "@/services/server/user";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getFullName } from "@/utils/auth";
import { sendEmail } from "@/utils/email";
import { getToken, withExceptionHandler } from "@/utils/server";
import { randomString } from "@/utils/string";

/**
 * Handles the creation of a new organization, including checks for existence,
 * generation of a unique organization code, and sending email notifications.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {OrganizationNewForm} data - The data for creating a new organization.
 * @param {Object} params - Additional parameters (e.g., locale).
 * @returns {object} An object containing the HTTP status and result data, including the created organization.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, data: OrganizationNewForm, params) => {
  const { jwt, user } = getToken(req);

  // Check if the user already owns an organization.
  if (user.id) {
    const isOrganizationExistsByOwner = await checkOrganizationExistsByOwner(jwt, user.id);
    if (isOrganizationExistsByOwner) {
      return {
        status: HttpStatusCode.BadRequest,
        message: `${ErrorType.EXISTED}-${user.id}`,
      };
    }
  }

  // Check if the organization name already exists.
  const isNameExists = await checkOrganizationExists(jwt, { name: data.name });
  if (isNameExists) {
    return {
      status: HttpStatusCode.BadRequest,
      message: `${ErrorType.EXISTED}-${data.name}`,
    };
  }

  // Generate a unique organization code.
  let code: string;
  while ((code = randomString(20))) {
    const isCodeExists = await checkOrganizationExists(jwt, { code });
    if (!isCodeExists) {
      break;
    }
  }

  // Retrieve settings related to organization activation.
  const { autoActivateOrganization, recipientEmail } = await getSetting(jwt);

  // Create the organization with the provided data.
  const result = await createOrganization(
    jwt,
    {
      ...data,
      isActive: autoActivateOrganization,
    },
    user,
    code
  );

  // Handle an error during organization creation.
  if (result.error) {
    return {
      status: HttpStatusCode.BadRequest,
      message: ErrorType.UNKNOWN,
    };
  }

  // Retrieve additional user details.
  const resultUser = await getUserById(jwt, user.id);
  // Extract relevant data for email notifications.
  const { taxCode, email, phoneNumber, businessAddress, contactName, contactEmail, contactPhoneNumber } = data;
  const fullName = getFullName(
    resultUser.detail?.firstName,
    resultUser.detail?.lastName,
    params.locale || DEFAULT_LOCALE
  );

  // Send an email notification to the user who created the organization.
  if (user.email) {
    sendEmail({
      toEmail: user.email,
      type: EmailTemplateType.USER_NEW_ORGANIZATION,
      data: {
        userName: user.username,
        organizationName: data.name,
        taxCode,
        businessAddress,
        email: email || "-",
        phoneNumber: phoneNumber || "-",
        contactName: contactName || "-",
        contactEmail: contactEmail || "-",
        contactPhoneNumber: contactPhoneNumber || "-",
        autoActivateOrganization,
        systemLink: autoActivateOrganization ? `${NEXTAUTH_URL}/orgs/${code}/dashboard` : "",
      },
    });
  }

  // Send an email notification to the designated recipient email address.
  if (recipientEmail) {
    sendEmail({
      toEmail: recipientEmail,
      type: EmailTemplateType.ADMIN_NEW_ORGANIZATION,
      data: {
        userName: user.username,
        organizationName: data.name,
        taxCode,
        businessAddress,
        contactName: contactName || "-",
        contactEmail: contactEmail || "-",
        contactPhoneNumber: contactPhoneNumber || "-",
        fullName,
        email: resultUser.email,
        phoneNumber: resultUser.phoneNumber,
      },
    });
  }

  // Return the result of the organization creation.
  return {
    status: HttpStatusCode.Ok,
    data: { ...result.data, autoActivateOrganization },
  };
});
