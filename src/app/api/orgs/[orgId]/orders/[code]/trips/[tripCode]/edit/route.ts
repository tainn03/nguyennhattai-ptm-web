import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { UpdateOrderTripInputForm } from "@/forms/orderTrip";
import { checkOrderTripExclusives, updateOrderTrip } from "@/services/server/orderTrip";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the update of an order trip.
 * Returns an OK response with the result of the transaction if successful, or an Internal Server Error response otherwise.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {UpdateOrderTripInputForm} requestData - The data for updating the order trip.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: UpdateOrderTripInputForm) => {
  const { jwt, organizationId: serverOrgId, userId: updatedById } = getToken(req);
  const { lastUpdatedAt, ...orderTrip } = requestData;
  const organizationId = serverOrgId ?? orderTrip.organizationId;

  // Validate the exclusivity of the order trip to prevent concurrent updates.
  const isErrorExclusives = await checkOrderTripExclusives(jwt, organizationId, Number(orderTrip.id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  // Perform a transaction to update the order trip.
  const result = await prisma.$transaction(async (prisma) => {
    const updatedOrderId = await updateOrderTrip(prisma, { ...orderTrip, organizationId, updatedById });
    return updatedOrderId;
  });

  // Check if the transaction was successful.
  if (result) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
