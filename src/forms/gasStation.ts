import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { GasStationInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type GasStationInputForm = Partial<GasStationInfo>;

export const gasStationInputFormSchema = yup.object<YubObjectSchema<GasStationInputForm>>({
  name: yup.string().trim().required(errorRequired("gas_station.name")).max(255, errorMaxLength(255)),
  fuelCapacity: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999.99, errorMax(99999.99))
    .nullable(),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
