"use server";

import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { AddressInformationInputForm } from "@/forms/addressInformation";
import { AddressInformationInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * This function creates a new address information record by sending a GraphQL mutation to the server.
 *
 * @param address - The address information to be created.
 * @returns - A promise that resolves with the created address information.
 */
export const createAddressInformation = async (
  address: AddressInformationInputForm
): Promise<AddressInformationInfo> => {
  const query = gql`
    mutation (
      $country: ID
      $city: ID
      $district: ID
      $ward: ID
      $postalCode: String
      $addressLine1: String
      $addressLine2: String
      $latitude: Float
      $longitude: Float
      $createdByUser: ID
      $publishedAt: DateTime
    ) {
      createAddressInformation(
        data: {
          country: $country
          city: $city
          district: $district
          ward: $ward
          postalCode: $postalCode
          addressLine1: $addressLine1
          addressLine2: $addressLine2
          latitude: $latitude
          longitude: $longitude
          createdByUser: $createdByUser
          updatedByUser: $createdByUser
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<AddressInformationInfo>(STRAPI_TOKEN_KEY, query, {
    ...(address.country?.id && { country: Number(address.country.id) }),
    ...(address.city?.id && { city: Number(address.city.id) }),
    ...(address.district?.id && { district: Number(address.district.id) }),
    ...(address.ward?.id && { ward: Number(address.ward.id) }),
    ...(address.postalCode && { postalCode: address.postalCode }),
    ...(address.addressLine1 && { addressLine1: address.addressLine1 }),
    ...(address.addressLine2 && { addressLine2: address.addressLine2 }),
    ...(address.latitude && { latitude: address.latitude }),
    ...(address.longitude && { longitude: address.longitude }),
    createdByUser: Number(address.createdById),
    publishedAt: new Date().toISOString(),
  });

  return data.createAddressInformation;
};

/**
 * Updates an existing AddressInformation record based on the provided entity data.
 *
 * @param entity - The data for updating an existing AddressInformation record, including the ID.
 * @returns A promise that resolves to the result of the mutation, including the updated AddressInformation data.
 */
export const updateAddressInformation = async (
  entity: AddressInformationInputForm
): Promise<AddressInformationInfo> => {
  const { id, updatedById, country, city, district, ward, addressLine1, ...rest } = trim(entity);

  const query = gql`
    mutation (
      $id: ID!
      $country: ID
      $city: ID
      $district: ID
      $ward: ID
      $postalCode: String
      $addressLine1: String
      $addressLine2: String
      $latitude: Float
      $longitude: Float
      $updatedByUser: ID
    ) {
      updateAddressInformation(
        id: $id
        data: {
          country: $country
          city: $city
          district: $district
          ward: $ward
          postalCode: $postalCode
          addressLine1: $addressLine1
          addressLine2: $addressLine2
          latitude: $latitude
          longitude: $longitude
          updatedByUser: $updatedByUser
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<AddressInformationInfo>(STRAPI_TOKEN_KEY, query, {
    id,
    country: country?.id ? Number(country.id) : null,
    city: city?.id ? Number(city.id) : null,
    district: district?.id ? Number(district.id) : null,
    ward: ward?.id ? Number(ward.id) : null,
    addressLine1: addressLine1 ?? null,
    addressLine2: rest.addressLine2 ?? null,
    latitude: rest.latitude ?? null,
    longitude: rest.longitude ?? null,
    updatedByUser: updatedById ? Number(updatedById) : null,
  });

  return data.updateAddressInformation;
};

/**
 * Upsert an AddressInformation record based on the provided entity data.
 *
 * @param entity - The data for updating an existing AddressInformation record, including the ID.
 * @returns A promise that resolves to the result of the mutation, including the updated AddressInformation data.
 */
export const upsertAddressInformation = async (
  entity: AddressInformationInputForm
): Promise<AddressInformationInfo> => {
  if (entity.id) {
    return updateAddressInformation(entity);
  }

  return createAddressInformation(entity);
};
