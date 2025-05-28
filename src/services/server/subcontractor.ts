import { gql } from "graphql-request";

import { SubcontractorInputForm, SubcontractorUpdateForm } from "@/forms/subcontractor";
import { SubcontractorInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";
/**
 * A function to check if a subcontractor record is exclusive (not updated by others) based on the lastUpdatedAt timestamp.
 *
 * @param jwt - JSON Web Token for authentication.
 * @param organizationId - The organization ID to filter subcontractors.
 * @param id - The ID of the subcontractor to check exclusivity for.
 * @param lastUpdatedAt - The timestamp representing the last update to compare against.
 * @returns A Promise that resolves to true if the subcontractor is exclusive, false otherwise.
 */
export const checkSubcontractorExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      subcontractors(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<SubcontractorInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data.subcontractors[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * A function to check if a subcontractor with a given code exists within an organization, excluding a specific ID if provided.
 *
 * @param jwt - JSON Web Token for authentication.
 * @param organizationId - The organization ID to filter subcontractors.
 * @param code - The code of the subcontractor to check for existence.
 * @param excludeId - An optional ID to exclude from the search (useful for updates).
 * @returns A Promise that resolves to true if a subcontractor with the given code exists, false otherwise.
 */
export const checkCodeSubcontractorExists = async (
  jwt: string,
  organizationId: number,
  code: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $code: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      subcontractors(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          code: { eq: $code }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<SubcontractorInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    code,
    organizationId,
  });

  return data.subcontractors.length > 0;
};

/**
 * Create a new subcontractor entity using the provided data.
 *
 * @param jwt - JSON Web Token for authentication.
 * @param entity - Subcontractor data including details like organization, code, name, etc.
 * @returns A promise that resolves to the created subcontractor entity or undefined.
 */
export const createSubcontractor = async (
  jwt: string,
  entity: SubcontractorInputForm
): Promise<SubcontractorInfo | undefined> => {
  const { email, userId, documentsId, bankAccountId, meta, ...otherEntityProps } = trim(entity);

  const query = gql`
    mutation (
      $organizationId: Int!
      $code: String
      $name: String
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $bankAccount: ID!
      $documents: [ID]
      $userId: ID
      $description: String
      $isActive: Boolean!
      $publishedAt: DateTime
      $createdById: ID
      $meta: JSON
    ) {
      createSubcontractor(
        data: {
          organizationId: $organizationId
          code: $code
          name: $name
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          bankAccount: $bankAccount
          documents: $documents
          user: $userId
          description: $description
          isActive: $isActive
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

  const { data } = await fetcher<SubcontractorInfo>(jwt, query, {
    ...otherEntityProps,
    email: email ? email : null,
    bankAccount: bankAccountId ?? null,
    userId: userId ?? null,
    documents: documentsId ?? null,
    publishedAt: new Date(),
    meta: JSON.stringify(meta),
  });

  return data.createSubcontractor;
};

/**
 * Update an existing subcontractor entity with the provided data.
 *
 * @param jwt - JSON Web Token for authentication.
 * @param entity - Partial data to update the subcontractor, including the organization, code, name, etc.
 * @returns A promise that resolves to the updated subcontractor entity or undefined.
 */
export const updateSubcontractor = async (
  jwt: string,
  entity: Partial<SubcontractorUpdateForm>
): Promise<SubcontractorInfo | undefined> => {
  const { email, userId, documentsId, oldDocumentId, deleteDocument, meta, ...objectEntity } = trim(entity);

  const deleteDocumentQuery =
    (deleteDocument || documentsId) && oldDocumentId
      ? `deleteUploadFile(id: $oldDocumentId) {
         data {
           id
         }
       }`
      : "";

  const query = gql`
    mutation (
      $id: ID!
      $organizationId: Int!
      $code: String
      $name: String
      $taxCode: String
      $email: String
      $phoneNumber: String
      $website: String
      $businessAddress: String
      $userId: ID
      $description: String
      $isActive: Boolean!
      $updatedById: ID
      $meta: JSON
      ${documentsId ? "$documentsId: [ID]!" : ""}
      ${(deleteDocument || documentsId) && oldDocumentId ? "$oldDocumentId: ID!" : ""}
    ) {
      updateSubcontractor(
        id: $id
        data: {
          ${documentsId ? "documents: $documentsId" : ""}
          organizationId: $organizationId
          code: $code
          name: $name
          taxCode: $taxCode
          email: $email
          phoneNumber: $phoneNumber
          website: $website
          businessAddress: $businessAddress
          user: $userId
          description: $description
          isActive: $isActive
          updatedByUser: $updatedById
          meta: $meta
        }
      ) {
        data {
          id
        }
      }
      ${deleteDocumentQuery}
    }
  `;

  const { data } = await fetcher<SubcontractorInfo>(jwt, query, {
    ...objectEntity,
    email: email ? email : null,
    userId: userId ?? null,
    oldDocumentId: oldDocumentId ?? null,
    documentsId: documentsId ?? null,
    meta: JSON.stringify(meta),
  });

  return data.updateSubcontractor;
};
