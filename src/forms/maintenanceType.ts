import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MaintenanceTypeInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type MaintenanceTypeInputForm = Partial<MaintenanceTypeInfo>;

export const maintenanceTypeInputFormSchema = yup.object<YubObjectSchema<MaintenanceTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("maintenance_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
