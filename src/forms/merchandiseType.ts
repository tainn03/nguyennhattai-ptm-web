import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MerchandiseTypeInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type MerchandiseTypeInputForm = Partial<MerchandiseTypeInfo>;

export const merchandiseTypeInputFormSchema = yup.object<YubObjectSchema<MerchandiseTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("merchandise_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
