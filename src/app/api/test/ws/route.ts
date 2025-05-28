import { connect, StringCodec } from "nats";

import { NATS_SERVER, NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN } from "@/configs/environment";
import { ApiError, HttpStatusCode } from "@/types/api";
import { NatsWebsocketMessage } from "@/types/notification";
import { getUserSubscriptionChannel } from "@/utils/auth";
import { withExceptionHandler } from "@/utils/server";

export const GET = withExceptionHandler(async (_req, _data, params) => {
  const { orgId, userId } = params;

  // Validate query parameters
  if (!orgId || !userId) {
    throw new ApiError(HttpStatusCode.BadRequest, 'Query string "orgId" and "userId" are required.');
  }

  // Connect to NATS server using WebSocket and token
  const nc = await connect({
    servers: NATS_SERVER,
    token: NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN,
  });

  // Prepare the message to send (e.g., 'org4.user8')
  const messageData: NatsWebsocketMessage = {
    type: "TEST_CONNECTION",
    message: "NATS WebSocket is working!",
  };

  // Encode message to StringCodec format and Publish message to the specified subject
  const sc = StringCodec();
  const payload = sc.encode(JSON.stringify(messageData));
  const channel = getUserSubscriptionChannel(orgId, userId);
  nc.publish(channel, payload);

  // Ensure the NATS connection is safely closed after all messages are processed
  await nc.drain();

  // Return response with the data sent
  return {
    status: HttpStatusCode.Ok,
    data: messageData,
  };
});
