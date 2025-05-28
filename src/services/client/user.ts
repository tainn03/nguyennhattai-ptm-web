import { Gender, User, UserDetail, UserLinkedAccount, UserLinkedAccountProvider } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";
import moment from "moment";

import { ProfileForm } from "@/forms/userProfile";
import { AddressInformationInfo, UserInfo, UserSettingInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * Retrieves the user profile information, including details, settings, and linked accounts,
 * for a specified user ID using a GraphQL query.
 *
 * @param {number} userId - The ID of the user whose profile information is to be retrieved.
 * @returns {Promise<UserInfo | undefined>} A promise that resolves to the user's profile data, if found.
 */
export const getUserProfile = async (userId: number): Promise<UserInfo | undefined> => {
  const { data } = await graphQLPost<UserInfo>({
    query: gql`
      query ($userId: ID!) {
        usersPermissionsUser(id: $userId) {
          data {
            id
            attributes {
              username
              email
              emailVerified
              phoneNumber
              phoneNumberVerified
              updatedAt
              detail {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                    avatar {
                      data {
                        id
                        attributes {
                          url
                          previewUrl
                        }
                      }
                    }
                  }
                }
              }
              setting {
                data {
                  id
                  attributes {
                    organizationId
                    locale
                    lastNotificationSentAt
                  }
                }
              }
              linkedAccounts {
                data {
                  id
                  attributes {
                    provider
                    email
                    avatar
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: { userId },
  });

  return data?.usersPermissionsUser;
};

/**
 * Updates the language setting for a user with the specified ID.
 *
 * @param userSettingId The ID of the user setting.
 * @param locale The new language setting to be applied.
 * @returns A Promise that resolves when the language setting is successfully updated.
 */
export const updateUserLanguageSetting = async (userSettingId: number, locale: string): Promise<number | undefined> => {
  const { data } = await graphQLPost<UserSettingInfo>({
    query: gql`
      mutation ($userSettingId: ID!, $locale: String!) {
        updateUserSetting(id: $userSettingId, data: { locale: $locale }) {
          data {
            id
          }
        }
      }
    `,
    params: { userSettingId, locale },
  });

  return data?.updateUserSetting?.id;
};

/**
 * Updates the organizationId setting for a user with the specified ID.
 *
 * @param userSettingId The ID of the user setting.
 * @param orgId The new organizationId setting to be applied.
 * @returns A Promise that resolves when the organizationId setting is successfully updated.
 */
export const updateUserOrganizationIdSetting = async (
  userSettingId: number,
  orgId: number
): Promise<number | undefined> => {
  const { data } = await graphQLPost<UserSettingInfo>({
    query: gql`
      mutation ($userSettingId: ID!, $orgId: Int!) {
        updateUserSetting(id: $userSettingId, data: { organizationId: $orgId }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      userSettingId,
      orgId,
    },
  });

  return data?.updateUserSetting?.id;
};

/**
 * Get user details by user ID.
 *
 * @param userId - The ID of the user whose details you want to fetch.
 * @returns - User details or undefined if the user is not found.
 */
export const getUser = async (
  userId: number
): Promise<(User & { detail: UserDetail & { address: AddressInformationInfo } }) | undefined> => {
  const query = gql`
    query ($id: ID!) {
      usersPermissionsUser(id: $id) {
        data {
          id
          attributes {
            email
            emailVerified
            phoneNumber
            detail {
              data {
                id
                attributes {
                  firstName
                  lastName
                  dateOfBirth
                  gender
                  description
                  avatar {
                    data {
                      attributes {
                        name
                        url
                      }
                    }
                  }
                  address {
                    data {
                      id
                      attributes {
                        country {
                          data {
                            id
                            attributes {
                              code
                              name
                            }
                          }
                        }
                        city {
                          data {
                            id
                            attributes {
                              code
                              name
                            }
                          }
                        }
                        district {
                          data {
                            id
                            attributes {
                              code
                              name
                            }
                          }
                        }
                        ward {
                          data {
                            id
                            attributes {
                              code
                              name
                            }
                          }
                        }
                        addressLine1
                        addressLine2
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<User & { detail: UserDetail & { address: AddressInformationInfo } }>({
    query,
    params: {
      id: userId,
    },
  });

  return data?.usersPermissionsUser;
};

/**
 * Update user and user details by user ID.
 *
 * @param userId - The ID of the user whose details you want to update.
 * @param userDetailId - The ID user detail of the user whose details you want to update.
 *  @param fileId - The ID avatar upload.
 * @param dataUser - The data to update the user and user detail with.
 * @returns - Updated user details or undefined if the user is not found.
 */
export const updateUserAndUserDetail = async (
  userId: number,
  userDetailId: number,
  dataUser: ProfileForm,
  organizationMemberId?: number,
  isOrganizationOwner?: boolean
): Promise<boolean> => {
  const updateUserQuery = gql`
    updateUsersPermissionsUser(id: $userId, data: { phoneNumber: $phoneNumber }) {
      data {
        id
      }
    }
  `;
  const updateOrganizationMemberQuery = gql`
    updateOrganizationMember(id: $organizationMemberId, data: { phoneNumber: $phoneNumber }) {
      data {
        id
      }
    }
  `;
  const updateUserDetailQuery = `
    updateUserDetail(
      id: $detailId
      data: {
        firstName: $firstName
        lastName: $lastName
        description: $description
        dateOfBirth: $dateOfBirth
        gender: $gender
      }
    ) {
      data {
        id
      }
    }
  `;
  let query = "";
  if (organizationMemberId) {
    query = gql`
      mutation (
        ${isOrganizationOwner ? "$userId: ID!" : ""}
        $phoneNumber: String
        $organizationMemberId: ID!
        $detailId: ID!
        $firstName: String
        $lastName: String
        $description: String
        $dateOfBirth: Date
        $gender: ENUM_USERDETAIL_GENDER
      ) {
        ${updateOrganizationMemberQuery}
        ${isOrganizationOwner ? updateUserQuery : ""}
        ${updateUserDetailQuery}
      }
    `;
  } else {
    query = gql`
      mutation (
        $userId: ID!
        $phoneNumber: String
        $detailId: ID!
        $firstName: String
        $lastName: String
        $description: String
        $dateOfBirth: Date
        $gender: ENUM_USERDETAIL_GENDER
      ) {
        ${updateUserQuery}
        ${updateUserDetailQuery}
      }
    `;
  }

  const { detail } = dataUser;
  const { status, data } = await graphQLPost<UserInfo>({
    query,
    params: {
      ...((!organizationMemberId || isOrganizationOwner) && { userId }),
      ...(organizationMemberId && { organizationMemberId }),
      phoneNumber: dataUser.phoneNumber,
      detailId: userDetailId,
      firstName: detail?.firstName,
      lastName: detail?.lastName,
      description: detail?.description,
      dateOfBirth: detail?.dateOfBirth ? moment(detail.dateOfBirth).format("YYYY-MM-DD") : null,
      gender: (detail?.gender as Gender) || Gender.UNKNOWN,
    },
  });

  return status === HttpStatusCode.Ok && !!data;
};

/**
 * Deletes a linked account.
 *
 * @param userLinkedId The ID of the linked account to delete.
 * @returns The ID of the deleted linked account, or undefined if the deletion was unsuccessful.
 */
export const deleteLinkedAccount = async (userLinkedId: number): Promise<number | undefined> => {
  const query = gql`
    mutation ($id: ID!) {
      deleteUserLinkedAccount(id: $id) {
        data {
          id
        }
      }
    }
  `;

  const { status, data } = await graphQLPost<User>({
    query,
    params: {
      id: userLinkedId,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return data.deleteUserLinkedAccount?.id;
  }
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

  const { status, data } = await graphQLPost<User>({
    query,
    params: {
      userId,
      email,
      avatar,
      sub,
      publishedAt: new Date(),
      provider,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return data.createUserLinkedAccount.id;
  }
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

  const { status, data } = await graphQLPost<User[] | UserLinkedAccount[]>({
    query,
    params: { email, provider },
  });

  if (status === HttpStatusCode.Ok && data) {
    return data.userLinkedAccounts?.length > 0;
  }
};
