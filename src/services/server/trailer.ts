import { TrailerOwnerType } from "@prisma/client";
import { gql } from "graphql-request";

import { TrailerInfo } from "@/types/strapi";
import { formatGraphQLDate } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Check for exclusivity of a trailer's last update by comparing its "updatedAt" timestamp.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - The organization's unique identifier.
 * @param {number} id - The unique identifier of the trailer to be checked.
 * @param {Date | string} lastUpdatedAt - The timestamp of the last update.
 * @returns {Promise<boolean>} - A boolean indicating whether the trailer's "updatedAt" differs from the provided timestamp.
 */
export const checkTrailerExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      trailers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<TrailerInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.trailers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Check if a trailer with a given trailer number already exists in the organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {string} trailerNumber - The trailer number to check for existence.
 * @param {number} organizationId - The unique identifier of the organization.
 * @param {number | undefined} excludeId - Optional ID to exclude from the check (useful for edits).
 * @returns {Promise<boolean>} - A boolean indicating whether a trailer with the given number exists in the organization.
 */
export const checkTrailerNumberExists = async (
  jwt: string,
  trailerNumber: string,
  organizationId: number,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $trailerNumber: String!, ${excludeId ? "$excludeId: ID" : ""}) {
        trailers(filters: { publishedAt: { ne: null }, trailerNumber: { eq: $trailerNumber }, organizationId: { eq: $organizationId }, ${
          excludeId ? "id: { ne: $excludeId }" : ""
        }  }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<TrailerInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    trailerNumber: trim(trailerNumber),
    organizationId,
  });

  return data?.trailers.length > 0;
};

/**
 * Check if a trailer with a given ID number already exists in the organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {string} idNumber - The ID number to check for existence.
 * @param {number} organizationId - The unique identifier of the organization.
 * @param {number | undefined} excludeId - Optional ID to exclude from the check (useful for edits).
 * @returns {Promise<boolean>} - A boolean indicating whether a trailer with the given ID number exists in the organization.
 */
export const checkIdNumberExists = async (
  jwt: string,
  idNumber: string,
  organizationId: number,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $idNumber: String!,  ${excludeId ? "$excludeId: ID" : ""}) {
        trailers(filters: { publishedAt: { ne: null }, organizationId: { eq: $organizationId }, idNumber: { eq: $idNumber }, ${
          excludeId ? "id: { ne: $excludeId }" : ""
        } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<TrailerInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    idNumber: trim(idNumber),
    organizationId,
  });

  return data?.trailers.length > 0;
};

/**
 * Create a new trailer with the given information.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {object} entity - Trailer information to be created, including ownerType, organizationId, subcontractorId, yearOfManufacture, typeId, vehicleId, and more.
 * @returns {Promise<TrailerInfo | undefined>} - A Promise that resolves to the created TrailerInfo or undefined if an error occurs.
 */
export const createTrailer = async (
  jwt: string,
  entity: Omit<TrailerInfo, "id"> & { idImages: Array<number> | null }
): Promise<TrailerInfo | undefined> => {
  const {
    ownerType,
    organizationId,
    subcontractorId,
    yearOfManufacture,
    typeId,
    vehicleId,
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
    idImages,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
    createdById,
    meta,
    ...otherEntityProps
  } = trim(entity);

  const query = gql`
    mutation (
      $ownerType: ENUM_TRAILER_OWNERTYPE
      $organizationId: Int
      $subcontractorId: Int
      $type: ID
      $trailerNumber: String!
      $idNumber: String
      $yearOfManufacture: Int
      $color: String
      $startUsageDate: Date
      $registrationDate: Date
      $registrationExpirationDate: Date
      $technicalSafetyRegistrationDate: Date
      $technicalSafetyExpirationDate: Date
      $liabilityInsuranceRegistrationDate: Date
      $liabilityInsuranceExpirationDate: Date
      $brand: String
      $images: [ID]
      $isActive: Boolean!
      $description: String
      $maxLength: Float
      $maxWidth: Float
      $maxHeight: Float
      $cubicMeterCapacity: Float
      $tonPayloadCapacity: Float
      $palletCapacity: Int
      $registrationCertificate: [ID]
      $technicalSafetyCertificate: [ID]
      $liabilityInsuranceCertificate: [ID]
      $vehicle: ID
      $publishedAt: DateTime
      $createdById: ID
      $meta: JSON
    ) {
      createTrailer(
        data: {
          ownerType: $ownerType
          organizationId: $organizationId
          subcontractorId: $subcontractorId
          type: $type
          trailerNumber: $trailerNumber
          idNumber: $idNumber
          yearOfManufacture: $yearOfManufacture
          color: $color
          startUsageDate: $startUsageDate
          registrationDate: $registrationDate
          registrationExpirationDate: $registrationExpirationDate
          technicalSafetyRegistrationDate: $technicalSafetyRegistrationDate
          technicalSafetyExpirationDate: $technicalSafetyExpirationDate
          liabilityInsuranceRegistrationDate: $liabilityInsuranceRegistrationDate
          liabilityInsuranceExpirationDate: $liabilityInsuranceExpirationDate
          brand: $brand
          images: $images
          isActive: $isActive
          description: $description
          maxLength: $maxLength
          maxWidth: $maxWidth
          maxHeight: $maxHeight
          cubicMeterCapacity: $cubicMeterCapacity
          tonPayloadCapacity: $tonPayloadCapacity
          palletCapacity: $palletCapacity
          registrationCertificate: $registrationCertificate
          technicalSafetyCertificate: $technicalSafetyCertificate
          liabilityInsuranceCertificate: $liabilityInsuranceCertificate
          vehicle: $vehicle
          publishedAt: $publishedAt
          createdByUser: $createdById
          updatedByUser: $createdById
          meta: $meta
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<TrailerInfo>(jwt, query, {
    ...otherEntityProps,
    ownerType: ownerType as TrailerOwnerType,
    organizationId: Number(organizationId),
    subcontractorId: ownerType === TrailerOwnerType.SUBCONTRACTOR ? Number(subcontractorId) : null,
    yearOfManufacture: Number(yearOfManufacture),
    type: typeId ?? null,
    vehicle: vehicleId ?? null,
    startUsageDate: formatGraphQLDate(startUsageDate),
    registrationDate: formatGraphQLDate(registrationDate),
    registrationExpirationDate: formatGraphQLDate(registrationExpirationDate),
    technicalSafetyRegistrationDate: formatGraphQLDate(technicalSafetyRegistrationDate),
    technicalSafetyExpirationDate: formatGraphQLDate(technicalSafetyExpirationDate),
    liabilityInsuranceRegistrationDate: formatGraphQLDate(liabilityInsuranceRegistrationDate),
    liabilityInsuranceExpirationDate: formatGraphQLDate(liabilityInsuranceExpirationDate),
    images: idImages,
    registrationCertificate: registrationCertificate ? registrationCertificate[0].id : null,
    technicalSafetyCertificate: technicalSafetyCertificate ? technicalSafetyCertificate[0].id : null,
    liabilityInsuranceCertificate: liabilityInsuranceCertificate ? liabilityInsuranceCertificate[0].id : null,
    createdById,
    publishedAt: new Date(),
    meta: JSON.stringify(meta),
  });

  return data.createTrailer;
};

/**
 * Update an existing trailer with the given information.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {object} entity - Trailer information to be updated, including ownerType, organizationId, subcontractorId, yearOfManufacture, typeId, vehicleId, and more.
 * @returns {Promise<TrailerInfo | undefined>} - A Promise that resolves to the updated TrailerInfo or undefined if an error occurs.
 */
export const updateTrailer = async (
  jwt: string,
  entity: TrailerInfo & { idImages: Array<number> | null }
): Promise<TrailerInfo | undefined> => {
  const {
    ownerType,
    subcontractorId,
    organizationId,
    yearOfManufacture,
    typeId,
    vehicleId,
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
    idImages,
    registrationCertificate,
    technicalSafetyCertificate,
    liabilityInsuranceCertificate,
    updatedById,
    meta,
    ...otherEntityProps
  } = trim(entity);
  const query = gql`
      mutation (
        $id: ID!
        $ownerType: ENUM_TRAILER_OWNERTYPE
        $organizationId: Int
        $subcontractorId: Int
        $type: ID
        $trailerNumber: String!
        $idNumber: String
        $yearOfManufacture: Int
        $color: String
        $startUsageDate: Date
        $registrationDate: Date
        $registrationExpirationDate: Date
        $technicalSafetyRegistrationDate: Date
        $technicalSafetyExpirationDate: Date
        $liabilityInsuranceRegistrationDate: Date
        $liabilityInsuranceExpirationDate: Date
        $brand: String
        ${idImages ? "$images: [ID]" : ""}
        ${registrationCertificate ? "$registrationCertificate: [ID]" : ""}
        ${technicalSafetyCertificate ? "$technicalSafetyCertificate: [ID]" : ""}
        ${liabilityInsuranceCertificate ? "$liabilityInsuranceCertificate: [ID]" : ""}
        $isActive: Boolean!
        $description: String
        $maxLength: Float
        $maxWidth: Float
        $maxHeight: Float
        $cubicMeterCapacity: Float
        $tonPayloadCapacity: Float
        $palletCapacity: Int
        $vehicle: ID
        $updatedById: ID
        $meta: JSON
      ) {
        updateTrailer(
          id: $id
          data: {
            ownerType: $ownerType
            organizationId: $organizationId
            subcontractorId: $subcontractorId
            type: $type
            trailerNumber: $trailerNumber
            idNumber: $idNumber
            yearOfManufacture: $yearOfManufacture
            color: $color
            startUsageDate: $startUsageDate
            registrationDate: $registrationDate
            registrationExpirationDate: $registrationExpirationDate
            technicalSafetyRegistrationDate: $technicalSafetyRegistrationDate
            technicalSafetyExpirationDate: $technicalSafetyExpirationDate
            liabilityInsuranceRegistrationDate: $liabilityInsuranceRegistrationDate
            liabilityInsuranceExpirationDate: $liabilityInsuranceExpirationDate
            brand: $brand
            ${idImages ? "images: $images" : ""}
            ${registrationCertificate ? "registrationCertificate: $registrationCertificate" : ""}
            ${technicalSafetyCertificate ? "technicalSafetyCertificate: $technicalSafetyCertificate" : ""}
            ${liabilityInsuranceCertificate ? "liabilityInsuranceCertificate: $liabilityInsuranceCertificate" : ""}
            isActive: $isActive
            description: $description
            maxLength: $maxLength
            maxWidth: $maxWidth
            maxHeight: $maxHeight
            cubicMeterCapacity: $cubicMeterCapacity
            tonPayloadCapacity: $tonPayloadCapacity
            palletCapacity: $palletCapacity
            vehicle: $vehicle
            updatedByUser: $updatedById
            meta: $meta
          }
        ) {
          data {
            id
          }
        }
      }
    `;

  const { data } = await fetcher<TrailerInfo>(jwt, query, {
    ...otherEntityProps,
    ownerType: ownerType as TrailerOwnerType,
    subcontractorId: ownerType === TrailerOwnerType.SUBCONTRACTOR ? Number(subcontractorId) : null,
    organizationId: Number(organizationId),
    yearOfManufacture: Number(yearOfManufacture),
    type: typeId ?? null,
    vehicle: vehicleId ?? null,
    startUsageDate: startUsageDate || null,
    registrationDate: registrationDate || null,
    registrationExpirationDate: registrationExpirationDate || null,
    technicalSafetyRegistrationDate: technicalSafetyRegistrationDate || null,
    technicalSafetyExpirationDate: technicalSafetyExpirationDate || null,
    liabilityInsuranceRegistrationDate: liabilityInsuranceRegistrationDate || null,
    liabilityInsuranceExpirationDate: liabilityInsuranceExpirationDate || null,
    ...(idImages && { images: idImages }),
    ...(registrationCertificate && { registrationCertificate: registrationCertificate[0].id }),
    ...(technicalSafetyCertificate && { technicalSafetyCertificate: technicalSafetyCertificate[0].id }),
    ...(liabilityInsuranceCertificate && { liabilityInsuranceCertificate: liabilityInsuranceCertificate[0].id }),
    updatedById,
    meta: JSON.stringify(meta),
  });

  return data.updateTrailer;
};
