import { HttpStatusCode } from "axios";

import { AutoDispatchInputForm } from "@/forms/order";
import { autoDispatchVehicle } from "@/services/server/order";
import { ApiNextRequest } from "@/types/api";
import logger from "@/utils/logger";
import { getToken, withExceptionHandler } from "@/utils/server";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: AutoDispatchInputForm) => {
  const { jwt, organizationId } = getToken(req);
  const { order } = requestData;

  const autoDispatchResult = {
    numberOfDispatchedVehicle: 0,
    message: "",
  };

  logger.info(`#Analysis[Update]: deliveryDate: ${order.deliveryDate}`);
  // Auto dispatch vehicle if order has delivery date
  autoDispatchVehicle(jwt, { ...order, organizationId });

  return { status: HttpStatusCode.Ok, data: { autoDispatchResult } };
});
