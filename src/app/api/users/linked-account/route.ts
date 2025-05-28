import { UserLinkedAccountProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import jwt_decode from "jwt-decode";

import { GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_CLIENT_ID } from "@/configs/environment";
import { checkEmailLinkedExists, createLinkedAccount } from "@/services/server/user";
import { AnyObject } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

const oAuth2Client = new OAuth2Client(NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "postmessage");

export const POST = withExceptionHandler(async (_req: ApiNextRequest, data: { userId: number; code: string }) => {
  // exchange code for tokens
  const { tokens } = await oAuth2Client.getToken(data.code);
  const decoded = jwt_decode(tokens.id_token as string) as AnyObject;

  const isExistLinkedEmail = await checkEmailLinkedExists(decoded.email, UserLinkedAccountProvider.GOOGLE);
  if (isExistLinkedEmail) {
    throw new ApiError(HttpStatusCode.Conflict);
  }

  const userLinkedId = await createLinkedAccount(
    data.userId,
    ensureString(decoded.email),
    decoded.picture,
    decoded.sub,
    UserLinkedAccountProvider.GOOGLE
  );

  if (!userLinkedId) {
    throw new ApiError(HttpStatusCode.BadRequest);
  }

  return { status: HttpStatusCode.Ok };
});
