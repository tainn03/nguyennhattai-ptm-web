import { NotificationType, OrderTripStatusType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import isNil from "lodash/isNil";

import { prisma } from "@/configs/prisma";
import { TripDriverExpenseRequest } from "@/forms/tripDriverExpense";
import { updateOrderTrip } from "@/services/server/orderTrip";
import { getTripDriverExpensesByTripId, updateTripDriverExpense } from "@/services/server/tripDriverExpense";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { OrderTripInfo, TripDriverExpenseInfo } from "@/types/strapi";
import { pushNotification } from "@/utils/notification";
import { formatCurrency } from "@/utils/number";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles the HTTP POST request for creating or updating trip driver expenses.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {TripDriverExpenseRequest} requestData - The request data containing trip driver expense information.
 * @returns {Promise<ApiResponse<number>>} A promise that resolves with the API response, including the created or updated trip driver expense ID.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: TripDriverExpenseRequest) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { data, subcontractorCost, bridgeToll, otherCost, notes } = requestData;

  const tripId = data[0]?.trip?.id && Number(data[0].trip.id);
  if (!tripId) {
    return { status: HttpStatusCode.BadRequest, message: "Trip ID is required." };
  }

  const [tripDriverExpenses, orderTrip] = await getTripDriverExpensesByTripId<[TripDriverExpenseInfo[], OrderTripInfo]>(
    jwt,
    {
      organizationId,
      trip: { id: tripId },
    },
    true
  );
  const oldExpense = tripDriverExpenses.reduce((acc, item) => acc + (item.amount || 0), 0);

  const result = await prisma.$transaction(async (prisma) => {
    // Create or update trip driver expenses in the database
    const driverCost = await updateTripDriverExpense(prisma, organizationId, data);

    // Update the order trip with the new cost information
    await updateOrderTrip(prisma, {
      id: tripId,
      organizationId,
      updatedById: userId,
      driverCost,
      subcontractorCost,
      bridgeToll,
      otherCost,
      notes,
    });

    return driverCost;
  });

  const { driver, code, lastStatusType } = orderTrip;
  if (driver?.user?.id && code && lastStatusType === OrderTripStatusType.COMPLETED && result !== oldExpense) {
    pushNotification({
      entity: {
        organizationId,
        createdById: userId,
        targetId: tripId,
        type: NotificationType.TRIP_DRIVER_EXPENSE_CHANGED,
      },
      data: {
        tripCode: code,
        oldExpense: formatCurrency(oldExpense),
        newExpense: formatCurrency(result),
      },
      receivers: [{ user: { id: driver?.user?.id } }],
      isSendToParticipants: false,
      jwt,
    });
  }

  if (!isNil(result)) {
    return { status: HttpStatusCode.Ok, data: true, message: "Trip driver expenses created successfully." };
  } else {
    return {
      status: HttpStatusCode.InternalServerError,
      code: ErrorType.UNKNOWN,
      message: "Failed to create trip driver expenses.",
    };
  }
});
