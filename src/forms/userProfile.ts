import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { AddressInformationInfo, UserInfo } from "@/types/strapi";
import { errorFormat, errorMaxLength, errorRequired } from "@/utils/yup";

export type ProfileForm = Partial<UserInfo> & {
  avatarName?: string;
  avatarUrl?: string;
};
export const profileFormSchema = yup.object<YubObjectSchema<ProfileForm>>({
  phoneNumber: yup.string().nullable().trim().max(20, errorMaxLength(20)),
  detail: yup.object({
    lastName: yup.string().trim().required(errorRequired("user_profile.last_name")).max(255, errorMaxLength(255)),
    firstName: yup.string().trim().required(errorRequired("user_profile.first_name")).max(255, errorMaxLength(255)),
    description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
    dateOfBirth: yup.date().nullable().typeError(errorFormat("user_profile.date_of_birth")),
    address: yup.object<YubObjectSchema<AddressInformationInfo>>({
      addressLine1: yup.string().nullable().max(225, errorMaxLength(225)),
    }),
  }),
});
