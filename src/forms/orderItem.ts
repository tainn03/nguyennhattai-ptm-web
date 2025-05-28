import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MerchandiseTypeInfo, OrderItemInfo } from "@/types/strapi";
import { errorMax, errorMaxLength, errorMin, errorRequired, errorType } from "@/utils/yup";

export type OrderItemInputForm = Partial<OrderItemInfo> & {
  orgId?: number;
  orderId?: number;
  updatedByUser?: number;
  lastUpdatedAt?: Date | string;
  merchandiseTypeId?: number | null;
};

export const orderItemSchema = yup.object<YubObjectSchema<OrderItemInputForm>>({
  name: yup.string().trim().required(errorRequired("order.item.detail_modal_name")).max(255, errorMaxLength(255)),
  merchandiseType: yup
    .object<YubObjectSchema<MerchandiseTypeInfo>>({
      id: yup.number().nullable().typeError(errorType("type")),
    })
    .nullable(),
  packageLength: yup.number().nullable().min(0, errorMin(0)).max(99999.99, errorMax(99999.99)),
  packageWidth: yup.number().nullable().min(0, errorMin(0)).max(99999.99, errorMax(99999.99)),
  packageHeight: yup.number().nullable().min(0, errorMin(0)).max(99999.99, errorMax(99999.99)),
  packageWeight: yup.number().nullable().min(0, errorMin(0)).max(99999.99, errorMax(99999.99)),
  quantity: yup.number().nullable().min(1, errorMin(1)).max(999999.99, errorMax(999999.99)),
  unit: yup.string().trim().nullable().max(50, errorMaxLength(50)),
  notes: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
