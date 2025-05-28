import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { TrailerTypeInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type TrailerTypeInputForm = Partial<TrailerTypeInfo>;

export const trailerTypeInputFormSchema = yup.object<YubObjectSchema<TrailerTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("trailer_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
