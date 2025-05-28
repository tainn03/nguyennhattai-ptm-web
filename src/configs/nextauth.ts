import { User as UserPrisma } from "@prisma/client";
import { NextAuthOptions, User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

import { UserType } from "@/forms/auth";
import {
  getLoginErrorInfo,
  login,
  loginAsImpersonatedUserInOrganization,
  loginToOrganization,
  loginWithProvider,
  verifyAccountLogin,
} from "@/services/server/auth";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import { LoginProvider, LoginResponse } from "@/types/auth";
import { checkProvider } from "@/utils/auth";
import { encodeJWT } from "@/utils/security";

import {
  APP_IMPERSONATION_PASSWORD,
  FACEBOOK_CLIENT_SECRET,
  GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID,
} from "./environment";

/**
 * @see https://next-auth.js.org/configuration/options#pages
 * @see https://medium.com/@tom555my/strapi-next-js-email-password-authentication-a8207f72b446
 */
export const authOptions: NextAuthOptions = {
  /**
   * Configure authentication providers
   * @see https://next-auth.js.org/configuration/options#providers
   */
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",

      /**
       * The credentials is used to generate a suitable form on the sign in page.
       * You can specify whatever fields you are expecting to be submitted.
       * e.g. domain, username, password, 2FA token, etc.
       * You can pass any HTML attribute to the <input> tag through the object.
       */
      credentials: {
        userType: { label: "User Type (Admin, Member)", type: "text" },
        alias: { label: "Alias of the Organization", type: "text" },
        organizationId: { label: "Organization Id", type: "number" },
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
        provider: { label: "Provider", type: "provider" },
      },
      async authorize(credentials, _req) {
        /**
         * This function is used to define if the user is authenticated or not.
         * If authenticated, the function should return an object contains the user data.
         * If not, the function should return `null`.
         */
        if (!credentials) return null;

        const { userType, identifier, password, alias, organizationId, provider } = credentials;
        let result: LoginResponse | undefined;
        if ((userType as UserType) === "ADMIN") {
          result = await login({
            identifier,
            password,
            provider: provider as LoginProvider,
          });
        } else {
          result = await loginToOrganization({
            identifier,
            password,
            alias,
            organizationId,
          });

          // TODO: Log in as an impersonated user
          const { code } = getLoginErrorInfo(result);
          if (code === "BAD_USER_INPUT" && password === APP_IMPERSONATION_PASSWORD) {
            console.log(
              "#authorize: Password matches the application impersonation password, proceeding to login without a password."
            );
            result = await loginAsImpersonatedUserInOrganization({
              identifier,
              alias,
              organizationId,
            });
          }
        }

        const { jwt, user, error, errors } = result;

        // Check error login
        if (!jwt || !user || error || errors) {
          const { code, message } = getLoginErrorInfo(result);
          let errorKey: string | undefined | null;
          switch (code) {
            case "BAD_USER_INPUT":
              errorKey = "sign_in.error_invalid_message";
              break;
            case "STRAPI_APPLICATION_ERROR":
              errorKey = "sign_in.error_user_blocked";
              break;
            default:
              errorKey = code;
              break;
          }
          throw new ApiError(HttpStatusCode.BadRequest, errorKey || message);
        }

        // Check user active
        if (!(user as AnyObject).confirmed) {
          throw new ApiError(HttpStatusCode.BadRequest, "sign_in.error_user_inactive");
        }

        return { jwt, ...user };
      },
    }),
    GoogleProvider({
      clientId: NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
      userinfo: {
        params: { fields: "id, name, email, picture, first_name, last_name" },
      },
    }),
  ],

  /**
   * Configure user session
   * @see https://next-auth.js.org/configuration/options#session
   */
  session: {
    // Seconds - How long until an idle session expires and is no longer valid.
    // Should be set to less than or equal to the expires time of Strapi (less than or equal to 30 days)
    maxAge: 24 * 24 * 60 * 60, // 24 days
  },

  /**
   * Handle login callback from providers
   * @see https://next-auth.js.org/configuration/options#callbacks
   */
  callbacks: {
    signIn: async ({ account, user, profile }) => {
      const { isValid, providerName } = checkProvider(account?.provider || "");
      if (isValid && user?.email) {
        const status = await verifyAccountLogin(user.email, providerName);
        if (["NEW_ACCOUNT", "ERROR"].includes(status)) {
          const profileInfo = profile as AnyObject;
          const firstName = providerName === "GOOGLE" ? profileInfo?.given_name : profileInfo?.first_name;
          const lastName = providerName === "GOOGLE" ? profileInfo?.family_name : profileInfo?.last_name;

          const token = encodeJWT({
            ...user,
            firstName,
            lastName,
            provider: providerName,
            redirectUrl: status === "ERROR" ? "/auth/signin" : "/auth/signup",
          });
          return `/auth/redirect?token=${token}`;
        }
      }
      return true;
    },
    jwt: async ({ token, user, account, trigger, session }) => {
      let userInfo: Partial<UserPrisma> | User | AdapterUser = user;
      const { isValid, providerName } = checkProvider(account?.provider || "");
      if (isValid) {
        const loginInfo = await loginWithProvider(user.id, providerName, user.email, user.image);
        if (loginInfo?.user && loginInfo?.jwt) {
          token.jwt = loginInfo.jwt;
          userInfo = loginInfo.user;
          token.id = loginInfo.user.id;
        }
      }

      if (userInfo) {
        // update token info when signed
        Object.keys(userInfo).forEach((prop) => {
          token[prop] = (userInfo as AnyObject)[prop];
        });
      }
      const { sub, iat, exp, jti, jwt, user: previousUser, ...others } = token;
      let newUserSession = previousUser || others;
      if (trigger === "update" && session?.user?.orgId) {
        const orgId = Number(session.user.orgId);
        newUserSession = { ...newUserSession, orgId };
      }
      return Promise.resolve({
        sub,
        iat,
        exp,
        jti,
        jwt,
        user: newUserSession,
      });
    },
    session: async ({ session, token }) => {
      // setup data response to client
      let user = token.user as AnyObject;
      user = { ...user, id: Number(user.id) };
      return Promise.resolve({ ...session, user, jwt: token.jwt });
    },
  },

  /**
   * Specify URLs to be used if you want to create custom sign in, sign out and error pages.
   * @see https://next-auth.js.org/configuration/options#pages
   */
  pages: {
    signIn: "/auth/signin",
  },
};
