import * as yup from "yup";

import { PATTERN_PASSWORD } from "@/constants/regexp";
import { YubObjectSchema } from "@/types";

export type NewAdminAccountForm = {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const newAdminAccountFormSchema = yup.object<YubObjectSchema<NewAdminAccountForm>>({
  lastName: yup
    .string()
    .required("Please enter Last name")
    .max(255, "Please enter less than or equal to 255 characters"),
  firstName: yup
    .string()
    .required("Please enter First name")
    .max(255, "Please enter less than or equal to 255 characters"),
  email: yup
    .string()
    .required("Please enter Email")
    .email("Invalid email format")
    .max(255, "Please enter less than or equal to 255 characters"),
  password: yup
    .string()
    .required("Please enter Password")
    .matches(
      PATTERN_PASSWORD,
      "Please enter a minimum of 8 characters, including at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (e.g: !@#$%^&*)"
    ),
  confirmPassword: yup
    .string()
    .required("Please enter Confirm password")
    .oneOf([yup.ref("password")], "Password confirmation does not match"),
});
