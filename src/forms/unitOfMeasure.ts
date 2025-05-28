import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type UnitOfMeasureInputForm = Partial<UnitOfMeasureInfo>;

export const unitOfMeasureInputFormSchema = yup.object<YubObjectSchema<UnitOfMeasureInputForm>>({
  name: yup.string().trim().required(errorRequired("unit_of_measure.name")).max(255, errorMaxLength(255)),
  code: yup.string().trim().required(errorRequired("unit_of_measure.code")).max(20, errorMaxLength(20)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
