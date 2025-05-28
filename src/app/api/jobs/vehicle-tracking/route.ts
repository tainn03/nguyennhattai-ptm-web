import { HttpStatusCode } from "axios";

import { CLIENT_API_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { upsertVehicleTracking } from "@/services/server/vehicleTracking";
import { ApiNextRequest } from "@/types/api";
import { VehicleTrackingInfo } from "@/types/strapi";
import { withExceptionHandler } from "@/utils/server";

/**
 * Handle POST request with exception handling.
 * @param req Incoming request object.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, data: { vehicleTrackings: VehicleTrackingInfo[] }) => {
    const clientApiKey = req.headers.get("client-api-key");

    // Check if the client API key is provided and valid
    if (!clientApiKey || clientApiKey !== CLIENT_API_KEY) {
      return { status: HttpStatusCode.Unauthorized, message: "Unauthorized" };
    }

    const vehicleTrackings = data.vehicleTrackings || [];

    // Check if the request body is empty
    if (!vehicleTrackings || vehicleTrackings.length === 0) {
      return { status: HttpStatusCode.BadRequest, message: "No data provided" };
    }

    let operationTimeout = 20000;
    if (100 * vehicleTrackings.length > operationTimeout) {
      operationTimeout = 100 * vehicleTrackings.length; // 100ms per entity
    }

    let count = 0;
    await prisma.$transaction(
      async (prisma) => {
        for (const entity of vehicleTrackings) {
          await upsertVehicleTracking(prisma, entity);
          count++;
        }
      },
      {
        maxWait: operationTimeout,
        timeout: operationTimeout,
      }
    );

    // Return the number of records processed
    return { status: HttpStatusCode.Ok, data: count };
  }
);
