import { CustomerType } from "@prisma/client";
import { gql } from "graphql-request";
import isBoolean from "lodash/isBoolean";
import moment from "moment";

import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { CustomerInputForm } from "@/forms/customer";
import { ApiError, HttpStatusCode } from "@/types/api";
import { CustomerInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, randomString, trim } from "@/utils/string";

/**
 * Checks if a customer code exists within an organization, optionally excluding a specific customer ID.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} code - The customer code to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a customer to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer code exists, otherwise false.
 */
export const checkCustomerCodeExists = async (
  prisma: PrismaClientTransaction,
  organizationId: number,
  code: string,
  excludeId?: number
): Promise<boolean> => {
  const result = await prisma.customer.findFirst({
    where: {
      organizationId,
      code,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });

  return !!result?.id;
};

/**
 * Check if a customer's data has been exclusively updated by another user based on its last updated timestamp.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to check.
 * @param {Date | string} lastUpdatedAt - The timestamp of the customer's last update.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer's data has been exclusively updated, false otherwise.
 */
export const checkCustomerExclusives2 = async (
  organizationId: number,
  id: number,
  lastUpdatedAt?: Date | string
): Promise<boolean> => {
  const result = await prisma.customer.findFirst({
    where: { organizationId, id },
    select: { updatedAt: true },
  });

  return !moment(result?.updatedAt).isSame(lastUpdatedAt);
};

/**
 * Create a new customer with the provided data and link it to a bank account and a user (if applicable).
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {Object} entity - The data of the customer to be created, excluding the 'id' property.
 * @returns {Promise<number>} A promise that resolves to the ID of the newly created customer.
 */
export const createCustomer = async (
  prisma: PrismaClientTransaction,
  entity: Partial<CustomerInputForm>
): Promise<number> => {
  const { id: _, organizationId, type, code, name, meta, createdById, ...otherEntityProps } = trim(entity);

  let customerCode = code;
  let isCodeExists = true;
  if (customerCode) {
    isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode);
    if (isCodeExists) {
      throw new ApiError(HttpStatusCode.Conflict, "CUSTOMER");
    }
  } else {
    while (isCodeExists) {
      customerCode = randomString(10);
      isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode);
    }
  }

  const userId = Number(createdById);
  const result = await prisma.customer.create({
    data: {
      ...otherEntityProps,
      organizationId: Number(organizationId),
      type: type as CustomerType,
      name: ensureString(name),
      code: ensureString(customerCode),
      meta: meta ? meta : "",
      publishedAt: new Date(),
    },
  });
  const customerId = result.id;
  await prisma.customersCreatedByUserLinks.create({ data: { customerId, userId } });
  await prisma.customersUpdatedByUserLinks.create({ data: { customerId, userId } });

  return customerId;
};

/**
 * Update an existing customer with the provided data and link it to a bank account and a user (if applicable).
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {Object} entity - The data of the customer to be updated, excluding the 'id' property.
 * @returns {Promise<number>} A promise that resolves to the ID of the updated customer.
 */
export const updateCustomer2 = async (prisma: PrismaClientTransaction, entity: CustomerInputForm): Promise<number> => {
  const { id, code, name, meta, updatedById, ...otherEntityProps } = trim(entity);
  const userId = Number(updatedById);

  const result = await prisma.customer.update({
    where: { id: Number(id) },
    data: {
      ...otherEntityProps,
      ...(name && { name: ensureString(name) }),
      ...(code && { code: ensureString(code) }),
      ...(meta && { meta }),
    },
  });
  const customerId = result.id;
  await prisma.customersUpdatedByUserLinks.updateMany({ where: { customerId }, data: { userId } });

  return customerId;
};

/**
 * Fetch customer information from the server based on the provided organization and customer ID.
 *
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to fetch.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the customer information or null if not found.
 */
export const getCustomerNotificationData = async (
  jwt: string,
  organizationId: number,
  id: number
): Promise<CustomerInfo | undefined> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          attributes {
            code
            name
          }
        }
      }
    }
  `;
  const { data } = await fetcher<CustomerInfo[]>(jwt, query, { organizationId, id });

  return data?.customers[0];
};

/**
 * Create a new customer with the provided data and link it to a bank account and a user (if applicable).
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - The data of the customer to be created, excluding the 'id' property.
 * @returns {Promise<number>} A promise that resolves to the ID of the newly created customer.
 */
export const createCustomerByGraphQL = async (jwt: string, entity: CustomerInputForm): Promise<CustomerInfo> => {
  const { code, organizationId, isActive, ...rest } = trim(entity);
  let customerCode = code;
  let isCodeExists = true;
  if (customerCode) {
    isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode);
    if (isCodeExists) {
      throw new ApiError(HttpStatusCode.Conflict, "CUSTOMER");
    }
  } else {
    while (isCodeExists) {
      customerCode = randomString(10);
      isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode);
    }
  }

  const query = gql`
    mutation (
      $organizationId: Int!
      $code: String!
      $name: String!
      $type: ENUM_CUSTOMER_TYPE!
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $contactName: String
      $contactPosition: String
      $contactEmail: String
      $contactPhoneNumber: String
      $bankAccount: ID
      $meta: JSON
      $description: String
      $isActive: Boolean
      $defaultUnit: ID
      $customerGroups: [ID]
      $user: ID
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createCustomer(
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          type: $type
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          contactName: $contactName
          contactPosition: $contactPosition
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          bankAccount: $bankAccount
          meta: $meta
          description: $description
          isActive: $isActive
          defaultUnit: $defaultUnit
          customerGroups: $customerGroups
          user: $user
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerInfo>(jwt, query, {
    organizationId: Number(organizationId),
    code: customerCode,
    name: rest.name ? rest.name : "",
    type: rest.type,
    isActive: isActive ?? true,
    ...(rest.taxCode && { taxCode: rest.taxCode }),
    ...(rest.email && { email: rest.email }),
    ...(rest.phoneNumber && { phoneNumber: rest.phoneNumber }),
    ...(rest.website && { website: rest.website }),
    ...(rest.businessAddress && { businessAddress: rest.businessAddress }),
    ...(rest.contactName && { contactName: rest.contactName }),
    ...(rest.contactPosition && { contactPosition: rest.contactPosition }),
    ...(rest.contactEmail && { contactEmail: rest.contactEmail }),
    ...(rest.contactPhoneNumber && { contactPhoneNumber: rest.contactPhoneNumber }),
    ...(rest.bankAccount?.id && { bankAccount: Number(rest.bankAccount.id) }),
    ...(rest.meta && { meta: JSON.stringify(rest.meta) }),
    ...(rest.description && { description: rest.description }),
    ...(rest.defaultUnit?.id && { defaultUnit: Number(rest.defaultUnit.id) }),
    ...(rest.customerGroups && {
      customerGroups: rest.customerGroups.map((group) => Number(group.id)),
    }),
    ...(rest.user && { user: rest.user }),
    createdByUser: rest.createdByUser,
    publishedAt: new Date().toISOString(),
  });

  return data.createCustomer;
};

/**
 * Update an existing customer with the provided data and link it to a bank account and a user (if applicable).
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - The data of the customer to be updated, excluding the 'id' property.
 * @returns {Promise<number>} A promise that resolves to the ID of the updated customer.
 */
export const updateCustomerByGraphQL = async (jwt: string, entity: CustomerInputForm): Promise<CustomerInfo> => {
  const { organizationId, id, code, name, type, meta, updatedById, ...rest } = trim(entity);

  let customerCode = code;
  let isCodeExists = true;
  if (customerCode) {
    isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode, id);
    if (isCodeExists) {
      throw new ApiError(HttpStatusCode.Conflict, "CUSTOMER");
    }
  } else {
    while (isCodeExists) {
      customerCode = randomString(10);
      isCodeExists = await checkCustomerCodeExists(prisma, Number(organizationId), customerCode);
    }
  }

  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int!
      $code: String!
      $name: String!
      $type: ENUM_CUSTOMER_TYPE!
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $contactName: String
      $contactPosition: String
      $contactEmail: String
      $contactPhoneNumber: String
      $bankAccount: ID
      $meta: JSON
      $description: String
      $isActive: Boolean
      $defaultUnit: ID
      $customerGroups: [ID]
      $user: ID
      $updatedByUser: ID
    ) {
      updateCustomer(
        id: $id
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          type: $type
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          contactName: $contactName
          contactPosition: $contactPosition
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          bankAccount: $bankAccount
          meta: $meta
          description: $description
          isActive: $isActive
          defaultUnit: $defaultUnit
          customerGroups: $customerGroups
          user: $user
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerInfo>(jwt, query, {
    organizationId,
    id,
    type,
    code: customerCode,
    name: name ?? "",
    taxCode: rest.taxCode ?? null,
    email: rest.email ?? null,
    phoneNumber: rest.phoneNumber ?? null,
    website: rest.website ?? null,
    businessAddress: rest.businessAddress ?? null,
    contactName: rest.contactName ?? null,
    contactPosition: rest.contactPosition ?? null,
    contactEmail: rest.contactEmail ?? null,
    contactPhoneNumber: rest.contactPhoneNumber ?? null,
    bankAccount: rest.bankAccount?.id ? Number(rest.bankAccount.id) : null,
    meta: meta ? JSON.stringify(meta) : null,
    description: rest.description ?? null,
    defaultUnit: rest.defaultUnit?.id ? Number(rest.defaultUnit.id) : null,
    customerGroups: rest.customerGroups ? rest.customerGroups.map((group) => Number(group.id)) : null,
    user: rest.user?.id ?? null,
    ...(isBoolean(rest.isActive) && { isActive: rest.isActive }),
    updatedByUser: updatedById,
  });

  return data.updateCustomer;
};
