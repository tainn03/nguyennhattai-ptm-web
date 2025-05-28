import { OrganizationRoleType } from "@prisma/client";
import isArray from "lodash/isArray";
import * as yup from "yup";

import { PATTERN_USERNAME } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { AddressInformationInfo, OrganizationMemberInfo, OrganizationRoleInfo, UserInfo } from "@/types/strapi";
import { errorConfirmPassword, errorFormat, errorMaxLength, errorRequired } from "@/utils/yup";

import { ScreenMode } from "./../types/form";

export type MemberInviteInputForm = {
  email: string;
  memberEmail: string;
  orgId: number;
};

export type OrganizationMemberInputForm = Partial<OrganizationMemberInfo> & {
  screenMode: ScreenMode;
  confirmPassword?: string;
  isOwnerOrYou?: boolean;
  driverId?: number;
};

export const organizationMemberInputFormSchema = yup.object<YubObjectSchema<OrganizationMemberInputForm>>({
  email: yup.string().nullable().email(errorFormat("org_setting_member.email")).max(255, errorMaxLength(255)),
  role: yup.object<YubObjectSchema<OrganizationRoleInfo>>({
    id: yup.string().when((_values, schema, { context }) => {
      if (!context.isOwnerOrYou) {
        return schema.required(errorRequired("org_setting_member.role"));
      }
      return schema.nullable();
    }),
  }),
  driverId: yup.number().when((values, schema, { context }) => {
    if (context.role?.type === OrganizationRoleType.DRIVER) {
      return schema.required(errorRequired("org_setting_member.driver"));
    }
    return schema.nullable();
  }),
  username: yup
    .string()
    .trim()
    .required(errorRequired("org_setting_member.username"))
    .matches(PATTERN_USERNAME, { message: errorFormat("org_setting_member.username") }),
  description: yup.string().nullable().max(500, errorMaxLength(500)),
  phoneNumber: yup.string().nullable().max(255, errorMaxLength(255)),
  member: yup.object<YubObjectSchema<UserInfo>>({
    detail: yup.object({
      lastName: yup
        .string()
        .trim()
        .required(errorRequired("org_setting_member.last_name"))
        .max(255, errorMaxLength(255)),
      firstName: yup
        .string()
        .trim()
        .required(errorRequired("org_setting_member.first_name"))
        .max(255, errorMaxLength(255)),
      address: yup.object<YubObjectSchema<AddressInformationInfo>>({
        addressLine1: yup.string().nullable().max(225, errorMaxLength(225)),
      }),
    }),
    password: yup.string().when((_values, schema, { context }) => {
      if (context?.screenMode === "NEW") {
        return schema.required(errorRequired("org_setting_member.password"));
      }
      return schema.nullable();
    }),
  }),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("member.password")], errorConfirmPassword())
    .when("member.password", (password: string | string[], schema) => {
      const tempPassword = isArray(password) ? password[0] : password;
      if (tempPassword) {
        return schema.required(errorRequired("org_setting_member.confirm_password"));
      }
      return schema.nullable();
    })
    .when("screenMode", (screenMode: ScreenMode | ScreenMode[], schema) => {
      const mode = isArray(screenMode) ? screenMode[0] : screenMode;
      if (mode === "NEW") {
        return schema.required(errorRequired("org_setting_member.confirm_password"));
      }
      return schema.nullable();
    }),
});
