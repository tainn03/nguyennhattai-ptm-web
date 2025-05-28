import { Organization, OrganizationInitialValueType, Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { OrganizationEditForm, OrganizationNewForm } from "@/forms/organization";
import { getOrganizationInitialValues } from "@/services/server/organizationInitialValue";
import { ErrorType } from "@/types";
import { UserSession } from "@/types/auth";
import { MutationResult } from "@/types/graphql";
import { OrganizationInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

import { initialDriverExpenseValues } from "./driverExpense";
import { initialDriverLicenseTypeValues } from "./driverLicenseType";
import { initialDriverReportValues } from "./driverReport";
import { initialMaintenanceTypeValues } from "./maintenanceType";
import { initialMerchandiseTypeValues } from "./merchandiseType";
import { initialOrganizationRoleValues } from "./organizationRole";
import { initialTrailerTypeValues } from "./trailerType";
import { initialUnitOfMeasuresValues } from "./unitOfMeasure";
import { initialVehicleTypeValues } from "./vehicleType";

/**
 * Update s the information of an organization using the provided data and a token.
 * It can also update the organization's logo if a new logo ID is provided.
 *
 * @param {string} token - The authentication token for making the update request.
 * @param {OrganizationEditForm} organization - The organization data to be updated.
 * @param {number} updatedByUserId - The ID of the user performing the update.
 * @param {number | undefined} newLogoId - Optional new logo ID for the organization.
 * @returns {Promise<Organization | undefined>} - A Promise that resolves with the updated organization data,
 * or undefined if the update is not successful.
 */
export const updateOrganization = async (
  token: string,
  organization: OrganizationEditForm,
  updatedByUserId: number,
  newLogoId?: number
): Promise<Organization | undefined> => {
  const oldLogoId = organization.logo?.id;
  const deleteLogoQuery =
    newLogoId && oldLogoId
      ? `deleteUploadFile(id: $oldLogoId) {
           data {
             id
           }
         }`
      : "";
  const query = gql`
    mutation (
      $id: ID!
      $name: String!
      $internationalName: String
      $abbreviationName: String
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $contactName: String
      $contactPosition: String
      $contactEmail: String
      $contactPhoneNumber: String
      $updatedByUserId: ID!
      ${newLogoId ? "$newLogoId: ID!" : ""}
      ${newLogoId && oldLogoId ? "$oldLogoId: ID!" : ""}
    ) {
      updateOrganization(
        id: $id
        data: {
          ${newLogoId ? "logo: $newLogoId" : ""}
          name: $name
          internationalName: $internationalName
          abbreviationName: $abbreviationName
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          contactName: $contactName
          contactPosition: $contactPosition
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          updatedByUser: $updatedByUserId
        }
      ) {
        data {
          id
        }
      }
      ${deleteLogoQuery}
    }
  `;

  const { data } = await fetcher<Organization>(token, query, {
    id: Number(organization.id),
    name: organization.name,
    internationalName: organization.internationalName,
    abbreviationName: organization.abbreviationName,
    taxCode: organization.taxCode,
    email: organization.email || null,
    phoneNumber: organization.phoneNumber,
    website: organization.website,
    businessAddress: organization.businessAddress,
    contactName: organization.contactName,
    contactPosition: organization.contactPosition,
    contactEmail: organization.contactEmail || null,
    contactPhoneNumber: organization.contactPhoneNumber,
    updatedByUserId,
    ...(newLogoId && { newLogoId }),
    ...(oldLogoId && { oldLogoId }),
  });

  return data.updateOrganization;
};

/**
 * Create an organization with associated settings and types.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {object} values - Partial information about the organization (name and abbreviationName).
 * @param {UserSession} userId - User creating the organization.
 * @param {string} code - Organization code.
 * @returns {Promise<MutationResult<Organization>>} - A Promise that resolves to the created organization.
 */
export const createOrganization = async (
  jwt: string,
  values: OrganizationNewForm,
  user: UserSession,
  code: string
): Promise<MutationResult<Organization>> => {
  const processedEntity = trim(values);
  const { id, username, email } = user;
  const userId = Number(id);

  try {
    return await prisma.$transaction(
      async (prismaClient) => {
        // create organization
        const createOrganization = await prismaClient.organization.create({
          data: {
            ...processedEntity,
            name: ensureString(processedEntity.name),
            code,
            publishedAt: new Date(),
          },
        });
        const orgId = Number(createOrganization.id);

        // Link organization with user
        await prismaClient.organizationsCreatedByUserLinks.create({
          data: {
            organizationId: orgId,
            userId,
          },
        });
        await prismaClient.organizationsUpdatedByUserLinks.create({
          data: {
            organizationId: orgId,
            userId,
          },
        });

        // create organization member
        const createOrganizationMember = await prismaClient.organizationMember.create({
          data: {
            username: ensureString(username).split("@")[0],
            email: ensureString(email),
            isAdmin: true,
            isLinked: true,
            publishedAt: new Date(),
          },
        });
        const organizationMemberId = Number(createOrganizationMember.id);

        // Link organization member with organization
        await prismaClient.organizationMembersOrganizationLinks.create({
          data: {
            organizationMemberId,
            organizationId: orgId,
          },
        });

        // Link organization member with member
        await prismaClient.organizationMembersMemberLinks.create({
          data: {
            organizationMemberId,
            userId,
          },
        });

        // Link organization member with user
        await prismaClient.organizationMembersCreatedByUserLinks.create({
          data: {
            organizationMemberId,
            userId,
          },
        });
        await prismaClient.organizationMembersUpdatedByUserLinks.create({
          data: {
            organizationMemberId,
            userId,
          },
        });

        // create SMTP Setting
        const createSmtpSetting = await prismaClient.sMTPSetting.create({
          data: {
            publishedAt: new Date(),
          },
        });

        // Link smtp setting with user
        await prismaClient.smtpSettingsCreatedByUserLinks.create({
          data: {
            smtpSettingId: createSmtpSetting.id,
            userId,
          },
        });

        await prismaClient.smtpSettingsUpdatedByUserLinks.create({
          data: {
            smtpSettingId: createSmtpSetting.id,
            userId,
          },
        });

        const smtpSettingId = Number(createSmtpSetting.id);

        // create organization setting
        const createOrganizationSetting = await prismaClient.organizationSetting.create({
          data: {
            organizationId: orgId,
            publishedAt: new Date(),
          },
        });

        const orgSettingId = Number(createOrganizationSetting.id);

        // Link organization setting with organization
        await prismaClient.organizationSettingsSmtpLinks.create({
          data: {
            organizationSettingId: orgSettingId,
            smtpSettingId: smtpSettingId,
          },
        });

        // Link organization setting with smtp setting
        await prismaClient.organizationsSettingLinks.create({
          data: {
            organizationSettingId: orgSettingId,
            organizationId: orgId,
          },
        });

        const maintenanceTypes: Prisma.MaintenanceTypeCreateManyInput[] = [];
        const driverLicenseTypes: Prisma.DriverLicenseTypeCreateManyInput[] = [];
        const merchandiseTypes: Prisma.MerchandiseTypeCreateManyInput[] = [];
        const unitOfMeasures: Prisma.UnitOfMeasureCreateManyInput[] = [];
        const driverReports: (Prisma.DriverReportCreateManyInput & {
          reportDetails: Prisma.DriverReportDetailCreateManyInput[];
        })[] = [];
        const trailerTypes: Prisma.TrailerTypeCreateManyInput[] = [];
        const vehicleTypes: Prisma.VehicleTypeCreateManyInput[] = [];

        const organizationRolesData: Prisma.OrganizationRoleCreateManyInput[] = [];
        const driverExpenses: Prisma.DriverExpenseCreateManyInput[] = [];

        // Prepare data to initial value for organization
        const organizationInitialValue = await getOrganizationInitialValues(jwt);
        for (const item of organizationInitialValue) {
          switch (item.type) {
            case OrganizationInitialValueType.MAINTENANCE_TYPE: {
              maintenanceTypes.push({
                ...(item.data as Prisma.MaintenanceTypeCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.DRIVER_LICENSE_TYPE: {
              driverLicenseTypes.push({
                ...(item.data as Prisma.DriverLicenseTypeCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.MERCHANDISE_TYPE: {
              merchandiseTypes.push({
                ...(item.data as Prisma.MerchandiseTypeCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.UNIT_OF_MEASURE: {
              unitOfMeasures.push({
                ...(item.data as Prisma.UnitOfMeasureCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.DRIVER_REPORT: {
              const { reportDetails, ...driverReportData } = item.data as Prisma.DriverReportCreateManyInput & {
                reportDetails: Prisma.DriverReportDetailCreateManyInput[];
              };
              driverReports.push({
                ...driverReportData,
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
                reportDetails: reportDetails ?? [],
              });
              break;
            }
            case OrganizationInitialValueType.TRAILER_TYPE: {
              trailerTypes.push({
                ...(item.data as Prisma.TrailerTypeCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.VEHICLE_TYPE: {
              vehicleTypes.push({
                ...(item.data as Prisma.VehicleTypeCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });
              break;
            }
            case OrganizationInitialValueType.ORGANIZATION_ROLE: {
              organizationRolesData.push({
                ...(item.data as Prisma.OrganizationRoleCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });

              break;
            }
            case OrganizationInitialValueType.DRIVER_EXPENSE: {
              driverExpenses.push({
                ...(item.data as Prisma.DriverExpenseCreateManyInput),
                organizationId: orgId,
                isActive: true,
                publishedAt: new Date(),
              });

              break;
            }
            default:
              break;
          }
        }

        // create maintenance type
        if (maintenanceTypes.length > 0) {
          await initialMaintenanceTypeValues(prismaClient, maintenanceTypes, userId);
        }

        // create driver license type
        if (driverLicenseTypes.length > 0) {
          await initialDriverLicenseTypeValues(prismaClient, driverLicenseTypes, userId);
        }

        // create merchandise type
        if (merchandiseTypes.length > 0) {
          await initialMerchandiseTypeValues(prismaClient, merchandiseTypes, userId);
        }

        // create unit of measure
        if (unitOfMeasures.length > 0) {
          await initialUnitOfMeasuresValues(prismaClient, unitOfMeasures, userId);
        }

        // create driver report type
        if (driverReports.length > 0) {
          await initialDriverReportValues(prismaClient, driverReports, userId);
        }

        // create trailer type
        if (trailerTypes.length > 0) {
          await initialTrailerTypeValues(prismaClient, trailerTypes, userId);
        }

        // create vehicle type
        if (vehicleTypes.length > 0) {
          await initialVehicleTypeValues(prismaClient, vehicleTypes, userId);
        }

        // create organization role
        if (organizationRolesData.length > 0) {
          await initialOrganizationRoleValues(prismaClient, organizationRolesData, userId);
        }

        // create driver expense
        if (organizationRolesData.length > 0) {
          await initialDriverExpenseValues(prismaClient, driverExpenses, userId);
        }

        return { data: createOrganization };
      },
      {
        // configuration timeout is 30 seconds
        timeout: 30 * 1000,
      }
    );
  } catch (error) {
    return { error: ErrorType.UNKNOWN };
  }
};

/**
 * Check if an organization with a given name or code already exists.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {object} value - An object containing either a name or a code to filter organizations.
 * @returns {Promise<boolean>} - A Promise that resolves to a boolean indicating whether the organization exists.
 */
export const checkOrganizationExists = async (
  jwt: string,
  value: { name?: string; code?: string }
): Promise<boolean> => {
  let query;
  let filter;
  if (value.name) {
    query = gql`
      query ($name: String) {
        organizations(filters: { name: { eq: $name } }) {
          data {
            id
          }
        }
      }
    `;
    filter = value.name;
  } else {
    query = gql`
      query ($code: String) {
        organizations(filters: { code: { eq: $code } }) {
          data {
            id
          }
        }
      }
    `;
    filter = value.code;
  }
  const { data } = await fetcher<Organization[]>(jwt, query, {
    [value.name ? "name" : "code"]: filter,
  });

  return data.organizations.length > 0;
};

/**
 * Retrieves basic information about an organization based on its unique code or alias.
 *
 * @param {string} codeOrAlias - The code or alias of the organization to retrieve the ID for.
 * @returns {Promise<OrganizationInfo | undefined>} - A Promise that resolves to the basic information of the organization, or undefined if not found.
 */
export const getBasicOrganizationByCodeOrAlias = async (codeOrAlias: string): Promise<OrganizationInfo | undefined> => {
  const query = gql`
    query ($codeOrAlias: String!) {
      organizations(
        filters: { or: [{ code: { eq: $codeOrAlias } }, { alias: { eq: $codeOrAlias } }], publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            code
            slug
            alias
            logo {
              data {
                id
                attributes {
                  url
                  previewUrl
                }
              }
            }
            name
            internationalName
            abbreviationName
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationInfo[]>(STRAPI_TOKEN_KEY, query, { codeOrAlias });
  return data?.organizations[0];
};

/**
 * Retrieve the ID of an organization based on its code or alias.
 *
 * @param {string} codeOrAlias - The code or alias of the organization to retrieve the ID for.
 * @returns {Promise<number | undefined>} A promise that resolves to the ID of the organization, or undefined if not found.
 */
export const getOrganizationIdByCodeOrAlias = async (codeOrAlias: string): Promise<number | undefined> => {
  const query = gql`
    query ($codeOrAlias: String!) {
      organizations(
        filters: { or: [{ code: { eq: $codeOrAlias } }, { alias: { eq: $codeOrAlias } }], publishedAt: { ne: null } }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationInfo[]>(STRAPI_TOKEN_KEY, query, { codeOrAlias });
  return data?.organizations[0]?.id;
};

/**
 * Checks if a user has any organizations created by them.
 * @param jwt - User's authentication JWT token.
 * @param userId - ID of the user to check.
 * @returns {Promise<boolean>} - Returns true if the user has created at least one organization, otherwise returns false.
 */
export const checkOrganizationExistsByOwner = async (jwt: string, userId: number): Promise<boolean> => {
  const query = gql`
    query ($userId: ID) {
      organizations(filters: { publishedAt: { ne: null }, createdByUser: { id: { eq: $userId } } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<Organization[]>(jwt, query, {
    userId,
  });

  return data.organizations.length > 0;
};

/**
 * Retrieves the information of an organization based on its ID.
 * @param jwt - User's authentication JWT token.
 * @param organizationId - ID of the organization to retrieve.
 * @returns {Promise<OrganizationInfo>} - A promise that resolves to the organization information.
 */
export const getOrganizationReportInfo = async (jwt: string, organizationId: number): Promise<OrganizationInfo> => {
  const query = gql`
    query ($organizationId: ID) {
      organizations(filters: { id: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            name
            taxCode
            abbreviationName
            internationalName
            phoneNumber
            email
            website
            businessAddress
            contactName
            contactPosition
            contactEmail
            contactPhoneNumber
            logo {
              data {
                id
                attributes {
                  url
                  previewUrl
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationInfo[]>(jwt, query, { organizationId });
  return data?.organizations[0];
};
