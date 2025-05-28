import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { ZoneInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type ZoneInputForm = Partial<ZoneInfo>;

export const zoneFormSchema = yup.object<YubObjectSchema<ZoneInputForm>>({
  name: yup.string().trim().required(errorRequired("zone.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
