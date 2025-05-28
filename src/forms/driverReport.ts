import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { DriverReportDetailInfo, DriverReportInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type DriverReportDetailInputForm = Partial<DriverReportDetailInfo>;
export type DriverReportInputForm = Partial<DriverReportInfo>;
export type UpdateDisplayOrderForm = {
  organizationId: number;
  driverReports: DriverReportInputForm[];
  updatedById: number;
};

export const driverReportInputFormSchema = yup.object<YubObjectSchema<DriverReportInputForm>>({
  name: yup.string().trim().required(errorRequired("driver_report.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});

export const driverReportDetailInputFormSchema = yup.object<YubObjectSchema<DriverReportDetailInputForm>>({
  name: yup.string().trim().required(errorRequired("driver_report.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
