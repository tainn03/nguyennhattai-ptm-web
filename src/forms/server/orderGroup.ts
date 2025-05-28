import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { WarehouseNotifyRequest } from "@/types/tms-tap-warehouse";

/**
 * Validation schema for order group input form
 * Used to validate request payload for notifying in-stock items
 */
export const orderGroupInputFormSchema = yup.object<YubObjectSchema<WarehouseNotifyRequest>>({
  organizationId: yup.number().required(),
  clientTimeZone: yup.string().nullable(),
  currentDate: yup.date().nullable(),
  orders: yup.array().of(
    yup.object({
      code: yup.string().required("Order code is required"),
    })
  ),
});
