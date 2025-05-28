import * as yup from "yup";

import { PATTERN_PASSWORD } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";
import { errorConfirmPassword, errorPasswordFormat, errorRequired, formatErrorMessage } from "@/utils/yup";

export type PasswordEditForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const passwordEditFormSchema = yup.object<YubObjectSchema<PasswordEditForm>>({
  currentPassword: yup.string().required(errorRequired("user_password_edit.current_password")),
  newPassword: yup
    .string()
    .required(errorRequired("user_password_edit.new_password"))
    .matches(PATTERN_PASSWORD, errorPasswordFormat)
    .notOneOf([yup.ref("currentPassword")], formatErrorMessage("user_password_edit.error_match_message")),
  confirmPassword: yup
    .string()
    .required(errorRequired("user_password_edit.new_password_confirm"))
    .oneOf([yup.ref("newPassword")], errorConfirmPassword),
});
