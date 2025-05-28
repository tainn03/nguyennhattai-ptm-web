import { gql } from "graphql-request";

import { HttpStatusCode } from "@/types/api";
import { AddressInformationInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";

/**
 * This function updates the address information associated with a user.
 * It sends a GraphQL mutation to the server to update the user's address details.
 *
 * @param id - The ID of the address information to be updated.
 * @param userId - The ID of the user associated with the address.
 * @param  data - The address information to be updated.
 * @returns - A promise that resolves with the updated address information.
 */
export const updateAddressInformation = async (
  id: number,
  userId: number,
  countryId?: number | null,
  cityId?: number | null,
  districtId?: number | null,
  wardId?: number | null,
  addressLine1?: string
): Promise<AddressInformationInfo | null> => {
  const query = gql`
    mutation ($id: ID!, $userId: ID!, $country: ID, $city: ID, $district: ID, $ward: ID, $addressLine1: String) {
      updateAddressInformation(
        id: $id
        data: {
          country: $country
          city: $city
          district: $district
          ward: $ward
          addressLine1: $addressLine1
          createdByUser: $userId
          updatedByUser: $userId
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { status, data } = await graphQLPost<AddressInformationInfo>({
    query,
    params: {
      id,
      userId,
      country: countryId ?? null,
      city: cityId ?? null,
      district: districtId ?? null,
      ward: wardId ?? null,
      addressLine1: addressLine1,
    },
  });
  if (status === HttpStatusCode.Ok && data) {
    return data.updateAddressInformation;
  }

  return null;
};
