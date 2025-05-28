import { AdvanceAdvanceType, AdvanceStatus, AdvanceType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { AdvanceInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type AdvanceInputForm = Partial<Omit<AdvanceInfo, "order" | "orderTrip" | "driver" | "subcontractor">> & {
  driverId?: number | null;
  subcontractorId?: number | null;
  orderId?: number | null;
  orderTripId?: number | null;
  orderTripCode?: string | null;
  paymentById?: number | null;
  monthOfTrip?: Date | null;
};

export type AdvanceConfirmForm = Partial<
  Pick<AdvanceInfo, "id" | "organizationId" | "approvedAmount" | "status" | "paymentDate" | "paymentBy" | "updatedById">
> & {
  paymentById?: number | null;
};

export const advanceConfirmFormSchema = yup.object<YubObjectSchema<AdvanceConfirmForm>>({
  approvedAmount: yup
    .number()
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99))
    .typeError(errorType("number"))
    .required(errorRequired("advance.approved_amount")),
  paymentDate: yup.date().typeError(errorType("type")).required(errorRequired("advance.payment_date")),
});

export const advanceFormSchema = yup.object<YubObjectSchema<AdvanceInputForm>>({
  type: yup.string(),
  driverId: yup
    .number()
    .typeError(errorType("type"))
    .when("type", (data, schema) => {
      if (data && data[0] === AdvanceType.DRIVER) {
        return schema.required(errorRequired("advance.driver"));
      }
      return schema.nullable();
    }),
  subcontractorId: yup
    .number()
    .typeError(errorType("type"))
    .when("type", (data, schema) => {
      if (data && data[0] === AdvanceType.SUBCONTRACTOR) {
        return schema.required(errorRequired("advance.subcontractor"));
      }
      return schema.nullable();
    }),
  advanceType: yup.string(),
  orderTripId: yup
    .number()
    .typeError(errorType("type"))
    .when("advanceType", (data, schema) => {
      if (data && data[0] === AdvanceAdvanceType.COST) {
        return schema.required(errorRequired("advance.order_trip"));
      }
      return schema.nullable();
    }),
  amount: yup
    .number()
    .min(0, errorMin(0))
    .max(999999999.99, errorMax(999999999.99))
    .typeError(errorType("number"))
    .required(errorRequired("advance.amount")),
  status: yup.string(),
  paymentDate: yup
    .date()
    .typeError(errorType("type"))
    .when("status", (data, schema) => {
      if (data && data[0] === AdvanceStatus.PAYMENT) {
        return schema.required(errorRequired("advance.payment_date"));
      }
      return schema.nullable();
    }),
  reason: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  rejectionReason: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
