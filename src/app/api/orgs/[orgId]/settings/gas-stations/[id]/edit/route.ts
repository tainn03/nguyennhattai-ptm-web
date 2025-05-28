import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { GasStationInputForm } from "@/forms/gasStation";
import { updateAddressInformation } from "@/services/server/addressInformation";
import { checkGasStationExclusives, checkGasStationNameExists, updateGasStation } from "@/services/server/gasStation";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the update of an existing gas station record based on the provided data.
 * If the request doesn't include a valid token, it returns an unauthorized response.
 *
 * @param req - The incoming API request.
 * @param requestData - The data for updating an existing gas station, including address, bank account, and other details.
 * @returns An HTTP response indicating success or failure.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: GasStationInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { id, name, address, updatedAt } = requestData;

  if (updatedAt) {
    // Check if there is a lastUpdatedAt timestamp and validate against potential concurrent updates.
    const isErrorExclusives = await checkGasStationExclusives(jwt, organizationId, Number(id), updatedAt);
    if (isErrorExclusives) {
      return { status: HttpStatusCode.Conflict, code: ErrorType.EXCLUSIVE };
    }
  }

  const isNameExisted = await checkGasStationNameExists(jwt, organizationId, ensureString(name), id);
  if (isNameExisted) {
    return { status: HttpStatusCode.BadRequest, code: ErrorType.EXISTED };
  }

  const updatedId = await prisma.$transaction(async (prisma) => {
    // Update the gas station's address information based on country, city, district, ward, and address line.
    await updateAddressInformation(prisma, { ...address, updatedById: userId });

    // Update the gas station record with associated details.
    const updatedGasStationId = await updateGasStation(prisma, requestData);
    return updatedGasStationId;
  });

  if (updatedId) {
    return { status: HttpStatusCode.Ok, data: updatedId };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
