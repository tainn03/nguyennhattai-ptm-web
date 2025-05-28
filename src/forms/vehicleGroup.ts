import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { UserInfo, VehicleGroupInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type VehicleGroupInputForm = Partial<VehicleGroupInfo>;

export type UpdateDisplayOrderVehicleGroupForm = {
  organizationId: number;
  driverExpenses: VehicleGroupInputForm[];
  updatedById: number;
};

export const vehicleGroupInputFormSchema = yup.object<YubObjectSchema<VehicleGroupInputForm>>({
  name: yup.string().trim().required(errorRequired("vehicle_group.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  manager: yup.object<YubObjectSchema<UserInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("customer_group.manager"))
      .required(errorRequired("customer_group.manager")),
  }),
});
