import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { TripDriverExpenseResetForm } from "@/forms/tripDriverExpense";
import { updateOrderTrip } from "@/services/server/orderTrip";
import { getRouteDriverExpense } from "@/services/server/route";
import { updateTripDriverExpense } from "@/services/server/tripDriverExpense";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { TripDriverExpenseInfo } from "@/types/strapi";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * PUT handler function to reset trip driver expenses.
 * @param {ApiNextRequest} req - The Next.js API request object.
 * @param {TripDriverExpenseResetForm} requestData - The request data containing route ID and order trip IDs.
 * @returns {Object} An object containing the status, data, and message of the operation.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: TripDriverExpenseResetForm) => {
  // Extract JWT token, organization ID, and user ID from the request
  const { jwt, organizationId, userId } = getToken(req);
  // Extract route ID and order trip IDs from the request data
  const { routeId, orderTripIds } = requestData;

  // Retrieve driver expenses associated with the route
  const route = await getRouteDriverExpense(jwt, organizationId, routeId);
  const driverExpenses = route?.driverExpenses || [];

  // Perform database transaction to reset trip driver expenses for each order trip
  const result = await prisma.$transaction(async (prisma) => {
    for (const tripId of orderTripIds) {
      // Prepare trip driver expenses based on existing driver expenses for the route
      const tripDriverExpenses: Partial<TripDriverExpenseInfo>[] = [];
      for (const item of driverExpenses) {
        tripDriverExpenses.push({
          driverExpense: {
            id: Number(item.driverExpense?.id),
          },
          trip: {
            id: tripId,
          },
          amount: item.amount || 0,
        });
      }
      // Update trip driver expenses in the database
      const driverCost = await updateTripDriverExpense(prisma, organizationId, tripDriverExpenses);
      // Update order trip details with updated driver cost and other related information
      await updateOrderTrip(prisma, {
        id: tripId,
        organizationId,
        updatedById: userId,
        driverCost,
        ...(route?.subcontractorCost && { subcontractorCost: route.subcontractorCost }),
        ...(route?.bridgeToll && { bridgeToll: route.bridgeToll }),
        ...(route?.otherCost && { otherCost: route.otherCost }),
      });
    }
    // Return true if the transaction is successful
    return true;
  });

  // Return response based on the transaction result
  if (result) {
    return { status: HttpStatusCode.Ok, data: result, message: "Trip driver expenses reset successfully." };
  } else {
    return {
      status: HttpStatusCode.InternalServerError,
      code: ErrorType.UNKNOWN,
      message: "Failed to reset trip driver expenses.",
    };
  }
});
