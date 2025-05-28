import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { GasStationInputForm } from "@/forms/gasStation";
import { createAddressInformation } from "@/services/server/addressInformation";
import { checkGasStationNameExists, createGasStation } from "@/services/server/gasStation";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the creation of a new gas station record based on the provided data.
 * If the request doesn't include a valid token, it returns an unauthorized response.
 *
 * @param req - The incoming API request.
 * @param requestData - The data for creating a new gas station, including address, bank account, and other details.
 * @returns An HTTP response indicating success or failure.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: GasStationInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { name, address, ...otherProps } = requestData;

  const isNameExisted = await checkGasStationNameExists(jwt, organizationId, ensureString(name));
  if (isNameExisted) {
    return { status: HttpStatusCode.BadRequest, code: ErrorType.EXISTED };
  }

  const createdId = await prisma.$transaction(async (prisma) => {
    // Create the gas station's address information based on country, city, district, ward, and address line.
    const createdAddressInformationId = await createAddressInformation(prisma, {
      ...address,
      createdById: userId,
    });

    // Create the gas station record with associated details.
    const createdGasStationId = await createGasStation(prisma, {
      ...otherProps,
      name,
      organizationId,
      createdById: userId,
      address: { id: createdAddressInformationId },
    });
    return createdGasStationId;
  });

  if (createdId) {
    return { status: HttpStatusCode.Ok, data: createdId };
  } else {
    return { status: HttpStatusCode.InternalServerError, code: ErrorType.UNKNOWN };
  }
});
