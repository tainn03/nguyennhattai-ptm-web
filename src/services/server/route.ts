import { RouteType } from "@prisma/client";
import { gql } from "graphql-request";

import { upsertRouteDriverExpense } from "@/actions/routeDriverExpense";
import { PrismaClientTransaction } from "@/configs/prisma";
import { RouteInputForm } from "@/forms/route";
import { AnyObject } from "@/types";
import { OrganizationSettingInfo, RouteInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { ensureString, trim } from "@/utils/string";

import { createRouteDriverExpense, updateRouteDriverExpense } from "./routeDriverExpense";
import { createRoutePoint } from "./routePoint";

/**
 * Checks if an route with a specific code exists in a given organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization to check within.
 * @param {string} code - The code of the route to check for existence.
 * @param {number} customerId - The customerId of the route to check for existence.
 * @returns {Promise<boolean>} - Returns `true` if an route with the specified code exists, otherwise `false`.
 */
export const checkRouteCodeExists = async (
  jwt: string,
  organizationId: number,
  customerId: number,
  code: string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $code: String!, $customerId: Int!) {
      routes(
        filters: {
          organizationId: { eq: $organizationId }
          code: { eq: $code }
          customerId: { eq: $customerId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RouteInfo[]>(jwt, query, { code, organizationId, customerId });

  return data.routes.length > 0;
};

/**
 * Creates a new Route record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for creating a new Route record, excluding the ID.
 * @returns A promise that resolves to the ID of the newly created Route record.
 */
export const createRoute = async (
  prisma: PrismaClientTransaction,
  entity: Partial<RouteInputForm>
): Promise<number> => {
  const {
    id: _,
    organizationId,
    customerId,
    code,
    name,
    pickupPoints,
    deliveryPoints,
    createdById,
    driverExpenses,
    ...otherEntities
  } = trim(entity);

  const userId = Number(createdById);
  const createdRoute = await prisma.route.create({
    data: {
      ...otherEntities,
      organizationId: Number(organizationId),
      customerId: Number(customerId),
      code: ensureString(code),
      name: ensureString(name),
      type: entity.type as RouteType,
      publishedAt: new Date(),
    },
  });
  const routeId = createdRoute.id;

  if (pickupPoints && pickupPoints.length > 0) {
    let displayOrder = 0;
    for (const point of pickupPoints) {
      displayOrder++;
      // const routePointId = await createRoutePoint(prisma, {
      //   ...deleteProperties(point, ["tempId"]),
      //   organizationId,
      //   displayOrder,
      //   createdById,
      // });
      await prisma.routesPickupPointsLinks.create({
        data: { routePointId: Number(point.id!), routeId, routePointOrder: displayOrder },
      });
    }
  }

  if (deliveryPoints && deliveryPoints?.length > 0) {
    let displayOrder = 0;
    for (const point of deliveryPoints) {
      displayOrder++;
      // const routePointId = await createRoutePoint(prisma, {
      //   ...deleteProperties(point, ["tempId"]),
      //   organizationId,
      //   displayOrder: ++displayOrder,
      //   createdById,
      // });
      await prisma.routesDeliveryPointsLinks.create({
        data: { routePointId: Number(point.id!), routeId, routePointOrder: displayOrder },
      });
    }
  }

  if (driverExpenses && driverExpenses.length > 0) {
    let routeDriverExpenseOrder = 0;
    for (const expense of driverExpenses) {
      const routeDriverExpenseId = await createRouteDriverExpense(prisma, {
        organizationId,
        amount: expense.amount,
      });
      await prisma.routeDriverExpensesDriverExpenseLinks.create({
        data: {
          driverExpenseId: Number(expense.driverExpense?.id),
          routeDriverExpenseId,
        },
      });
      await prisma.routeDriverExpensesRouteLinks.create({
        data: {
          routeId,
          routeDriverExpenseId,
          routeDriverExpenseOrder: routeDriverExpenseOrder++,
        },
      });
    }
  }

  await prisma.routesCreatedByUserLinks.create({ data: { routeId, userId } });
  await prisma.routesUpdatedByUserLinks.create({ data: { routeId, userId } });

  return routeId;
};

/**
 * Checks if a route has been updated by another user since the last update.
 *
 * @param jwt - The JWT of the current user.
 * @param organizationId - The ID of the organization to search within.
 * @param id - The ID of the route to check.
 * @param lastUpdatedAt - The last updated date of the route to check.
 * @returns A promise that resolves to true if the route has been updated, otherwise false.
 */
export const checkRouteExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      routes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<RouteInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data.routes[0].updatedAt !== lastUpdatedAt;
};

/**
 * Updates an existing Route record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for updating an existing Route record, including the ID.
 * @returns A promise that resolves to the ID of the updated Route record.
 */
export const updateRoute = async (
  prisma: PrismaClientTransaction,
  entity: Partial<RouteInputForm>
): Promise<number> => {
  const {
    id,
    organizationId,
    customerId,
    code,
    name,
    pickupPoints,
    deliveryPoints,
    updatedById,
    driverExpenses,
    createdByUser: _createdByUser,
    updatedAt: _updatedAt,
    ...otherEntities
  } = trim(entity);

  const userId = Number(updatedById);
  const updatedRoute = await prisma.route.update({
    where: { id: Number(id) },
    data: {
      ...otherEntities,
      customerId: Number(customerId),
      code: ensureString(code),
      name: ensureString(name),
    },
  });

  const routeId = updatedRoute.id;

  if (pickupPoints && pickupPoints.length > 0) {
    let displayOrder = 0;
    for (const point of pickupPoints) {
      displayOrder++;
      const routePointId = await createRoutePoint(prisma, {
        ...point,
        organizationId,
        displayOrder,
        createdById: updatedById,
      });
      await prisma.routesPickupPointsLinks.create({ data: { routePointId, routeId, routePointOrder: displayOrder } });
    }
  }

  const currentDeliveryPoints = await prisma.routesDeliveryPointsLinks.findMany({
    where: { routeId },
    select: { routePointId: true },
  });
  const currentDeliveryPointIds = currentDeliveryPoints.map((point) => Number(point.routePointId));
  await prisma.routesDeliveryPointsLinks.deleteMany({ where: { routeId } });
  await prisma.routePoint.deleteMany({ where: { id: { in: currentDeliveryPointIds } } });

  if (deliveryPoints && deliveryPoints?.length > 0) {
    let displayOrder = 0;
    for (const point of deliveryPoints) {
      displayOrder++;
      const routePointId = await createRoutePoint(prisma, {
        ...point,
        organizationId,
        displayOrder: ++displayOrder,
        createdById: updatedById,
      });
      await prisma.routesDeliveryPointsLinks.create({ data: { routePointId, routeId, routePointOrder: displayOrder } });
    }
  }

  if (driverExpenses && driverExpenses.length > 0) {
    let routeDriverExpenseOrder = 0;
    await prisma.routeDriverExpensesRouteLinks.deleteMany({ where: { routeId } });
    for (const expense of driverExpenses) {
      const routeDriverExpenseId = await updateRouteDriverExpense(prisma, {
        id: expense.id,
        organizationId,
        amount: expense.amount,
      });
      await prisma.routeDriverExpensesDriverExpenseLinks.deleteMany({ where: { routeDriverExpenseId } });
      await prisma.routeDriverExpensesDriverExpenseLinks.create({
        data: {
          driverExpenseId: Number(expense.driverExpense?.id),
          routeDriverExpenseId,
        },
      });
      await prisma.routeDriverExpensesRouteLinks.create({
        data: {
          routeId,
          routeDriverExpenseId,
          routeDriverExpenseOrder: routeDriverExpenseOrder++,
        },
      });
    }
  }

  await prisma.routesUpdatedByUserLinks.updateMany({ where: { routeId }, data: { userId } });

  return routeId;
};

/**
 * Fetch route information from the server based on the provided organization and route ID.
 *
 * @param {number} organizationId - The ID of the organization to which the route belongs.
 * @param {number} id - The ID of the route to fetch.
 * @returns {Promise<RouteInfo | undefined>} A promise that resolves to the route information or null if not found.
 */
export const getRouteNotificationData = async (
  jwt: string,
  organizationId: number,
  id: number
): Promise<RouteInfo | undefined> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      routes(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          attributes {
            code
            name
          }
        }
      }
    }
  `;
  const { data } = await fetcher<RouteInfo[]>(jwt, query, { organizationId, id });

  return data?.routes[0];
};

/**
 * Retrieves route driver expenses for a specific route.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} organizationId - The ID of the organization.
 * @param {number} routeId - The ID of the route.
 * @returns {Promise<RouteInfo | null>} A promise resolving to the route information containing driver expenses, or null if not found.
 */
export const getRouteDriverExpense = async (jwt: string, organizationId: number, routeId: number) => {
  const query = gql`
    query ($organizationId: Int!, $routeId: ID!) {
      routes(filters: { organizationId: { eq: $organizationId }, id: { eq: $routeId }, publishedAt: { ne: null } }) {
        data {
          attributes {
            driverCost
            bridgeToll
            subcontractorCost
            otherCost
            driverExpenses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  amount
                  driverExpense {
                    data {
                      id
                      attributes {
                        name
                        type
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<RouteInfo[]>(jwt, query, {
    routeId,
    organizationId,
  });

  return data.routes?.length > 0 ? data.routes[0] : null;
};

/**
 * Retrieves the maximum minimum bill of lading (BOL) submit days among active routes for a specific organization.
 * @param {string} jwt - The JSON Web Token for authentication.
 * @returns {Promise<[number | null, OrganizationSettingInfo[]]>} A promise that resolves to an array containing the maximum days in routes and settings.
 */
export const findMaxOfMinBillOfLadingSubmitDays = async (
  jwt: string
): Promise<[number | null, OrganizationSettingInfo[]]> => {
  const query = gql`
    query {
      routes(
        sort: "minBOLSubmitDays:desc"
        pagination: { limit: 1 }
        filters: { isActive: { eq: true }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            minBOLSubmitDays
          }
        }
      }
      organizationSettings(
        sort: "minBOLSubmitDays:desc"
        pagination: { limit: -1 }
        filters: { publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            minBOLSubmitDays
          }
        }
      }
    }
  `;

  const { data } = await fetcher<AnyObject>(jwt, query);
  const maxDaysInRoutes = data.routes?.length > 0 ? data.routes[0].minBOLSubmitDays : null;
  return [maxDaysInRoutes, (data?.organizationSettings || []) as OrganizationSettingInfo[]];
};

/**
 * Creates a new route record based on the provided entity data.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - The data for creating a new route record, excluding the ID.
 * @returns {Promise<number | null>} A promise that resolves to the ID of the newly created route.
 */
export const createRouteByGraphQL = async (jwt: string, entity: RouteInputForm): Promise<RouteInfo> => {
  const processedEntity = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int!
      $customerId: Int!
      $type: ENUM_ROUTE_TYPE!
      $code: String
      $name: String
      $description: String
      $isActive: Boolean
      $pickupPoints: [ID]
      $deliveryPoints: [ID]
      $distance: Float
      $price: Float
      $subcontractorCost: Float
      $driverCost: Float
      $bridgeToll: Float
      $otherCost: Float
      $minBOLSubmitDays: Int
      $driverExpenses: [ID]
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createRoute(
        data: {
          organizationId: $organizationId
          customerId: $customerId
          type: $type
          code: $code
          name: $name
          description: $description
          isActive: $isActive
          pickupPoints: $pickupPoints
          deliveryPoints: $deliveryPoints
          distance: $distance
          price: $price
          subcontractorCost: $subcontractorCost
          driverCost: $driverCost
          bridgeToll: $bridgeToll
          otherCost: $otherCost
          minBOLSubmitDays: $minBOLSubmitDays
          driverExpenses: $driverExpenses
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

  const { data } = await fetcher<RouteInfo>(jwt, query, {
    organizationId: Number(processedEntity.organizationId),
    customerId: Number(processedEntity.customerId),
    type: processedEntity.type,
    isActive: processedEntity.isActive,
    ...(processedEntity.name && { name: processedEntity.name }),
    ...(processedEntity.code && { code: processedEntity.code }),
    ...(processedEntity.description && { description: processedEntity.description }),
    ...(processedEntity.pickupPoints && {
      pickupPoints: processedEntity.pickupPoints.map((point) => Number(point.id)),
    }),
    ...(processedEntity.deliveryPoints && {
      deliveryPoints: processedEntity.deliveryPoints.map((point) => Number(point.id)),
    }),
    ...(processedEntity.distance && { distance: processedEntity.distance }),
    ...(processedEntity.price && { price: processedEntity.price }),
    ...(processedEntity.subcontractorCost && { subcontractorCost: processedEntity.subcontractorCost }),
    ...(processedEntity.driverCost && { driverCost: processedEntity.driverCost }),
    ...(processedEntity.bridgeToll && { bridgeToll: processedEntity.bridgeToll }),
    ...(processedEntity.otherCost && { otherCost: processedEntity.otherCost }),
    ...(processedEntity.minBOLSubmitDays && { minBOLSubmitDays: processedEntity.minBOLSubmitDays }),
    ...(processedEntity.driverExpenses && { driverExpenses: processedEntity.driverExpenses }),
    createdByUser: Number(processedEntity.createdById),
    publishedAt: new Date().toISOString(),
  });

  return data.createRoute;
};

/**
 * Updates an existing route record based on the provided entity data.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Object} entity - The data for updating an existing route record, including the ID.
 * @returns {Promise<RouteInfo>} - A promise that resolves to the ID of the updated route.
 */
export const updateRouteByGraphQL = async (jwt: string, entity: RouteInputForm): Promise<RouteInfo> => {
  const { organizationId, id, code, name, customerId, type, pickupPoints, deliveryPoints, ...rest } = trim(entity);

  // Array to store driver expense IDs
  const driverExpenses: number[] = [];

  // Process driver expenses if they exist
  if (rest?.driverExpenses && rest.driverExpenses.length > 0) {
    // Iterate through each expense and upsert it
    for (const expense of rest?.driverExpenses ?? []) {
      // Create or update the route driver expense record
      const { data: routeDriverExpense } = await upsertRouteDriverExpense({
        ...(expense.id && { id: expense.id }),
        organizationId,
        amount: expense.amount,
        driverExpense: expense.driverExpense,
      });

      // Add the expense ID to the array if it exists
      if (routeDriverExpense?.id) {
        driverExpenses.push(routeDriverExpense.id);
      }
    }
  }

  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int
      $customerId: Int
      $type: ENUM_ROUTE_TYPE
      $code: String
      $name: String
      $description: String
      $isActive: Boolean
      $pickupPoints: [ID]
      $deliveryPoints: [ID]
      $distance: Float
      $price: Float
      $subcontractorCost: Float
      $driverCost: Float
      $bridgeToll: Float
      $otherCost: Float
      $minBOLSubmitDays: Int
      $driverExpenses: [ID]
      $updatedByUser: ID
    ) {
      updateRoute(
        id: $id
        data: {
          organizationId: $organizationId
          customerId: $customerId
          type: $type
          code: $code
          name: $name
          description: $description
          isActive: $isActive
          pickupPoints: $pickupPoints
          deliveryPoints: $deliveryPoints
          distance: $distance
          price: $price
          subcontractorCost: $subcontractorCost
          driverCost: $driverCost
          bridgeToll: $bridgeToll
          otherCost: $otherCost
          minBOLSubmitDays: $minBOLSubmitDays
          driverExpenses: $driverExpenses
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RouteInfo>(jwt, query, {
    id: Number(id),
    name: name ?? null,
    organizationId: organizationId ? Number(organizationId) : null,
    customerId: customerId ? Number(customerId) : null,
    type: type ?? null,
    code: code ?? null,
    description: rest.description ?? null,
    isActive: rest.isActive,
    pickupPoints: (pickupPoints || []).map((point) => Number(point.id)),
    deliveryPoints: (deliveryPoints || []).map((point) => Number(point.id)),
    distance: rest.distance ?? null,
    price: rest.price ?? null,
    subcontractorCost: rest.subcontractorCost ?? null,
    driverCost: rest.driverCost ?? null,
    bridgeToll: rest.bridgeToll ?? null,
    otherCost: rest.otherCost ?? null,
    minBOLSubmitDays: rest.minBOLSubmitDays ?? null,
    driverExpenses: driverExpenses ?? null,
    updatedByUser: Number(rest.updatedById),
  });

  return data.updateRoute;
};

/**
 * Upserts a route record by GraphQL.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {RouteInputForm} entity - The data for upserting a route record.
 * @returns {Promise<RouteInfo>} - A promise that resolves to the ID of the upserted route.
 */
export const upsertRouteByGraphQL = async (jwt: string, entity: RouteInputForm): Promise<RouteInfo> => {
  if (entity.id) {
    return updateRouteByGraphQL(jwt, entity);
  }

  return createRouteByGraphQL(jwt, entity);
};
