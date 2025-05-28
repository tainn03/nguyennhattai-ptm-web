import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { AddressInformationInputForm } from "@/forms/addressInformation";
import { AddressInformationInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Creates a new AddressInformation record based on the provided entity data.
 *
 * @param prismaClient - The Prisma client for database access.
 * @param entity - The data for creating a new AddressInformation record, excluding the ID.
 * @returns A promise that resolves to the ID of the newly created AddressInformation record.
 */
export const createAddressInformation = async (
  prismaClient: PrismaClientTransaction,
  entity: Partial<AddressInformationInfo>
): Promise<number> => {
  const { id: _, country, city, district, ward, createdById, addressLine1, addressLine2 } = trim(entity);
  const userId = Number(createdById);

  const result = await prismaClient.addressInformation.create({
    data: {
      addressLine1,
      addressLine2,
      publishedAt: new Date(),
    },
  });

  const addressInformationId = result.id;
  if (country?.id) {
    await prismaClient.addressInformationsCountryLinks.create({
      data: { addressInformationId, administrativeUnitId: Number(country?.id) },
    });
  }
  if (city?.id) {
    await prismaClient.addressInformationsCityLinks.create({
      data: { addressInformationId, administrativeUnitId: Number(city?.id) },
    });
  }
  if (district?.id) {
    await prismaClient.addressInformationsDistrictLinks.create({
      data: { addressInformationId, administrativeUnitId: Number(district?.id) },
    });
  }
  if (ward?.id) {
    await prismaClient.addressInformationsWardLinks.create({
      data: { addressInformationId, administrativeUnitId: Number(ward?.id) },
    });
  }
  await prismaClient.addressInformationsCreatedByUserLinks.create({
    data: { addressInformationId, userId },
  });
  await prismaClient.addressInformationsUpdatedByUserLinks.create({
    data: { addressInformationId, userId },
  });

  return result.id;
};

/**
 * Updates address information in the database.
 *
 * @param prismaClient - An instance of PrismaClientTransaction used for database operations.
 * @param entity - An object representing the updated address information data.
 * @returns A Promise that resolves to a number indicating the number of address information records updated.
 */
export const updateAddressInformation = async (
  prismaClient: PrismaClientTransaction,
  entity: Partial<AddressInformationInfo>
): Promise<number> => {
  const { id, country, city, district, ward, updatedById, addressLine1, addressLine2 } = trim(entity);
  const userId = Number(updatedById);
  const addressInformationId = Number(id);

  const result = await prismaClient.addressInformation.update({
    where: { id: addressInformationId },
    data: {
      addressLine1,
      addressLine2,
    },
  });

  const updateUserLink = await prismaClient.addressInformationsUpdatedByUserLinks.findFirst({
    where: { addressInformationId },
    select: { id: true },
  });

  await Promise.all([
    prismaClient.addressInformationsCountryLinks.deleteMany({ where: { addressInformationId } }), // Country
    prismaClient.addressInformationsCityLinks.deleteMany({ where: { addressInformationId } }), // City
    prismaClient.addressInformationsDistrictLinks.deleteMany({ where: { addressInformationId } }), // District
    prismaClient.addressInformationsWardLinks.deleteMany({ where: { addressInformationId } }), // Ward
  ]);

  if (country?.id) {
    await prismaClient.addressInformationsCountryLinks.create({
      data: { administrativeUnitId: Number(country?.id), addressInformationId },
    });
  }

  if (city?.id) {
    await prismaClient.addressInformationsCityLinks.create({
      data: { administrativeUnitId: Number(city?.id), addressInformationId },
    });
  }

  if (district?.id) {
    await prismaClient.addressInformationsDistrictLinks.create({
      data: { administrativeUnitId: Number(district?.id), addressInformationId },
    });
  }

  if (ward?.id) {
    await prismaClient.addressInformationsWardLinks.create({
      data: { administrativeUnitId: Number(ward?.id), addressInformationId },
    });
  }

  if (updateUserLink) {
    await prismaClient.addressInformationsUpdatedByUserLinks.updateMany({
      data: { userId },
      where: { addressInformationId },
    });
  } else {
    await prismaClient.addressInformationsUpdatedByUserLinks.create({
      data: { addressInformationId, userId },
    });
  }

  return result.id;
};

/**
 * This function creates a new address information record by sending a GraphQL mutation to the server.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param address - The address information to be created.
 * @returns - A promise that resolves with the created address information.
 */
export const createAddressInformationByGraphQL = async (
  jwt: string,
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

  const { data } = await fetcher<AddressInformationInfo>(jwt, query, {
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
 * @param jwt - The JWT for authenticating the request.
 * @param entity - The data for updating an existing AddressInformation record, including the ID.
 * @returns A promise that resolves to the result of the mutation, including the updated AddressInformation data.
 */
export const updateAddressInformationByGraphQL = async (
  jwt: string,
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

  const { data } = await fetcher<AddressInformationInfo>(jwt, query, {
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
 * Upserts an AddressInformation record based on the provided entity data.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param entity - The data for updating an existing AddressInformation record, including the ID.
 * @returns A promise that resolves to the result of the mutation, including the updated AddressInformation data.
 */
export const upsertAddressInformationByGraphQL = async (
  jwt: string,
  entity: AddressInformationInputForm
): Promise<AddressInformationInfo> => {
  if (entity.id) {
    return updateAddressInformationByGraphQL(jwt, entity);
  }

  return createAddressInformationByGraphQL(jwt, entity);
};
