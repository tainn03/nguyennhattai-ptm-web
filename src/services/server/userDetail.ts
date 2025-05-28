import { UserDetail } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { PrismaClientTransaction } from "@/configs/prisma";
import { UserDetailInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

import { createAddressInformation, updateAddressInformation } from "./addressInformation";

/**
 * Creates an organization user detail by creating address information and linking it with user details.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client with transaction support.
 * @param {Partial<UserDetailInfo>} entity - Partial information for the user detail.
 * @param {number} createdById - The ID of the user who is creating the organization user detail.
 * @returns {Promise<number>} - A Promise resolving to the ID of the created user detail.
 */
export const createOrganizationUserDetail = async (
  prismaClient: PrismaClientTransaction,
  entity: Partial<UserDetailInfo>,
  createdById: number
) => {
  const { address, firstName, lastName } = trim(entity);

  // Create address information and get the created address ID
  const createdAddressId = await createAddressInformation(prismaClient, {
    ...address,
    createdById,
  });

  // Create user detail with first name, last name, and publication date
  const createdUserDetail = await prismaClient.userDetail.create({
    data: {
      firstName,
      lastName,
      publishedAt: new Date(),
    },
  });

  // Link the created user detail with the address information
  await prismaClient.userDetailAddressLinks.create({
    data: {
      addressInformationId: createdAddressId,
      userDetailId: createdUserDetail.id,
    },
  });

  return createdUserDetail.id;
};

/**
 * Updates the details of an organization user including first name, last name, and address.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client for database operations.
 * @param {Partial<UserDetailInfo>} entity - The partial details of the user to be updated.
 * @param {number} updatedById - The ID of the user who is updating these details.
 * @returns {Promise<number>} - A Promise resolving to the ID of the updated user detail.
 */
export const updateOrganizationUserDetail = async (
  prismaClient: PrismaClientTransaction,
  entity: Partial<UserDetailInfo>,
  updatedById: number
) => {
  const { id, firstName, lastName, address } = trim(entity);

  // Update address information
  await updateAddressInformation(prismaClient, { ...address, updatedById });

  // Update user detail
  const updatedUserDetail = await prismaClient.userDetail.update({
    where: {
      id: Number(id),
    },
    data: {
      firstName,
      lastName,
    },
  });

  return updatedUserDetail.id;
};

/**
 * Update the avatar for a user detail record.
 *
 * @param {string} token - The authentication token for the request.
 * @param userDetailId - The ID of the user detail record to update.
 * @param avatarId - The ID of the image to set as the avatar.
 * @returns - The updated user detail or undefined if the update fails.
 */
export const updateAvatar = async (userDetailId: number, avatarId: number): Promise<UserDetail | undefined> => {
  const query = gql`
    mutation ($userDetailId: ID!, $avatarId: ID!) {
      updateUserDetail(id: $userDetailId, data: { avatar: $avatarId }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<UserDetail>(STRAPI_TOKEN_KEY, query, {
    userDetailId,
    avatarId,
  });

  return data.updateUserDetail;
};
