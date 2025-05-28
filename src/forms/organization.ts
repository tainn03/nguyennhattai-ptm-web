import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { OrganizationInfo } from "@/types/strapi";
import { errorFormat, errorMaxLength, errorRequired } from "@/utils/yup";

export type OrganizationEditForm = Partial<OrganizationInfo> & {
  logoName?: string;
};

export const organizationFormSchema = yup.object<YubObjectSchema<OrganizationEditForm>>({
  name: yup.string().trim().required(errorRequired("org_setting_general.name")).max(255, errorMaxLength(255)),
  taxCode: yup.string().trim().required(errorRequired("org_setting_general.tax_code")).max(20, errorMaxLength(20)),
  internationalName: yup.string().nullable().max(255, errorMaxLength(255)),
  abbreviationName: yup.string().nullable().max(50, errorMaxLength(50)),
  email: yup.string().nullable().email(errorFormat("org_setting_general.email")).max(255, errorMaxLength(255)),
  phoneNumber: yup.string().nullable().max(20, errorMaxLength(20)),
  website: yup
    .string()
    .trim()
    .nullable()
    .url(errorFormat("org_setting_general.website"))
    .max(2048, errorMaxLength(2048)),
  businessAddress: yup
    .string()
    .trim()
    .required(errorRequired("org_setting_general.business_address"))
    .max(255, errorMaxLength(255)),
  contactName: yup.string().nullable().max(255, errorMaxLength(255)),
  contactPosition: yup.string().nullable().max(255, errorMaxLength(255)),
  contactEmail: yup
    .string()
    .trim()
    .nullable()
    .email(errorFormat("org_setting_general.contact_email"))
    .max(255, errorMaxLength(255)),
  contactPhoneNumber: yup.string().nullable().max(20, errorMaxLength(20)),
});

export type OrganizationNewForm = Partial<OrganizationInfo>;

export const organizationNewForm = yup.object<YubObjectSchema<OrganizationNewForm>>({
  name: yup.string().trim().required(errorRequired("new_org.name")).max(255, errorMaxLength(255)),
  internationalName: yup.string().nullable().max(255, errorMaxLength(255)),
  abbreviationName: yup.string().nullable().max(50, errorMaxLength(50)),
  taxCode: yup.string().required(errorRequired("new_org.tax_code")).max(20, errorMaxLength(20)),
  email: yup.string().nullable().max(255, errorMaxLength(255)),
  phoneNumber: yup.string().nullable().max(20, errorMaxLength(20)),
  website: yup.string().nullable().url(errorFormat("new_org.website")).max(2048, errorMaxLength(2048)),
  businessAddress: yup
    .string()
    .trim()
    .required(errorRequired("new_org.business_address"))
    .max(255, errorMaxLength(255)),
  contactName: yup.string().nullable().max(255, errorMaxLength(255)),
  contactPosition: yup.string().nullable().max(255, errorMaxLength(255)),
  contactEmail: yup
    .string()
    .trim()
    .nullable()
    .email(errorFormat("org_setting_general.contact_email"))
    .max(255, errorMaxLength(255)),
  contactPhoneNumber: yup.string().nullable().max(20, errorMaxLength(20)),
});
