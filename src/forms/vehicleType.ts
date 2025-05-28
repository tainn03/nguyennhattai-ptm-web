import { VehicleType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type VehicleTypeInputForm = Partial<VehicleType>;

export const VehicleTypeInputFormSchema = yup.object<YubObjectSchema<VehicleTypeInputForm>>({
  name: yup.string().trim().required(errorRequired("vehicle_type.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  driverExpenseRate: yup.number().nullable().typeError(errorType("number")).min(0, errorMin(0)).max(100, errorMax(100)),
});
