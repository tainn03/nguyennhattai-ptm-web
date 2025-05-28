import { NEXT_PUBLIC_APP_SECRET } from "@/configs/environment";
import { AnyObject } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { GraphQLRequestData } from "@/types/graphql";
import { fetcher } from "@/utils/graphql";
import { combineDataBeforeSign, hmacSHA256, verifyRequestData } from "@/utils/security";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: GraphQLRequestData, _params: AnyObject) => {
  // Check authentication
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  // Validate request data
  const valid = await verifyRequestData(req, data);
  if (!valid) {
    const { signature: _, ...others } = data;
    const combined = combineDataBeforeSign(others);
    const serverSignature = hmacSHA256(combined, NEXT_PUBLIC_APP_SECRET);
    throw new ApiError(HttpStatusCode.BadRequest, "Invalid signature.", {
      serverSecret: NEXT_PUBLIC_APP_SECRET,
      serverCombined: combined,
      serverSignature,
    });
  }

  // Call to Strapi
  const token = req.token.jwt;
  const { query, params } = data;
  const result = await fetcher(token, query, params);
  return {
    status: HttpStatusCode.Ok,
    ...result,
  };
});
