import { EmailTemplateType } from "@prisma/client";

import { AnyObject } from "@/types";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { LocaleType } from "@/types/locale";
import { sendEmail } from "@/utils/email";
import { withExceptionHandler } from "@/utils/server";

type TestEmailForm = {
  toEmail: string;
  type: string;
  data: string;
  locale?: LocaleType;
};

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: TestEmailForm) => {
  console.log("#sendTestEmail: data=", JSON.stringify(data, null, 2));
  if (!data.toEmail) {
    throw new ApiError(HttpStatusCode.BadRequest, "toEnail cannot be null.");
  }

  const result = await sendEmail(
    {
      toEmail: data.toEmail
        .split(";")
        .filter((item) => !!item.trim())
        .map((item) => item.trim()),
      data: (data.data && JSON.parse(data.data)) || ({} as AnyObject),
      type: data.type as EmailTemplateType,
      locale: data.locale,
    },
    false
  );

  return {
    status: HttpStatusCode.Ok,
    data: result,
  };
});
