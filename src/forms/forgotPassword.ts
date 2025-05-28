import { User } from "@prisma/client";
import * as yup from "yup";

import { PATTERN_PASSWORD } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { errorConfirmPassword, errorFormat, errorRequired } from "@/utils/yup";

export const forgotPasswordFormSchema = yup.object<YubObjectSchema<User>>({
  email: yup.string().email(errorFormat("email")),
});

export type ConfirmationForm = {
  code: string;
  email: string;
};

export type ChangePasswordForm = {
  email: string;
  tokenKey: string;
  password: string;
  passwordConfirm: string;
};

export const changePasswordFormSchema = yup.object<YubObjectSchema<ChangePasswordForm>>({
  password: yup
    .string()
    .required(errorRequired("forgot_password.edit_password"))
    .matches(PATTERN_PASSWORD, errorFormat("forgot_password.email")),
  passwordConfirm: yup
    .string()
    .required(errorRequired("forgot_password.edit_password_confirm"))
    .oneOf([yup.ref("password")], errorConfirmPassword),
});
