import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { CustomerGroupInfo, UserInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type CustomerGroupInputForm = Partial<CustomerGroupInfo>;

export type UpdateDisplayOrderCustomerGroupForm = {
  organizationId: number;
  driverExpenses: CustomerGroupInputForm[];
  updatedById: number;
};

export const customerGroupInputFormSchema = yup.object<YubObjectSchema<CustomerGroupInputForm>>({
  name: yup.string().trim().required(errorRequired("customer_group.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  manager: yup.object<YubObjectSchema<UserInfo>>({
    id: yup
      .number()
      .typeError(errorRequired("customer_group.manager"))
      .required(errorRequired("customer_group.manager")),
  }),
});
