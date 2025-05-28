import { Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { RoutePointInputForm } from "@/forms/routePoint";
import { RoutePointInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

import { createAddressInformation, updateAddressInformation } from "./addressInformation";

/**
 * Creates a new RoutePoint record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for creating a new RoutePoint record, excluding the ID.
 * @returns A promise that resolves to the ID of the newly created RoutePoint record.
 */
export const createRoutePoint = async (
  prisma: PrismaClientTransaction,
  entity: Partial<RoutePointInputForm>
): Promise<number> => {
  const {
    id: _,
    organizationId,
    name,
    code,
    contactName,
    contactEmail,
    contactPhoneNumber,
    notes,
    address,
    createdById,
    pickupTimes,
    deliveryTimes,
    ...otherEntities
  } = trim(entity);

  const addressId = await createAddressInformation(prisma, { ...address, createdById });
  const result = await prisma.routePoint.create({
    data: {
      ...otherEntities,
      organizationId: Number(organizationId),
      name: ensureString(name),
      code: ensureString(code),
      contactName: ensureString(contactName),
      contactEmail: ensureString(contactEmail),
      contactPhoneNumber: ensureString(contactPhoneNumber),
      notes: ensureString(notes),
      pickupTimes: pickupTimes ?? [],
      deliveryTimes: deliveryTimes ?? [],
      publishedAt: new Date(),
    } as Prisma.RoutePointCreateInput,
  });
  const routePointId = result.id;
  await prisma.routePointsAddressLinks.create({ data: { routePointId, addressId } });

  return routePointId;
};

/**
 * Updates an existing RoutePoint record based on the provided entity data.
 *
 * @param prisma - An instance of PrismaClientTransaction used for database operations.
 * @param entity - An object representing the updated route point data.
 * @returns A Promise that resolves to a number indicating the number of route points updated.
 */
export const updateRoutePoint = async (
  prisma: PrismaClientTransaction,
  entity: RoutePointInputForm
): Promise<number> => {
  const {
    id,
    organizationId,
    name,
    contactName,
    contactEmail,
    contactPhoneNumber,
    notes,
    address,
    updatedById,
    pickupTimes,
    deliveryTimes,
    ...otherEntities
  } = trim(entity);

  await updateAddressInformation(prisma, { ...address, updatedById });
  const result = await prisma.routePoint.update({
    where: { id: Number(id) },
    data: {
      ...otherEntities,
      organizationId: Number(organizationId),
      name: ensureString(name),
      contactName: ensureString(contactName),
      contactEmail: ensureString(contactEmail),
      contactPhoneNumber: ensureString(contactPhoneNumber),
      notes: ensureString(notes),
      pickupTimes: pickupTimes ?? [],
      deliveryTimes: deliveryTimes ?? [],
    },
  });

  return result.id;
};

/**
 * Create a new RoutePoint record by sending a GraphQL mutation with the provided data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating a new RoutePoint record.
 * @returns A promise that resolves to the created RoutePoint or undefined.
 */
export const createRoutePointByGraphQL = async (jwt: string, entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $code: String
      $name: String
      $address: ID
      $contactName: String
      $contactEmail: String
      $contactPhoneNumber: String
      $notes: String
      $displayOrder: Int
      $publishedAt: DateTime
    ) {
      createRoutePoint(
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          address: $address
          contactName: $contactName
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          notes: $notes
          displayOrder: $displayOrder
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RoutePointInfo>(jwt, query, {
    ...(processedEntity.organizationId && { organizationId: Number(processedEntity.organizationId) }),
    ...(processedEntity.code && { code: processedEntity.code }),
    ...(processedEntity.name && { name: processedEntity.name }),
    ...(processedEntity.address?.id && { address: Number(processedEntity.address.id) }),
    ...(processedEntity.contactName && { contactName: processedEntity.contactName }),
    ...(processedEntity.contactEmail && { contactEmail: processedEntity.contactEmail }),
    ...(processedEntity.contactPhoneNumber && { contactPhoneNumber: processedEntity.contactPhoneNumber }),
    ...(processedEntity.notes && { notes: processedEntity.notes }),
    ...(processedEntity.displayOrder && { displayOrder: Number(processedEntity.displayOrder) }),
    publishedAt: new Date().toISOString(),
  });

  return data.createRoutePoint;
};

/**
 * Updates an existing RoutePoint record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an existing RoutePoint record, including the ID.
 * @returns A promise that resolves to the ID of the updated RoutePoint record.
 */
export const updateRoutePointByGraphQL = async (jwt: string, entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  const { id, organizationId, code, name, address, contactName, contactEmail, ...rest } = trim(entity);
  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int
      $code: String
      $name: String
      $address: ID
      $contactName: String
      $contactEmail: String
      $contactPhoneNumber: String
      $notes: String
      $displayOrder: Int
    ) {
      updateRoutePoint(
        id: $id
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          address: $address
          contactName: $contactName
          contactEmail: $contactEmail
          contactPhoneNumber: $contactPhoneNumber
          notes: $notes
          displayOrder: $displayOrder
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RoutePointInfo>(jwt, query, {
    id,
    organizationId: organizationId ? Number(organizationId) : null,
    code: code ?? null,
    name: name ?? null,
    address: address?.id ? Number(address.id) : null,
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhoneNumber: rest.contactPhoneNumber ?? null,
    notes: rest.notes ?? null,
    displayOrder: rest.displayOrder ?? null,
  });

  return data.updateRoutePoint;
};

/**
 * Upsert a RoutePoint record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for creating or updating a RoutePoint record.
 * @returns A promise that resolves to the created or updated RoutePoint record.
 */
export const upsertRoutePointByGraphQL = async (jwt: string, entity: RoutePointInputForm): Promise<RoutePointInfo> => {
  if (entity.id) {
    return updateRoutePointByGraphQL(jwt, entity);
  }
  return createRoutePointByGraphQL(jwt, entity);
};
