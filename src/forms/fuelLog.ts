import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { DriverInfo, FuelLogInfo, GasStationInfo, VehicleInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type FuelLogInputForm = Partial<FuelLogInfo> & {
  fuelMeterImageName?: string;
  odometerImageName?: string;
  lastFuelLogImageId?: number;
  lastOdometerImageId?: number;
  isNotify?: boolean;
  oldDate?: Date | null;
};

export const fuelLogInputFormSchema = yup.object<YubObjectSchema<FuelLogInputForm>>({
  liters: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(9999.99, errorMax(9999.99))
    .required(errorRequired("report.fuel_log.liters")),
  fuelCost: yup
    .number()
    .nullable()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(99999999.99, errorMax(99999999.99)),
  odometerReading: yup
    .number()
    .typeError(errorType("number"))
    .min(0, errorMin(0))
    .max(999999.99, errorMax(999999.99))
    .required(errorRequired("report.fuel_log.odometer")),
  fuelType: yup.string().trim().required(errorRequired("report.fuel_log.fuel_type")),
  driver: yup.object<YubObjectSchema<DriverInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("report.fuel_log.driver"))
      .required(errorRequired("report.fuel_log.driver")),
  }),
  vehicle: yup.object<YubObjectSchema<VehicleInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("report.fuel_log.vehicle"))
      .required(errorRequired("report.fuel_log.vehicle")),
  }),
  gasStation: yup.object<YubObjectSchema<GasStationInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("report.fuel_log.gas_station"))
      .required(errorRequired("report.fuel_log.gas_station")),
  }),
  notes: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
