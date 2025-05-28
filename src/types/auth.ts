import { ProfileSuccessResponse } from "@greatsumini/react-facebook-login";
import { User, UserLinkedAccountProvider } from "@prisma/client";
import { User as NextAuthUser } from "next-auth";

import { SignInForm } from "@/forms/auth";
import { AnyObject } from "@/types";

export type LoginProvider = "local" | UserLinkedAccountProvider;

export type LoginRequest = Partial<SignInForm> & {
  identifier: string;
  provider?: LoginProvider;
};

export type LoginResponse = {
  jwt?: string;
  user?: NextAuthUser;
  error?: AnyObject;
  errors?: AnyObject[];
};

export type TokenPasswordlessRequest = {
  identifier: string;
  provider: "email" | "username" | "phoneNumber";
};

export type TokenPasswordlessResponse = {
  token: string;
};

export type LoginPasswordlessRequest = {
  token: string;
};

export type LoginPasswordlessResponse = {
  jwt: string;
  user: User;
};

export type JwtAuthData = NextAuthUser & {
  firstName: string;
  lastName: string;
  redirectUrl: string;
};

export type StatusVerifyAccount = "SUCCESS" | "ERROR" | "NEW_ACCOUNT";

export type UserSession = Pick<User, "id" | "username" | "email" | "confirmed"> & {
  orgId?: number;
};

export type UserLinkedAccountProfile = ProfileSuccessResponse;

export type AppInfo = {
  version: string;
  buildHash: string;
  buildDate: string;
};
