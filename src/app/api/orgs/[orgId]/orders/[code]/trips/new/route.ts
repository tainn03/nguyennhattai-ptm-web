import { OrderTripStatusType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { OrderTripInputForm } from "@/forms/orderTrip";
import { getDriverReportByType } from "@/services/server/driverReport";
import { createOrderTrip } from "@/services/server/orderTrip";
import { getRouteDriverExpense } from "@/services/server/route";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the creation of a new order trip, incorporating the provided request data.
 * Returns an OK response with the result of the transaction if successful, or an Internal Server Error response otherwise.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {OrderTripInputForm} requestData - The data for creating a new order trip.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: OrderTripInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { id: _, numberTripDelivery, remainingWeight, ...orderTrip } = requestData;
  const tripCount = numberTripDelivery ?? 1;

  // Check for the existence of a driver report with the type 'NEW'.
  const newTripDriverReport = await getDriverReportByType(jwt, Number(organizationId), OrderTripStatusType.NEW);

  // If a new trip driver report is found, perform a transaction to create the new order trip and associated entities.
  if (newTripDriverReport) {
    const route = await getRouteDriverExpense(jwt, organizationId, Number(orderTrip.order?.route?.id));

    let remainingWeightCurr = remainingWeight ?? 0;
    let operationTimeout = 20000;
    if (100 * tripCount > operationTimeout) {
      // 100 ms for one trip
      operationTimeout = 100 * tripCount;
    }

    const result = await prisma.$transaction(
      async (prisma) => {
        for (let numTrip = 1; numTrip <= tripCount; numTrip++) {
          let weight = orderTrip.weight ?? 0;

          // In case, remaining weight less than weight then set weight is remaining weight
          if (remainingWeightCurr < weight) {
            weight = remainingWeightCurr;
          }

          const createdOrderId = await createOrderTrip(
            prisma,
            {
              ...orderTrip,
              weight,
              organizationId,
              createdById,
              driverReportId: newTripDriverReport.id,
            },
            jwt,
            route,
            { isPushOrderInProgressNotification: true }
          );

          // Calculate remaining weight
          remainingWeightCurr = remainingWeightCurr - weight;

          // If loop to final trip then return
          if (numTrip === numberTripDelivery) {
            return createdOrderId;
          }
        }
      },
      {
        maxWait: operationTimeout,
        timeout: operationTimeout,
      }
    );

    // Check if the transaction was successful.
    if (result) {
      return { status: HttpStatusCode.Ok, data: result };
    }
  }

  // Return an Internal Server Error response if the creation fails.
  return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
});
