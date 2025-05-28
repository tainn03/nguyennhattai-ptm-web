import { User, UserLinkedAccount, UserLinkedAccountProvider } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import { DEFAULT_PROVIDER, EMAIL_SUFFIX, ROLE_AUTHENTICATED } from "@/constants/user";
import { NewAdminAccountForm } from "@/forms/adminInit";
import { SignUpForm } from "@/forms/auth";
import { UserInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { randomUUID, trim } from "@/utils/string";

import { createAddressInformation } from "./addressInformation";
import { createOrganizationUserDetail } from "./userDetail";
import { createOrganizationUserSetting } from "./userSetting";

/**
 * Check if there are any existing users.
 * It returns a boolean indicating whether users already exist in the system.
 *
 * @returns {Promise<boolean>} - A promise that resolves to true if users already exist, otherwise false.
 */
export const checkUserAlreadyExists = async (): Promise<boolean> => {
  const query = gql`
    query {
      usersPermissionsUsers(pagination: { limit: 1 }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User[]>(STRAPI_TOKEN_KEY, query);
  return data.usersPermissionsUsers.length > 0;
};

/**
 * Creates a new admin account with the provided information.
 * It includes creating user details, user settings, and address information associated with the admin account.
 *
 * @param {NewAdminAccountForm} adminAccountData - The data for creating a new admin account.
 * @returns {Promise<number>} - A promise that resolves to the ID of the newly created admin account.
 */
export const createAdminAccount = async ({
  lastName,
  firstName,
  email,
  password,
}: NewAdminAccountForm): Promise<number> => {
  const createUserInfoQuery = gql`
    mutation (
      $email: String!
      $password: String!
      $publishedAt: DateTime!
      $role: ID!
      $firstName: String
      $lastName: String
    ) {
      createUsersPermissionsUser(
        data: {
          username: $email
          email: $email
          password: $password
          role: $role
          confirmed: true
          blocked: false
          isAdmin: true
        }
      ) {
        data {
          id
        }
      }
      createUserDetail(data: { firstName: $firstName, lastName: $lastName, publishedAt: $publishedAt }) {
        data {
          id
        }
      }
      createUserSetting(data: { publishedAt: $publishedAt }) {
        data {
          id
        }
      }
      createAddressInformation(data: { publishedAt: $publishedAt }) {
        data {
          id
        }
      }
    }
  `;

  // Create user information (user, user detail, user setting, and address information)
  const { data } = await fetcher(STRAPI_TOKEN_KEY, createUserInfoQuery, {
    lastName,
    firstName,
    email,
    password,
    role: ROLE_AUTHENTICATED,
    publishedAt: new Date(),
  });

  const updateUserInfoQuery = gql`
    mutation ($userId: ID!, $userDetailId: ID!, $userSettingId: ID!, $addressId: ID!) {
      updateUsersPermissionsUser(id: $userId, data: { detail: $userDetailId, setting: $userSettingId }) {
        data {
          id
        }
      }
      updateUserDetail(id: $userDetailId, data: { address: $addressId }) {
        data {
          id
        }
      }
    }
  `;

  // Link user information (user detail and user setting)
  const { data: dataRegister } = await fetcher(STRAPI_TOKEN_KEY, updateUserInfoQuery, {
    userId: data.createUsersPermissionsUser.id,
    userDetailId: data.createUserDetail.id,
    userSettingId: data.createUserSetting.id,
    addressId: data.createAddressInformation.id,
  });

  return dataRegister.updateUsersPermissionsUser.id;
};

/**
 * getUserById: Fetches user information by ID using GraphQL query
 * @param jwt: JSON Web Token for authentication
 * @param id: ID of the user to fetch
 * @returns UserInfo: Information of the user fetched by ID
 */
export const getUserById = async (jwt: string, id: number): Promise<UserInfo> => {
  const query = gql`
    query ($id: ID) {
      usersPermissionsUser(id: $id) {
        data {
          id
          attributes {
            email
            phoneNumber
            detail {
              data {
                attributes {
                  firstName
                  lastName
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UserInfo>(jwt, query, { id });
  return data.usersPermissionsUser ?? [];
};

/**
 * Creates an organization user with associated details and settings.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client with transaction support.
 * @param {Partial<UserInfo>} entity - The user entity containing user details.
 * @param {number} organizationId - The ID of the organization to which the user belongs.
 * @param {number} createdById - The ID of the user who is creating this organization user.
 * @returns {Promise<number>} - A Promise resolving to the ID of the created organization user.
 */
export const createOrganizationUser = async (
  prismaClient: PrismaClientTransaction,
  entity: Partial<UserInfo>,
  organizationId: number,
  createdById: number
): Promise<number> => {
  const { detail } = trim(entity);

  // Create user detail for the organization user
  const createdUserDetailId = await createOrganizationUserDetail(prismaClient, { ...detail }, createdById);

  // Create user setting for the organization user
  const createdUserSettingId = await createOrganizationUserSetting(prismaClient, organizationId);

  // create user for organization
  const username = randomUUID();
  const email = `${username}${EMAIL_SUFFIX}`;
  const result = await prismaClient.user.create({
    data: {
      username,
      email,
      provider: DEFAULT_PROVIDER,
      confirmed: true,
      blocked: false,
      isAdmin: false,
    },
  });

  // Link the user with the Role
  await prismaClient.userRoleLinks.create({
    data: {
      userId: result.id,
      roleId: ROLE_AUTHENTICATED,
    },
  });

  // Link the user with the created user detail
  await prismaClient.userDetailLinks.create({
    data: {
      userId: result.id,
      userDetailId: createdUserDetailId,
    },
  });

  // Link the user with the created user setting
  await prismaClient.userSettingLinks.create({
    data: {
      userId: result.id,
      userSettingId: createdUserSettingId,
    },
  });

  return result.id;
};

/**
 * Retrieves user identifier based on the provided user ID.
 *
 * @param {number} userId - The ID of the user.
 * @returns {Promise<UserInfo | undefined>} - A promise that resolves to user information if found; otherwise, undefined.
 */
export const getUserIdentifierById = async (userId: number): Promise<UserInfo | undefined> => {
  const query = gql`
    query ($userId: ID!) {
      usersPermissionsUsers(filters: { id: { eq: $userId }, blocked: { eq: false } }) {
        data {
          id
          attributes {
            username
            email
            phoneNumber
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UserInfo[]>(STRAPI_TOKEN_KEY, query, { userId });
  return data?.usersPermissionsUsers[0];
};

/**
 * Change the password of a user by their email address.
 *
 * @param token - The authorization token.
 * @param id - The user id.
 * @param password - The new password to set for the user.
 * @returns A promise that resolves with the updated user data if successful,
 * or `false` if the user with the provided email does not exist.
 */
export const changePasswordUser = async (token: string, id: number, password: string): Promise<User> => {
  const query = gql`
    mutation ($id: ID!, $password: String!) {
      updateUsersPermissionsUser(id: $id, data: { password: $password }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User>(token, query, {
    id,
    password,
  });
  return data.updateUsersPermissionsUser;
};

/**
 * Checks if an email address exists in the database and is confirmed and not blocked.
 *
 * @param email - The email address to check for existence.
 * @returns - A promise that resolves with user information if the email exists and meets the criteria, or undefined otherwise.
 */
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const query = gql`
    query ($email: String!) {
      usersPermissionsUsers(filters: { email: { eq: $email }, confirmed: { eq: true }, blocked: { eq: false } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User[]>(STRAPI_TOKEN_KEY, query, { email });
  return data.usersPermissionsUsers[0];
};

/**
 * Check if a user email exists or not.
 *
 * @param email - The user's email to check.
 * @returns A promise that resolves to a boolean indicating if the email exists.
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  const query = gql`
    query ($email: String!) {
      usersPermissionsUsers(filters: { email: { eq: $email } }) {
        data {
          id
        }
      }
      userLinkedAccounts(filters: { email: { eq: $email } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User[] | UserLinkedAccount[]>(STRAPI_TOKEN_KEY, query, { email });
  return data.usersPermissionsUsers?.length > 0 || data.userLinkedAccounts?.length > 0;
};

/**
 * Checks if a phone number exists in the database.
 *
 * @param {string} phoneNumber - The phone number to check.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the phone number exists, false otherwise.
 */
export const checkPhoneNumberExists = async (phoneNumber: string): Promise<boolean> => {
  const query = gql`
    query ($phoneNumber: String!) {
      usersPermissionsUsers(filters: { phoneNumber: { eq: $phoneNumber } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User[]>(STRAPI_TOKEN_KEY, query, { phoneNumber });
  return data.usersPermissionsUsers?.length > 0;
};

/**
 * This function creates a new user.
 * It first creates an address information record and then uses that ID to create the user.
 * If a provider is specified, it also creates a linked account for the user.
 * After creating the user, it updates the user with the IDs of the created detail, setting, and linked account records.
 *
 * @param {SignUpForm} signUpForm - The form data for the new user.
 * @returns {Promise<string>} - The ID of the created user.
 */
export const createUser = async ({
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  provider,
  avatar,
}: SignUpForm) => {
  const addressInformationId = await prisma.$transaction(async (prisma) => {
    const id = await createAddressInformation(prisma, {});
    return id;
  });

  let linkedAccountQuery = "";
  if (provider) {
    linkedAccountQuery = `createUserLinkedAccount(
                            data: {
                              provider: $provider
                              email: $email
                              publishedAt: $publishedAt
                              ${avatar ? "avatar: $avatar" : ""}
                            }
                          ) {
                            data {
                              id
                            }
                          }`;
  }

  const query = gql`
    mutation (
      $email: String!
      $password: String!
      $publishedAt: DateTime!
      $role: ID!
      $addressInformationId: ID
      $firstName: String
      $lastName: String
      $phoneNumber: String
      ${provider ? "$provider: ENUM_USERLINKEDACCOUNT_PROVIDER" : ""}
      ${avatar ? "$avatar: String" : ""}
      ) {
        createUsersPermissionsUser(
          data: {
          username: $email
          email: $email
          ${provider ? "emailVerified: true" : ""}
          password: $password
          role: $role
          phoneNumber: $phoneNumber
          ${provider ? "confirmed: true" : "confirmed: false"}
          blocked: false
        }
      ) {
        data {
          id
        }
      }
      createUserDetail(data: { firstName: $firstName, lastName: $lastName, address: $addressInformationId, publishedAt: $publishedAt }) {
        data {
          id
        }
      }
      createUserSetting(data: { publishedAt: $publishedAt }) {
        data {
          id
        }
      }
      ${linkedAccountQuery}
    }
  `;

  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    addressInformationId,
    role: ROLE_AUTHENTICATED,
    publishedAt: new Date(),
    ...(provider && { provider }),
    ...(avatar && { avatar }),
  });

  const queryUpdate = gql`
    mutation (
      $userId: ID!
      $userDetailId: ID!
      $userSettingId: ID!
      $addressId: ID!
      ${provider ? "$userLinkedAccountId: [ID]" : ""}
    ) {
      updateUsersPermissionsUser(
        id: $userId
        data: {
          detail: $userDetailId
          setting: $userSettingId
          ${provider ? "linkedAccounts: $userLinkedAccountId" : ""}
        }
      ) {
        data {
          id
        }
      }
      updateUserDetail(
        id: $userDetailId
        data: {
          address: $addressId
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data: dataRegister } = await fetcher(STRAPI_TOKEN_KEY, queryUpdate, {
    userId: data.createUsersPermissionsUser.id,
    userDetailId: data.createUserDetail.id,
    userSettingId: data.createUserSetting.id,
    addressId: addressInformationId,
    ...(provider && {
      userLinkedAccountId: data.createUserLinkedAccount.id,
    }),
  });

  return dataRegister.updateUsersPermissionsUser.id;
};

/**
 * Checks if a user with the specified ID is confirmed.
 *
 * @param email - The Email of the user to check.
 * @returns - A promise that resolves to a boolean indicating whether the user is confirmed or not.
 */
export const checkUserConfirmed = async (email: string): Promise<boolean> => {
  const query = gql`
    query ($email: String!) {
      usersPermissionsUsers(filters: { email: { eq: $email }, confirmed: { eq: true } }) {
        data {
          id
          attributes {
            confirmed
          }
        }
      }
    }
  `;

  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, { email });

  return data.usersPermissionsUsers.length > 0;
};

/**
 * Confirm a user by updating their confirmed and emailVerified status.
 *
 * @param id - The ID of the user to confirm.
 */
export const activeUser = async (id: number): Promise<string | undefined> => {
  const query = gql`
    mutation ($id: ID!) {
      updateUsersPermissionsUser(id: $id, data: { confirmed: true, emailVerified: true }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, { id });

  return data.updateUsersPermissionsUser.id;
};

/**
 * Creates a linked user account for a specific provider.
 *
 * @param {number} userId - The ID of the associated user.
 * @param {string} email - The email of the linked account.
 * @param {string} avatar - The avatar URL of the linked account.
 * @param {string} sub - The unique identifier for the linked account.
 * @param {UserLinkedAccountProvider} provider - The provider of the linked account.
 *
 * @returns {Promise<number | undefined>} A Promise that resolves to the ID of the created linked account if successful, or `undefined` in case of an error.
 */
export const createLinkedAccount = async (
  userId: number,
  email: string,
  avatar: string,
  sub: string,
  provider: UserLinkedAccountProvider
): Promise<number | undefined> => {
  const query = gql`
    mutation (
      $email: String!
      $avatar: String!
      $publishedAt: DateTime!
      $userId: ID!
      $sub: String!
      $provider: ENUM_USERLINKEDACCOUNT_PROVIDER
    ) {
      createUserLinkedAccount(
        data: {
          provider: $provider
          email: $email
          avatar: $avatar
          publishedAt: $publishedAt
          user: $userId
          userId: $sub
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher(STRAPI_TOKEN_KEY, query, {
    userId,
    email,
    avatar,
    sub,
    publishedAt: new Date(),
    provider,
  });
  return data.createUserLinkedAccount.id;
};

/**
 * Checks if an email is linked to a user account for a specific provider.
 *
 * @param {string} email - The email to check for linkage.
 * @param {UserLinkedAccountProvider} provider - The provider for which to check linkage.
 *
 * @returns {Promise<boolean | undefined>} A Promise that resolves to `true` if the email is linked, `false` if not, or `undefined` in case of an error.
 */
export const checkEmailLinkedExists = async (
  email: string,
  provider: UserLinkedAccountProvider
): Promise<boolean | undefined> => {
  const query = gql`
    query ($email: String!, $provider: String!) {
      userLinkedAccounts(filters: { email: { eq: $email }, provider: { eq: $provider } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<User[]>(STRAPI_TOKEN_KEY, query, {
    email,
    provider,
  });

  return data.userLinkedAccounts?.length > 0;
};
