import { HttpStatusCode } from "axios";

import { ApiNextRequest } from "@/types/api";
import { PushNotificationType } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: PushNotificationType) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { entity, ...otherProps } = requestData;

  pushNotification({ ...otherProps, jwt, entity: { ...entity, organizationId, createdById } });

  return { status: HttpStatusCode.Ok };
});
