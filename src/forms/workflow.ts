import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { WorkflowInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

import { driverReportInputFormSchema } from "./driverReport";

export type WorkflowInputForm = Partial<WorkflowInfo> & {
  clientTimeZone: string;
};

export const workflowInputFormSchema = yup.object<YubObjectSchema<WorkflowInputForm>>({
  name: yup.string().trim().required(errorRequired("workflow.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  driverReports: yup.array().of(driverReportInputFormSchema),
});
