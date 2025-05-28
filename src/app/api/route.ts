import { AnyObject } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";

export const GET = withExceptionHandler((_req: ApiNextRequest, _data: AnyObject, _params: AnyObject) => {
  return {
    status: HttpStatusCode.Ok,
    message: "API Server is worked!",
  };
});
