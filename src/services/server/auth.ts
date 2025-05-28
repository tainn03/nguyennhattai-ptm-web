import { User, UserLinkedAccount, UserLinkedAccountProvider } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_API_URL, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import {
  LoginPasswordlessRequest,
  LoginPasswordlessResponse,
  LoginRequest,
  LoginResponse,
  StatusVerifyAccount,
  TokenPasswordlessRequest,
  TokenPasswordlessResponse,
} from "@/types/auth";
import { UserInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { fetcher } from "@/utils/graphql";

import { getOrganizationIdByCodeOrAlias } from "./organization";
import { getOrganizationMemberByOrganizationIdAndIdentifier } from "./organizationMember";
import { getUserIdentifierById } from "./user";

/**
 * Perform user login by sending login credentials to the authentication endpoint.
 *
 * @param identifier - An user login identifier.
 * @param password - An user password.
 * @returns A promise that resolves to the login response data.
 */
export const login = async ({ identifier, password, provider = "local" }: LoginRequest): Promise<LoginResponse> => {
  // *** Old login: using Strapi login API
  // *** https://docs.strapi.io/dev-docs/plugins/users-permissions#login
  /* const data = await post<LoginResponse>(`${STRAPI_API_URL}/auth/local`, {
    identifier,
    password,
  });
  return data; */

  // *** New login: using Strapi graphql
  const loginQuery = gql`
    mutation ($provider: String!, $identifier: String!, $password: String!) {
      login(input: { provider: $provider, identifier: $identifier, password: $password }) {
        jwt
        user {
          id
          username
          email
          confirmed
        }
      }
    }
  `;

  try {
    if (provider === "local") {
      const { data } = await fetcher<LoginResponse>(STRAPI_TOKEN_KEY, loginQuery, {
        provider: "local",
        identifier,
        password,
      });
      return data.login;
    }

    let user: Partial<UserInfo> | null = null;
    let jwt = "";

    // Authenticate and create JWT
    const response = await tokenPasswordless({
      identifier,
      provider: "email",
    });

    if (response) {
      const { token: loginToken } = response;
      if (loginToken) {
        const { jwt: jwtToken, user: userInfo } = await loginPasswordless({
          token: loginToken,
        });

        jwt = jwtToken;
        user = {
          id: userInfo?.id,
          username: userInfo?.username,
          email: userInfo?.email,
          confirmed: userInfo?.confirmed,
        };
      }
    }

    return { jwt, user } as AnyObject;
  } catch (err) {
    return (err as AnyObject).response;
  }
};

/**
 * User authentication within a specific organization.
 *
 * @param {string} identifier - The unique identifier (username or email) of the user.
 * @param {string} password - The user's password for authentication.
 * @param {string} alias - The organization alias (optional if organization ID is provided).
 * @param {number} organizationId - The organization ID (optional if organization alias is provided).
 * @returns {Promise<LoginResponse>} A promise that resolves to the login response, including a JWT token and user details.
 */
export const loginToOrganization = async ({
  identifier,
  password,
  alias,
  organizationId,
}: LoginRequest): Promise<LoginResponse> => {
  try {
    // Retrieve organization ID based on provided parameters
    let orgId: number | undefined;
    if (organizationId) {
      orgId = Number(organizationId);
    } else if (alias) {
      const resultOrganizationId = await getOrganizationIdByCodeOrAlias(alias);
      orgId = resultOrganizationId && Number(resultOrganizationId);
    }
    if (!orgId) {
      return {
        error: {
          code: "sign_in.error_organization_not_exist",
          message: "Cannot retrieve orgId from request parameter.",
        },
      };
    }

    // Retrieve Organization member information based on organization ID and identifier
    const organizationMember = await getOrganizationMemberByOrganizationIdAndIdentifier(orgId, identifier);
    if (!organizationMember || !organizationMember.member) {
      return {
        error: {
          code: "sign_in.error_user_not_exist",
          message: "The user does not exist.",
        },
      };
    }

    // *** Perform user login using Strapi GraphQL
    const loginQuery = gql`
      mutation ($provider: String!, $identifier: String!, $password: String!) {
        login(input: { provider: $provider, identifier: $identifier, password: $password }) {
          jwt
          user {
            id
            confirmed
          }
        }
      }
    `;

    const user = organizationMember.member;
    const { data } = await fetcher<LoginResponse>(
      STRAPI_TOKEN_KEY,
      loginQuery,
      {
        provider: "local",
        identifier: user.username,
        password,
      },
      true
    );
    return {
      ...data.login,
      ...(data.login.user && {
        user: {
          ...data.login.user,
          username: organizationMember.username,
          email: organizationMember.email,
        },
      }),
    } as LoginResponse;
  } catch (err) {
    return (err as AnyObject).response;
  }
};

/**
 * User authentication within a specific organization.
 *
 * @param {string} identifier - The unique identifier (username or email) of the user.
 * @param {string} alias - The organization alias (optional if organization ID is provided).
 * @param {number} organizationId - The organization ID (optional if organization alias is provided).
 * @returns {Promise<LoginResponse>} A promise that resolves to the login response, including a JWT token and user details.
 */
export const loginAsImpersonatedUserInOrganization = async ({
  identifier,
  alias,
  organizationId,
}: LoginRequest): Promise<LoginResponse> => {
  try {
    // Retrieve organization ID based on provided parameters
    let orgId: number | undefined;
    if (organizationId) {
      orgId = Number(organizationId);
    } else if (alias) {
      const resultOrganizationId = await getOrganizationIdByCodeOrAlias(alias);
      orgId = resultOrganizationId && Number(resultOrganizationId);
    }
    if (!orgId) {
      return {
        error: {
          code: "sign_in.error_organization_not_exist",
          message: "Cannot retrieve orgId from request parameter.",
        },
      };
    }

    // Retrieve Organization member information based on organization ID and identifier
    const organizationMember = await getOrganizationMemberByOrganizationIdAndIdentifier(orgId, identifier);
    if (organizationMember?.member) {
      // Authenticate and create JWT
      const response = await tokenPasswordless({
        identifier: organizationMember.member.email || "",
        provider: "email",
      });
      if (response?.token) {
        const { jwt, user } = await loginPasswordless({
          token: response.token,
        });

        return {
          jwt,
          user: {
            id: user.id,
            confirmed: user.confirmed,
            username: organizationMember.username,
            email: organizationMember.email,
          },
        } as unknown as LoginResponse;
      }
    }

    return {
      error: {
        code: "sign_in.error_user_not_exist",
        message: "The user does not exist.",
      },
    };
  } catch (err) {
    return (err as AnyObject).response;
  }
};

/**
 * Checks if the provided password is valid for the user identified by the given user ID.
 *
 * @param {number} userId - The unique identifier of the user.
 * @param {string} password - The password to be validated.
 * @returns {Promise<boolean>} - A promise that resolves to true if the password is valid; otherwise, false.
 */
export const isValidCurrentPassword = async (userId: number, password: string): Promise<boolean> => {
  try {
    // Retrieve user identifier (username, email, etc.) based on the user ID
    const userIdentifier = await getUserIdentifierById(userId);
    if (!userIdentifier) {
      throw new ApiError(HttpStatusCode.BadRequest, "The user does not exist.");
    }

    // GraphQL mutation to perform user login using Strapi GraphQL
    const loginQuery = gql`
      mutation ($provider: String!, $identifier: String!, $password: String!) {
        login(input: { provider: $provider, identifier: $identifier, password: $password }) {
          jwt
          user {
            id
          }
        }
      }
    `;

    const { data } = await fetcher<LoginResponse>(STRAPI_TOKEN_KEY, loginQuery, {
      provider: "local",
      identifier: userIdentifier.username,
      password,
    });
    return !!data.login.jwt && !!data.login.user;
  } catch {
    // If any error occurs during the process, return false
  }
  return false;
};

/**
 * Generates a passwordless authentication token for a user.
 *
 * @param {TokenPasswordlessRequest} options - The options for generating the token.
 * @param {string} options.identifier - The user's identifier (e.g., email or username).
 * @param {string} options.provider - The authentication provider (e.g., 'email' or 'phone').
 * @returns {Promise<TokenPasswordlessResponse>} A promise that resolves to the generated token.
 */
export const tokenPasswordless = async ({ identifier, provider }: TokenPasswordlessRequest) => {
  const data = await post<TokenPasswordlessResponse>(
    `${STRAPI_API_URL}/auth/passwordless/token`,
    {
      identifier,
      provider,
    },
    {
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN_KEY}`,
      },
    }
  );
  return data;
};

/**
 * Logs a user in using a passwordless authentication token.
 *
 * @param {LoginPasswordlessRequest} options - The options for logging in with a token.
 * @param {string} options.token - The passwordless authentication token.
 * @returns {Promise<LoginResponse>} A promise that resolves to the login response.
 */
export const loginPasswordless = async ({ token }: LoginPasswordlessRequest) => {
  const data = await post<LoginPasswordlessResponse>(
    `${STRAPI_API_URL}/auth/passwordless/login`,
    {
      token,
    },
    {
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN_KEY}`,
      },
    }
  );
  return data;
};

/**
 * Verify Account Login
 * This asynchronous function checks if an email is associated with an existing Google account or if it's a new account.
 *
 * @param {string} email - The email address to be verified.
 * @returns {Promise<"SUCCESS" | "ERROR" | "NEW_ACCOUNT">} The status of the email verification.
 */
export const verifyAccountLogin = async (email: string, provider?: UserLinkedAccountProvider) => {
  let status: StatusVerifyAccount = "SUCCESS";

  // Check if the email is linked to a Provider account in userLinkedAccounts
  const linkedAccountQuery = gql`
    query ($email: String!, $provider: String!) {
      userLinkedAccounts(filters: { email: { eq: $email }, provider: { eq: $provider } }) {
        data {
          attributes {
            email
          }
        }
      }
    }
  `;

  const { data: linkedAccountData } = await fetcher<
    (UserLinkedAccount & {
      user: User;
    })[]
  >(STRAPI_TOKEN_KEY, linkedAccountQuery, {
    email,
    provider,
  });
  if (!linkedAccountData.userLinkedAccounts.length) {
    // Email is not linked to a Provider account, check in usersPermissionsUsers
    const userQuery = gql`
      query ($email: String!) {
        usersPermissionsUsers(filters: { email: { eq: $email } }) {
          data {
            id
            attributes {
              email
              blocked
              linkedAccounts {
                data {
                  id
                  attributes {
                    provider
                    email
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data: userData } = await fetcher<(User & { linkedAccounts: UserLinkedAccount[] })[]>(
      STRAPI_TOKEN_KEY,
      userQuery,
      {
        email,
      }
    );

    if (userData.usersPermissionsUsers.length > 0) {
      const userInfo = userData.usersPermissionsUsers[0];
      const isLinked = userInfo.linkedAccounts?.some((item) => item.provider === provider);
      if (isLinked) {
        // Email is linked to a Provider account
        status = "ERROR";
      }
    } else {
      // Email is not associated with any account in the system
      status = "NEW_ACCOUNT";
    }
  }

  return status;
};

/**
 * Asynchronously authenticates a user with a specified provider and handles user login.
 *
 * @param id - The unique identifier for the user.
 * @param provider - (Optional) The type of authentication provider.
 * @param email - (Optional) The email address associated with the user.
 * @param image - (Optional) The URL of the user's avatar image.
 */
export const loginWithProvider = async (
  id: string,
  provider?: UserLinkedAccountProvider,
  email?: string | null,
  image?: string | null
) => {
  let user: Partial<User & { linkedAccounts?: UserLinkedAccount[] }> | null = null;
  let jwt = "";

  // This function helps you query user information based on email and provider
  const query = gql`
    query ($email: String!, $provider: String!) {
      userLinkedAccounts(filters: { email: { eq: $email }, provider: { eq: $provider } }) {
        data {
          id
          attributes {
            email
            avatar
            publishedAt
            user {
              data {
                attributes {
                  email
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<(UserLinkedAccount & { user: User })[]>(STRAPI_TOKEN_KEY, query, {
    email,
    provider,
  });

  // Check if userLinkedAccount already exists
  const userLinkedAccount = data.userLinkedAccounts[0];
  if (!userLinkedAccount) {
    // If it doesn't exist, query user information by email
    const query = gql`
      query ($email: String!) {
        usersPermissionsUsers(filters: { email: { eq: $email } }) {
          data {
            id
            attributes {
              email
              blocked
              linkedAccounts {
                data {
                  id
                  attributes {
                    email
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<(User & { linkedAccounts: UserLinkedAccount[] })[]>(STRAPI_TOKEN_KEY, query, {
      email,
    });

    const userInfo = data.usersPermissionsUsers[0];
    if (userInfo) {
      user = userInfo;

      // Create a new userLinkedAccount
      const createLinkedAccountQuery = gql`
        mutation (
          $provider: ENUM_USERLINKEDACCOUNT_PROVIDER!
          $email: String!
          $userId: String
          $avatar: String!
          $publishedAt: DateTime
          $user: ID!
        ) {
          createUserLinkedAccount(
            data: {
              provider: $provider
              email: $email
              userId: $userId
              avatar: $avatar
              user: $user
              publishedAt: $publishedAt
            }
          ) {
            data {
              id
            }
          }
        }
      `;

      await fetcher<UserLinkedAccount & { user: User }>(STRAPI_TOKEN_KEY, createLinkedAccountQuery, {
        provider,
        email,
        userId: id,
        avatar: image,
        user: userInfo?.id,
        publishedAt: new Date(),
      });
    }
  } else {
    user = userLinkedAccount.user;
  }

  if (user) {
    // Authenticate and create JWT
    const response = await tokenPasswordless({
      identifier: `${user.email || ""}`,
      provider: "email",
    });

    if (response) {
      const { token: loginToken } = response;
      if (loginToken) {
        const { jwt: jwtToken, user: userInfo } = await loginPasswordless({
          token: loginToken,
        });

        if (userLinkedAccount?.id) {
          // Update a new userLinkedAccount
          const updateLinkedAccountQuery = gql`
            mutation ($id: ID!, $avatar: String!) {
              updateUserLinkedAccount(id: $id, data: { avatar: $avatar }) {
                data {
                  id
                }
              }
            }
          `;

          await fetcher<
            UserLinkedAccount & {
              user: User;
            }
          >(STRAPI_TOKEN_KEY, updateLinkedAccountQuery, {
            id: userLinkedAccount.id,
            avatar: image,
          });
        }

        jwt = jwtToken;
        user = {
          id: userInfo?.id,
          username: userInfo?.username,
          email: userInfo?.email,
          confirmed: userInfo?.confirmed,
        };
      }
    }
  }

  return { jwt, user };
};

/**
 * Retrieves login error information from the login response.
 *
 * This function extracts the error code and message from the given login response.
 * If no error is directly available on `res.error`, it attempts to retrieve the
 * first error from the `res.errors` array, and then further checks for the error
 * code and message in the error's extensions if available.
 *
 * @param {LoginResponse} res - The response object from the login attempt, which may contain errors.
 * @returns {{ code: string | undefined, message: string | undefined }} An object containing the error code and message.
 */
export const getLoginErrorInfo = (
  res: LoginResponse
): {
  code?: string;
  message?: string;
} => {
  const error = (res.errors || [])[0] as AnyObject | undefined;
  return {
    code: res.error?.code || error?.code || error?.extensions?.code,
    message: res.error?.message || error?.message || error?.extensions?.message,
  };
};
