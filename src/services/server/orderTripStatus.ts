import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { UpdateStatusInputForm } from "@/forms/orderTrip";
import { OrderTripStatusInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Creates an order trip status and associates it with the specified order trip, driver report, and created by user.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client used for database transactions.
 * @param {UpdateStatusInputForm} entity - An object containing the information for the new order trip status.
 * @param {number} orderTripStatusOrder - The order of the status within the order trip.
 * @returns {Promise<number>} The ID of the newly created order trip status.
 */
export const createOrderTripStatus = async (
  prisma: PrismaClientTransaction,
  entity: UpdateStatusInputForm,
  orderTripStatusOrder: number
) => {
  const { id, organizationId, status, billOfLading, createdById, driverReportId, notes } = trim(entity);
  const userId = Number(createdById);

  const createdOrderTripStatusResult = await prisma.orderTripStatus.create({
    data: {
      organizationId: Number(organizationId),
      type: status,
      ...(notes && { notes }),
      publishedAt: new Date(),
    },
  });

  if (status || billOfLading) {
    await prisma.orderTrip.update({
      where: { id: Number(id) },
      data: {
        ...(billOfLading && { billOfLading }),
        ...(status && { lastStatusType: status }),
      },
    });
  }

  const orderTripStatusId = createdOrderTripStatusResult.id;

  await prisma.orderTripStatusesTripLinks.create({
    data: { orderTripStatusId, orderTripId: Number(id), orderTripStatusOrder },
  });
  await prisma.orderTripStatusesDriverReportLinks.create({
    data: { orderTripStatusId, driverReportId: Number(driverReportId) },
  });
  await prisma.orderTripStatusesCreatedByUserLinks.create({ data: { orderTripStatusId, userId } });
  await prisma.orderTripStatusesUpdatedByUserLinks.create({ data: { orderTripStatusId, userId } });

  return orderTripStatusId;
};

/**
 * Retrieves all order trip statuses associated with a specific trip.
 *
 * @param {string} jwt - The JSON Web Token (JWT) used for authentication.
 * @param {number} organizationId - The ID of the organization the trip belongs to.
 * @param {number} tripId - The ID of the trip to retrieve order trip statuses for.
 * @returns {Promise<OrderTripStatusInfo[]>} An array of order trip status objects.
 */
export const getOrderTripStatusesByTripId = async (
  jwt: string,
  organizationId: number,
  tripId: number
): Promise<OrderTripStatusInfo[]> => {
  const query = gql`
    query ($organizationId: Int, $tripId: ID!) {
      orderTripStatuses(filters: { organizationId: { eq: $organizationId }, trip: { id: { eq: $tripId } } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripStatusInfo[]>(jwt, query, {
    organizationId,
    tripId,
  });

  return data.orderTripStatuses;
};
