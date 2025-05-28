import isArray from "lodash/isArray";
import * as yup from "yup";

import { PATTERN_PASSWORD } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { errorConfirmPassword, errorFormat, errorMaxLength, errorPasswordFormat, errorRequired } from "@/utils/yup";

export type UserType = "ADMIN" | "MEMBER";

export type SignInForm = {
  userType: UserType;
  code?: string;
  alias?: string;
  organizationId?: string;
  account: string;
  password: string;
};

export const signInFormSchema = yup.object<YubObjectSchema<SignInForm>>({
  alias: yup.string().when("userType", (userType: UserType | UserType[], schema) => {
    const type = isArray(userType) ? userType[0] : userType;
    if (type === "MEMBER") {
      return schema.required(errorRequired("sign_in.alias"));
    }
    return schema.nullable();
  }),
  account: yup.string().required(errorRequired("sign_in.account")),
  password: yup.string().required(errorRequired("sign_in.password")),
});

export type SignUpForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  provider?: string;
  avatar?: string;
};

export const signUpFormSchema = yup.object<YubObjectSchema<SignUpForm>>({
  firstName: yup.string().required(errorRequired("sign_up.first_name")).max(255, errorMaxLength(255)),
  lastName: yup.string().required(errorRequired("sign_up.last_name")).max(255, errorMaxLength(255)),
  email: yup
    .string()
    .required(errorRequired("sign_up.email"))
    .email(errorFormat("sign_up.email"))
    .max(255, errorMaxLength(255)),
  phoneNumber: yup.string().required(errorRequired("sign_up.phone_number")).max(20, errorMaxLength(20)),
  password: yup.string().required(errorRequired("sign_up.password")).matches(PATTERN_PASSWORD, errorPasswordFormat()),
  confirmPassword: yup
    .string()
    .required(errorRequired("sign_up.confirm_password"))
    .oneOf([yup.ref("password")], errorConfirmPassword()),
});

export type SignUpActiveForm = {
  token: string;
  reActive?: boolean;
};
