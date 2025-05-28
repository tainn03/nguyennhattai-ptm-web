import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { DriverLicenseTypeInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type DriverLicenseTypeInputForm = Partial<DriverLicenseTypeInfo>;

export const driverLicenseTypeInputFormSchema = yup.object<YubObjectSchema<DriverLicenseTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("driver_license_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
