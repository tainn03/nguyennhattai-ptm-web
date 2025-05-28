import { OrganizationSettingOrderCodeGenerationType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { OrganizationSettingInfo } from "@/types/strapi";
import { errorMax, errorMin, errorRequired } from "@/utils/yup";

export type OrganizationSettingInputForm = Partial<OrganizationSettingInfo> & {
  defaultTypeOrderCodeMaxLength?: number | null;
  customerSpecificOrderCodeMaxLength?: number | null;
  routeSpecificOrderCodeMaxLength?: number | null;
  routeCodePrefixMaxLength?: number | null;
};

export type OrganizationReminderInputForm = Partial<
  Pick<OrganizationSettingInfo, "id" | "minBOLSubmitDays" | "minVehicleDocumentReminderDays">
>;

export type OrganizationSettingSalaryNoticeStepInputForm = Partial<
  Pick<OrganizationSettingInfo, "id" | "organizationId">
> & {
  salaryNoticeStepId: number | null;
};

export const organizationOrderCodeSettingInputFormSchema = yup.object<YubObjectSchema<OrganizationSettingInputForm>>({
  orderCodeGenerationType: yup.string(),
  defaultTypeOrderCodeMaxLength: yup.number().when((_values, schema, { context }) => {
    if (context.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.DEFAULT) {
      return schema
        .required(errorRequired("org_setting_order_code.order_code_length"))
        .min(10, errorMin(10))
        .max(16, errorMax(16));
    }
    return schema.nullable();
  }),
  customerSpecificOrderCodeMaxLength: yup.number().when((_values, schema, { context }) => {
    if (context.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC) {
      return schema
        .required(errorRequired("org_setting_order_code.order_code_length"))
        .min(10, errorMin(10))
        .max(16, errorMax(16));
    }
    return schema.nullable();
  }),
  customerCodePrefixMaxLength: yup.number().when((_values, schema, { context }) => {
    if (context.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC) {
      return schema
        .required(errorRequired("org_setting_order_code.customer_code_prefix_length"))
        .min(1, errorMin(1))
        .max(5, errorMax(5));
    }
    return schema.nullable();
  }),
  routeSpecificOrderCodeMaxLength: yup.number().when((_values, schema, { context }) => {
    if (context.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC) {
      return schema
        .required(errorRequired("org_setting_order_code.order_code_length"))
        .min(14, errorMin(14))
        .max(16, errorMax(16));
    }
    return schema.nullable();
  }),
  routeCodePrefixMaxLength: yup.number().when((_values, schema, { context }) => {
    if (context.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC) {
      return schema
        .required(errorRequired("org_setting_order_code.route_code_prefix_length"))
        .min(5, errorMin(5))
        .max(8, errorMax(8));
    }
    return schema.nullable();
  }),
});

export const organizationReminderInputFormSchema = yup.object<YubObjectSchema<OrganizationReminderInputForm>>({
  minBOLSubmitDays: yup.number().min(1, errorMin(1)).max(365, errorMax(365)).nullable(),
  minVehicleDocumentReminderDays: yup.number().min(1, errorMin(1)).max(365, errorMax(365)).nullable(),
});

export const organizationSettingSalaryNoticeStepInputFormSchema = yup.object<
  YubObjectSchema<OrganizationSettingSalaryNoticeStepInputForm>
>({
  salaryNoticeStep: yup.number().nullable(),
});
