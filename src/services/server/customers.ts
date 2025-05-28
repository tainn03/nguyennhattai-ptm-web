import { CustomerType } from "@prisma/client";
import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { CustomerInputForm } from "@/forms/customer";
import { CustomerInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

/**
 * Check if a customer's data has been exclusively updated by another user based on its last updated timestamp.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {number} id - The ID of the customer to check.
 * @param {Date | string} lastUpdatedAt - The timestamp of the customer's last update.
 * @returns {Promise<boolean>} A promise that resolves to true if the customer's data has been exclusively updated, false otherwise.
 */
export const checkCustomerExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      customers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data.customers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Check if a customer's code already exists within the organization, excluding a specific customer by ID if needed.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to which the customer belongs.
 * @param {string} code - The customer code to check for existence.
 * @param {number} excludeId - (Optional) The ID of the customer to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if a customer with the provided code exists (excluding the optional customer by ID), or false if not.
 */
export const checkCustomerCodeExists = async (
  jwt: string,
  organizationId: number,
  code: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $code: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      customers(
        filters: {
          organizationId: { eq: $organizationId }
          code: { eq: $code }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<CustomerInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    code,
    organizationId,
  });

  return data.customers.length > 0;
};

/**
 * Update an existing customer's data based on the provided entity and optionally link it to a user.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - The updated data for the customer (partial data, may exclude some fields).
 * @param {number | null} userLinkId - The ID of the associated user or null if not linked to a user.
 * @returns {Promise<CustomerInfo | undefined>} A promise that resolves to the updated customer or undefined.
 */
export const updateCustomer = async (
  jwt: string,
  entity: Partial<CustomerInputForm>,
  userLinkId?: number | null
): Promise<CustomerInfo | undefined> => {
  const { updatedById, email, contactEmail, unitOfMeasureId, meta, ...objectEntity } = trim(entity);

  const query = gql`
    mutation (
      $id: ID!
      $code: String
      $name: String!
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $contactPosition: String
      $contactName: String
      $contactEmail: String
      $contactPhoneNumber: String
      $isActive: Boolean!
      $publishedAt: DateTime
      $updatedById: ID
      $userId: ID
      $description: String
      $defaultUnitId: ID
      $meta: JSON
    ) {
      updateCustomer(
        id: $id
        data: {
          code: $code
          name: $name
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          contactPosition: $contactPosition
          contactName: $contactName
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          isActive: $isActive
          publishedAt: $publishedAt
          updatedByUser: $updatedById
          user: $userId
          description: $description
          defaultUnit: $defaultUnitId
          meta: $meta
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<CustomerInfo>(jwt, query, {
    ...objectEntity,
    email: email ? email : null,
    contactEmail: contactEmail ? contactEmail : null,
    updatedById,
    userId: userLinkId,
    defaultUnitId: unitOfMeasureId ?? null,
    meta: JSON.stringify(meta),
  });

  return data.updateCustomer;
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
  const {
    id: _,
    organizationId,
    code,
    type,
    name,
    meta,
    createdById,
    bankAccountId,
    userId: userLinkId,
    unitOfMeasureId,
    ...otherEntityProps
  } = trim(entity);
  const userId = Number(createdById);

  const result = await prisma.customer.create({
    data: {
      ...otherEntityProps,
      organizationId: Number(organizationId),
      type: type as CustomerType,
      code: ensureString(code),
      name: ensureString(name),
      meta: meta ? JSON.stringify(meta) : "",
      publishedAt: new Date(),
    },
  });
  const customerId = result.id;
  await prisma.customersCreatedByUserLinks.create({ data: { customerId, userId } });
  await prisma.customersUpdatedByUserLinks.create({ data: { customerId, userId } });
  await prisma.customersBankAccountLinks.create({ data: { customerId, bankAccountId: Number(bankAccountId) } });
  if (unitOfMeasureId) {
    await prisma.customersDefaultUnitLinks.create({ data: { customerId, unitOfMeasureId: Number(unitOfMeasureId) } });
  }

  if (userLinkId) {
    await prisma.customersUserLinks.create({ data: { customerId, userId: userLinkId } });
  }

  return customerId;
};
