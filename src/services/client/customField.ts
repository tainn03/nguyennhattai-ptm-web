import { CustomFieldType } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";
import omit from "lodash/omit";

import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { CustomFieldInfo } from "@/types/strapi";
import { graphQLPost, post } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches CustomField information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<CustomFieldInfo>} params - Parameters for filtering CustomFields.
 * @returns {Promise<CustomFieldInfo | undefined>} A promise that resolves to the fetched CustomField or null if not found.
 */
export const customFieldFetcher = async ([_, params]: [string, Partial<CustomFieldInfo>]): Promise<
  CustomFieldInfo | undefined
> => {
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customFields(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              type
              dataType
              name
              key
              value
              displayOrder
              min
              max
              isRequired
              canViewByDriver
              canEditByDriver
              validationRegex
              description
              isActive
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              updatedAt
              updatedByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
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
    `,
    params,
  });

  return data?.customFields[0];
};

/**
 * Fetch CustomFieldInfo from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched CustomFieldInfo and pagination meta information.
 */
export const customFieldsFetcher = async ([_, params]: [string, FilterRequest<CustomFieldInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    typeOptions,
    name,
    key,
    displayOrder,
    dataTypeOptions,
    isActiveOptions,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
  } = trim(params);

  const isExistDataTypeOptions = isArray(dataTypeOptions) && dataTypeOptions.length > 0;

  let createdAtCondition = "";
  if (createdAtFrom || createdAtTo) {
    createdAtCondition = `createdAt: {
                            ${createdAtFrom ? "gte: $createdAtFrom" : ""}
                            ${createdAtTo ? "lte: $createdAtTo" : ""}
                          }`;
  }

  let updatedAtCondition = "";
  if (updatedAtFrom || updatedAtTo) {
    updatedAtCondition = `updatedAt: {
                            ${updatedAtFrom ? "gte: $updatedAtFrom" : ""}
                            ${updatedAtTo ? "lte: $updatedAtTo" : ""}
                          }`;
  }

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams = {};

  if (keywords && name && key) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { name: { containsi: $keywords } }
                            { name: { containsi: $name } }
                            { key: { containsi: $keywords } }
                            { key: { containsi: $key } }
                          ]`;
    searchParams = { keywords, name, key };
  } else if (keywords) {
    graphQLParams = `$keywords: String
                       ${key ? "$key: String" : ""}
                      `;
    searchCondition = `or: [
                            { name: { containsi: $keywords } }
                            { key: { containsi: $keywords } }
                           ${key ? " { key: { containsi: $key } }" : ""}
                          ]`;
    searchParams = { keywords, ...(key && { key }) };
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  } else if (key) {
    graphQLParams = "$key: String";
    searchCondition = "key: { containsi: $key }";
    searchParams = { key };
  }

  const { data, meta } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${isArray(typeOptions) && typeOptions.length > 0 ? "$type: [String]" : ""}
          ${name ? "$name: String" : ""}
          ${displayOrder ? "$displayOrder: Int" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${isExistDataTypeOptions ? "$dataType: [String]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
        ) {
          customFields(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${displayOrder && displayOrder > 0 ? "displayOrder: { eq: $displayOrder }" : ""}
              ${searchCondition}
              ${isArray(typeOptions) && typeOptions.length > 0 ? "type: { in: $type }" : ""}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${isExistDataTypeOptions ? "dataType: { in: $dataType }" : ""}
              ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
              ${createdAtCondition}
              ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
              ${updatedAtCondition}
            }
          ) {
            data {
              id
              attributes {
                type
                displayOrder
                dataType
                name
                key
                min
                max
                isRequired
                validationRegex
                description
                isActive
                createdAt
                createdByUser {
                  data {
                    id
                    attributes {
                      username
                      email
                      detail {
                        data {
                          attributes {
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
                                }
                              }
                            }
                            lastName
                            firstName
                          }
                        }
                      }
                    }
                  }
                }
                updatedAt
                updatedByUser {
                  data {
                    id
                    attributes {
                      username
                      email
                      detail {
                        data {
                          attributes {
                            avatar {
                              data {
                                attributes {
                                  url
                                  previewUrl
                                }
                              }
                            }
                            lastName
                            firstName
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            meta {
              pagination {
                page
                pageSize
                pageCount
                total
              }
            }
          }
        }
      `,
    params: {
      organizationId,
      page,
      pageSize,
      sort: isArray(sort) ? sort : [sort],
      ...(searchParams && { ...searchParams }),
      ...(isArray(typeOptions) && typeOptions.length > 0 && { type: typeOptions }),
      ...(isExistDataTypeOptions && { dataType: dataTypeOptions }),
      ...(name && { name }),
      ...(displayOrder && { displayOrder }),
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
    },
  });

  return { data: data?.customFields, meta };
};

/**
 * Retrieves a customField from the server.
 *
 * @param organizationId - The ID of the organization associated with the CustomField.
 * @param id - The ID of the CustomField to retrieve.
 * @returns A promise that resolves to the requested CustomField if found, or null if not found.
 */
export const getCustomField = async (organizationId: number, id: number): Promise<CustomFieldInfo | undefined> => {
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customFields(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              type
              dataType
              name
              key
              value
              displayOrder
              min
              max
              isRequired
              canViewByDriver
              canEditByDriver
              description
              validationRegex
              isActive
              createdAt
              createdByUser {
                data {
                  id
                }
              }
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });

  return data?.customFields[0];
};

/**
 * Checks if a custom field last updated timestamp matches a provided timestamp.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {number} id - The ID of the custom field to check.
 * @param {Date | string} lastUpdatedAt - The timestamp to compare against the custom field's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the timestamps do not match, otherwise false.
 */
export const checkCustomFieldExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        customFields(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });

  return data?.customFields[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Checks if a custom field with a given name, type, and data type exists within a specific organization.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} name - The name of the custom field to check for existence.
 * @param {string} type - The type of the custom field to check for existence.
 * @param {string} dataType - The data type of the custom field to check for existence.
 * @param {number} excludeId - (Optional) The ID to exclude from the search (useful for updating an existing record).
 * @returns {Promise<boolean>} A promise that resolves to true if a matching custom field is found, otherwise false.
 */
export const checkCustomFieldAvailability = async (
  organizationId: number,
  name: string,
  type: string,
  dataType: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $name: String!, $type: String!, $dataType: String!, $excludeId: ID) {
      customFields(
        filters: {
          id: { ne: $excludeId }
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          dataType: { eq: $dataType }
          type: { eq: $type }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query,
    params: {
      organizationId: Number(organizationId),
      name,
      type,
      dataType,
      ...(excludeId && { excludeId }),
    },
  });

  return (data?.customFields?.length ?? 0) > 0;
};

/**
 * Checks if a custom field with a given key exists within a specific organization.
 *
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} key - The key to check for existence.
 * @param {number} excludeId - (Optional) The ID to exclude from the search (useful for updating an existing record).
 * @returns {Promise<boolean>} A promise that resolves to true if a matching custom field is found, otherwise false.
 */
export const validateCustomFieldKey = async (
  organizationId: number,
  key: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $key: String!, $excludeId: ID) {
      customFields(
        filters: {
          id: { ne: $excludeId }
          organizationId: { eq: $organizationId }
          key: { eq: $key }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query,
    params: {
      organizationId: Number(organizationId),
      key,
      ...(excludeId && { excludeId }),
    },
  });

  return (data?.customFields.length ?? 0) > 0;
};

/**
 * Creates a custom field by making a GraphQL mutation.
 *
 * @param {Object} entity - An object representing the custom field with properties to be created.
 * @returns {Promise<MutationResult<CustomFieldInfo>>} A promise that resolves to the result of the create operation.
 */
export const createCustomField = async (
  entity: Omit<CustomFieldInfo, "id">
): Promise<MutationResult<CustomFieldInfo>> => {
  const { organizationId, name, type, dataType, key, createdById } = entity;

  const typeNameExists = await checkCustomFieldAvailability(organizationId, name, type, dataType);
  if (typeNameExists) {
    return { error: ErrorType.EXISTED, errorField: type };
  }

  const isNameInKeyExists = await validateCustomFieldKey(organizationId, key);
  if (isNameInKeyExists) {
    return { error: ErrorType.EXISTED, errorField: key };
  }

  const { status, data } = await graphQLPost<CustomFieldInfo>({
    query: gql`
      mutation ($data: CustomFieldInput!) {
        createCustomField(data: $data) {
          data {
            id
          }
        }
      }
    `,
    params: {
      data: {
        ...omit(entity, "createdById"),
        createdByUser: createdById,
        updatedByUser: createdById,
        publishedAt: new Date(),
      },
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createCustomField };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a custom field by making a GraphQL mutation.
 *
 * @param {Object} entity - An object representing the custom field with properties to be updated.
 * @param {Date | string} lastUpdatedAt - An optional timestamp to check for exclusivity before updating.
 * @returns {Promise<MutationResult<CustomFieldInfo>>} A promise that resolves to the result of the update operation.
 */
export const updateCustomField = async (
  entity: CustomFieldInfo,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<CustomFieldInfo>> => {
  const { organizationId, id, name, updatedById, type, dataType, key, ...rest } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomFieldExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  // Check if the custom field type name already exists in the organization
  const isNameExists = await checkCustomFieldAvailability(organizationId, name, type, dataType, id);
  if (isNameExists) {
    return { error: ErrorType.EXISTED, errorField: type };
  }

  const isNameInKeyExists = await validateCustomFieldKey(organizationId, key, id);
  if (isNameInKeyExists) {
    return { error: ErrorType.EXISTED, errorField: entity.key };
  }

  const query = gql`
    mutation ($id: ID!, $data: CustomFieldInput!) {
      updateCustomField(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  const { status, data } = await graphQLPost<CustomFieldInfo>({
    query,
    params: {
      id,
      data: {
        ...omit(rest, ["updatedById", "id", "createdByUser", "createdAt", "updatedAt"]),
        updatedByUser: updatedById,
      },
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateCustomField };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes custom Field in the GraphQL API.
 *
 * @param {Object} entity - An object containing custom field properties including organizationId, id, and updatedById.
 * @param {Date | string} lastUpdatedAt - An optional timestamp to check for exclusivity before the update.
 * @returns {Promise<MutationResult<CustomFieldInfo>>} A promise that resolves to the result of the delete operation.
 */
export const deleteCustomField = async (
  entity: Pick<CustomFieldInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<CustomFieldInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkCustomFieldExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<CustomFieldInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateCustomField(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateCustomField };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetch a list of active vehicle options without trailer for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<VehicleInfo[]>} - An array of active vehicle options.
 */
export const getCustomFieldByType = async (params: Partial<CustomFieldInfo>) => {
  const { organizationId, type } = params;
  const isOrderTripType = type === CustomFieldType.ORDER_TRIP;

  const query = gql`
    query ($organizationId: Int!, $type: String, $isOrderTripType: Boolean!) {
      customFields(
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          isActive: { eq: true }
          type: { eq: $type }
        }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            dataType
            type
            key
            name
            description
            displayOrder
            value
            min
            max
            isRequired
            canViewByDriver @include(if: $isOrderTripType)
            canEditByDriver @include(if: $isOrderTripType)
            validationRegex
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query,
    params: { organizationId, ...(type && { type }), isOrderTripType },
  });

  return data?.customFields ?? [];
};

/**
 * Fetch a list of active vehicle options without trailer for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<VehicleInfo[]>} - An array of active vehicle options.
 */
export const customFieldByTypeFetcher = async ([_, params]: [string, Partial<CustomFieldInfo>]) => {
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
      query ($organizationId: Int!, $type: String) {
        customFields(
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            isActive: { eq: true }
            type: { eq: $type }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              dataType
              key
              name
              value
            }
          }
        }
      }
    `,
    params,
  });

  return data?.customFields ?? [];
};

/**
 * Export the salary information of a driver.
 * It sends a POST request to the server with the filter parameters, calculates the driver salaries from the fetched data,
 * and returns the calculated salaries or an error.
 *
 * @param {orgLink: string;  filesUpload: UploadInputValue[];  filesRemove: UploadInputValue[];} params - The request data, containing the filter parameters.
 * @returns {Promise<data: CustomFieldFileValue[]>} A promise that resolves to an object containing the calculated salaries or an error.
 */
export const uploadFieldFileFetcher = async (params: {
  orgLink: string;
  filesUpload: UploadInputValue[];
  filesRemove: UploadInputValue[];
}) => {
  const { orgLink, filesUpload, filesRemove } = params;

  const apiResult: ApiResult = await post<ApiResult>(`/api${orgLink}/customfields/upload`, {
    filesUpload,
    filesRemove,
  });

  return apiResult.data ?? [];
};

/**
 * Retrieves a list of CustomFields from the server based on a list of IDs.
 *
 * @param organizationId - The ID of the organization associated with the CustomFields.
 * @param ids - The list of IDs of the CustomFields to retrieve.
 * @returns A promise that resolves to an array of the requested CustomFields if found, or an empty array if none are found.
 */
export const getCustomFieldsByIds = async (organizationId: number, ids: number[]): Promise<CustomFieldInfo[]> => {
  const { data } = await graphQLPost<CustomFieldInfo[]>({
    query: gql`
      query ($organizationId: Int!, $ids: [ID!]!) {
        customFields(
          filters: { organizationId: { eq: $organizationId }, id: { in: $ids }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              type
              dataType
              name
              key
              value
              displayOrder
              min
              max
              isRequired
              description
              validationRegex
              isActive
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      ids,
    },
  });

  return data?.customFields || [];
};
