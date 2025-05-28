import { MaintenanceTypeType } from "@prisma/client";
import { isArray } from "lodash";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MaintenanceInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type MaintenanceType = "VEHICLE" | "TRAILER";

export type MaintenanceInputForm = Partial<MaintenanceInfo> & {
  maintenanceTypeId?: number | string | null;
  vehicleId?: number | null;
  trailerId?: number | null;
  costBearerId?: number | null;
};

export const maintenanceInputFormSchema = yup.object<YubObjectSchema<MaintenanceInputForm>>({
  vehicleId: yup
    .number()
    .typeError(errorType("number"))
    .when("type", (maintenanceType: MaintenanceType | MaintenanceType[], schema) => {
      const type = isArray(maintenanceType) ? maintenanceType[0] : maintenanceType;
      if (type === MaintenanceTypeType.VEHICLE) {
        return schema.required(errorRequired("maintenance.vehicle"));
      }
      return schema.nullable();
    }),
  trailerId: yup
    .number()
    .typeError(errorType("number"))
    .when("type", (maintenanceType: MaintenanceType | MaintenanceType[], schema) => {
      const type = isArray(maintenanceType) ? maintenanceType[0] : maintenanceType;
      if (type === MaintenanceTypeType.TRAILER) {
        return schema.required(errorRequired("maintenance.trailer"));
      }
      return schema.nullable();
    }),
  maintenanceTypeId: yup.mixed().required(errorRequired("maintenance.maintenance_type")),
  estimateCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99)),
  actualCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99)),
  otherMaintenanceType: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
