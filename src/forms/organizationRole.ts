import * as yup from "yup";

import { AnyObject, YubObjectSchema } from "@/types";
import { OrganizationRoleInfo } from "@/types/strapi";
import { errorMaxLength, errorRequired } from "@/utils/yup";

export type OrganizationRoleInputForm = Partial<OrganizationRoleInfo> & {
  rolePermissions: AnyObject;
};

export const organizationRoleInputFormSchema = yup.object<YubObjectSchema<OrganizationRoleInputForm>>({
  name: yup.string().trim().required(errorRequired("org_setting_role.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});
