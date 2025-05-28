import { HttpStatusCode } from "axios";
import { format } from "date-fns";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { DriverInputForm, DriverUpdateInputForm } from "@/forms/driver";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { DriverInfo, OrganizationMemberInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { endOfDay, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches driver information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<DriverInfo>} params - Parameters for filtering drivers.
 * @returns {Promise<DriverInfo | null>} A promise that resolves to the fetched driver or null if not found.
 */
export const driverFetcher = async ([_, params]: [string, Partial<DriverInfo>]): Promise<DriverInfo | undefined> => {
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        drivers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              lastName
              firstName
              dateOfBirth
              gender
              idNumber
              idIssueDate
              idIssuedBy
              email
              phoneNumber
              isOwnedBySubcontractor
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
                    postalCode
                    addressLine1
                  }
                }
              }
              licenseNumber
              licenseIssueDate
              licenseExpiryDate
              licenseFrontImage {
                data {
                  id
                  attributes {
                    url
                    previewUrl
                  }
                }
              }
              licenseBackImage {
                data {
                  id
                  attributes {
                    url
                    previewUrl
                  }
                }
              }
              licenseType {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              experienceYears
              basicSalary
              unionDues
              securityDeposit
              contractType
              contractStartDate
              contractEndDate
              contractDocuments {
                data {
                  id
                  attributes {
                    name
                    url
                    previewUrl
                  }
                }
              }
              bankAccount {
                data {
                  id
                  attributes {
                    accountNumber
                    holderName
                    bankName
                    bankBranch
                    description
                  }
                }
              }
              user {
                data {
                  id
                  attributes {
                    username
                    phoneNumber
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
                  }
                }
              }
              description
              isActive
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    idNumber
                    trailer {
                      data {
                        id
                        attributes {
                          trailerNumber
                        }
                      }
                    }
                  }
                }
              }
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
              meta
            }
          }
        }
      }
    `,
    params,
  });

  return data?.drivers[0];
};

/**
 * Fetch drivers from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched drivers and pagination meta information.
 */
export const driversFetcher = async ([_, params]: [string, FilterRequest<DriverInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    name,
    phoneNumber,
    licenseType,
    licenseNumber,
    isActiveOptions,
    vehicleNumber,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
  } = trim(params);

  const isFindStatus = isArray(isActiveOptions) && isActiveOptions.length > 0;
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

  const vehicleQuery = `vehicle: {
    or: [
      { vehicleNumber: { containsi: $vehicleNumber } }
      { idNumber: { containsi: $vehicleNumber } }
    ]
  }`;

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
      { firstName: { containsi: $keywords } }
      { lastName: { containsi: $keywords } }
      { firstName: { containsi: $name } }
      { lastName: { containsi: $name } }
    ]`;
    searchParams = { keywords, name };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
      { firstName: { containsi: $keywords } }
      { lastName: { containsi: $keywords } }
    ]`;
    searchParams = { keywords };
  } else if (name) {
    searchCondition = `or: [
      { firstName: { containsi: $name } }
      { lastName: { containsi: $name } }
    ]`;
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query (
        $page: Int
        $pageSize: Int
        $organizationId: Int!
        $sort: [String]
        ${graphQLParams}
        ${name ? " $name: String" : ""}
        ${phoneNumber ? "$phoneNumber: String" : ""}
        ${licenseType ? "$licenseType: String" : ""}
        ${licenseNumber ? "$licenseNumber: String" : ""}
        ${isFindStatus ? "$isActive: [Boolean]" : ""}
        ${vehicleNumber ? "$vehicleNumber: String" : ""}
        ${createdByUser ? "$createdByUser: String" : ""}
        ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
        ${createdAtTo ? "$createdAtTo: DateTime" : ""}
        ${updatedByUser ? "$updatedByUser: String" : ""}
        ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
        ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
      ) {
        drivers (
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            ${searchCondition}
            ${phoneNumber ? "phoneNumber: { containsi: $phoneNumber }" : ""}
            ${licenseType ? "licenseType: { name: { containsi: $licenseType } }" : ""}
            ${licenseNumber ? "licenseNumber: { containsi: $licenseNumber }" : ""}
            ${isFindStatus ? "isActive: { in: $isActive }" : ""}
            ${vehicleNumber ? vehicleQuery : ""}
            ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
            ${createdAtCondition}
            ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
            ${updatedAtCondition}
          }
        ) {
          data {
            id
            attributes {
              lastName
              firstName
              phoneNumber
              isActive
              licenseNumber
              licenseType {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    idNumber
                  }
                }
              }
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
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
      ...(phoneNumber && { phoneNumber }),
      ...(licenseType && { licenseType }),
      ...(licenseNumber && { licenseNumber }),
      ...(isFindStatus && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(vehicleNumber && { vehicleNumber }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
    },
  });

  return { data: data?.drivers ?? [], meta };
};

/**
 * Retrieves a driver from the server.
 *
 * @param organizationId - The ID of the organization associated with the driver.
 * @param id - The ID of the driver to retrieve.
 * @returns A promise that resolves to the requested driver if found, or undefined if not found.
 */
export const getDriver = async (organizationId: number, id: number): Promise<DriverInfo | undefined> => {
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        drivers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              lastName
              firstName
              dateOfBirth
              gender
              idNumber
              idIssueDate
              idIssuedBy
              experienceYears
              description
              isActive
              email
              phoneNumber
              isOwnedBySubcontractor
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
                  }
                }
              }
              licenseType {
                data {
                  id
                }
              }
              licenseNumber
              licenseIssueDate
              licenseExpiryDate
              licenseFrontImage {
                data {
                  id
                  attributes {
                    url
                    name
                  }
                }
              }
              licenseBackImage {
                data {
                  id
                  attributes {
                    url
                    name
                  }
                }
              }
              contractType
              basicSalary
              unionDues
              securityDeposit
              contractStartDate
              contractEndDate
              contractDocuments {
                data {
                  id
                  attributes {
                    url
                    name
                  }
                }
              }
              bankAccount {
                data {
                  id
                  attributes {
                    accountNumber
                    holderName
                    bankName
                    bankBranch
                  }
                }
              }
              user {
                data {
                  id
                  attributes {
                    username
                    email
                  }
                }
              }
              createdByUser {
                data {
                  id
                }
              }
              updatedAt
              meta
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

  return data?.drivers[0];
};

/**
 * Checks if a driver has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the driver belongs.
 * @param {number} id - The ID of the driver to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the driver's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the driver has been updated, otherwise false.
 */
export const checkDriverExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        drivers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.drivers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Deletes an existing driver.
 *
 * @param {Pick<DriverInfo, "organizationId" | "id" | "updatedById">} entity - The driver entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<DriverInfo | ErrorType>} A promise that resolves to the deleted driver or an error type.
 */
export const deleteDriver = async (
  entity: Pick<DriverInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<DriverInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<DriverInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateDriver(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateDriver };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches driver options based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial driver object containing the filter parameters.
 * @returns Array of driver data matching the specified parameters.
 */
export const driverOptionsFetcher = async ([_, params]: [string, FilterRequest<DriverInfo>]) => {
  const query = gql`
    query (
      $organizationId: Int
      $isFetchLicenseType: Boolean!
      $isFetchVehicle: Boolean!
      $isFetchDetail: Boolean!
      $isFetchPhoneNumber: Boolean!
      $isFetchEmail: Boolean!
    ) {
      drivers(
        filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            firstName
            lastName
            isOwnedBySubcontractor
            phoneNumber @include(if: $isFetchPhoneNumber)
            email @include(if: $isFetchEmail)
            licenseType @include(if: $isFetchLicenseType) {
              data {
                id
                attributes {
                  name
                }
              }
            }
            vehicle @include(if: $isFetchVehicle) {
              data {
                id
                attributes {
                  vehicleNumber
                }
              }
            }
            user {
              data {
                id
                attributes {
                  detail @include(if: $isFetchDetail) {
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
        }
      }
    }
  `;

  const { data } = await graphQLPost<DriverInfo[]>({
    query,
    params: {
      organizationId: params.organizationId,
      isFetchLicenseType: params.isFetchLicenseType || false,
      isFetchVehicle: params.isFetchVehicle || true,
      isFetchDetail: params.isFetchDetail || false,
      isFetchPhoneNumber: params.isFetchPhoneNumber || false,
      isFetchEmail: params.isFetchEmail || false,
    },
  });

  return data?.drivers ?? [];
};

/**
 * Retrieves the driver ID associated with an organization member.
 *
 * @param {Pick<OrganizationMemberInfo, "organization" | "member">} entity - The organization member information, containing the organization and member details.
 * @returns {Promise<DriverInfo | undefined>} - A Promise that resolves to the associated driver information, if found.
 */
export const getDriverIdByOrganizationMember = async (
  entity: Pick<OrganizationMemberInfo, "organization" | "member">
): Promise<DriverInfo | undefined> => {
  const { organization, member } = entity;
  const query = gql`
    query ($organizationId: Int!, $userId: ID!) {
      drivers(
        filters: { organizationId: { eq: $organizationId }, user: { id: { eq: $userId } }, publishedAt: { ne: null } }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await graphQLPost<DriverInfo[]>({
    query,
    params: {
      organizationId: organization.id,
      userId: member.id,
    },
  });

  return data?.drivers[0];
};

/**
 * Retrieves information about drivers based on their IDs and organization.
 *
 * @param {number} organizationId - The ID of the organization to which the drivers belong.
 * @param {number[]} ids - An array of driver IDs.
 * @returns {Promise<DriverInfo[] | undefined>} - A promise that resolves to an array of DriverInfo or undefined.
 */
export const getDriversByIds = async (organizationId: number, ids: number[]): Promise<DriverInfo[] | undefined> => {
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!, $ids: [ID]) {
        drivers(
          pagination: { limit: -1 }
          filters: { organizationId: { eq: $organizationId }, user: { id: { in: $ids } }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              firstName
              lastName
              user {
                data {
                  id
                }
              }
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
  return data?.drivers;
};

/**
 * Retrieves information about drivers based on their IDs and organization.
 *
 * @param {number} organizationId - The ID of the organization to which the drivers belong.
 * @param {number[]} ids - An array of driver IDs.
 * @returns {Promise<DriverInfo[] | undefined>} - A promise that resolves to an array of DriverInfo or undefined.
 */
export const getDriverByOrganizationMember = async ([_, params]: [
  string,
  Pick<OrganizationMemberInfo, "member" | "organization">,
]): Promise<DriverInfo | undefined> => {
  const { member, organization } = params;
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID) {
        drivers(
          filters: { organizationId: { eq: $organizationId }, user: { id: { eq: $id } }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              firstName
              lastName
              idNumber
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: {
      organizationId: organization.id,
      id: member.id,
    },
  });

  return data?.drivers[0];
};

/**
 * Fetches a list of active drivers for a given organization.
 * @param params - An array where the first element is ignored and the second element is an object containing the organizationId.
 * @returns A promise that resolves to an array of driver objects, or an empty array if no drivers are found.
 */
export const driverBasicInfoListFetcher = async ([_, params]: [string, FilterRequest<DriverInfo>]) => {
  const { organizationId, driverId, page, pageSize } = params;

  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      ${driverId ? "$id: ID!" : ""}
      $organizationId: Int) {
      drivers(
        filters: {
          ${driverId ? "id: { eq: $id }" : ""}
          organizationId: { eq: $organizationId }
          isActive: { eq: true }
          publishedAt: { ne: null }
        }
        pagination: { page: $page, pageSize: $pageSize }
      ) {
        data {
          id
          attributes {
            firstName
            lastName
            phoneNumber
            vehicle {
              data {
                id
                attributes {
                  vehicleNumber
                  trailer {
                    data {
                      id
                      attributes {
                        trailerNumber
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
  `;

  const { data, meta } = await graphQLPost<DriverInfo[]>({
    query,
    params: {
      page,
      pageSize,
      organizationId,
      ...(driverId && { id: driverId }),
    },
  });

  return { data: data?.drivers ?? [], meta };
};

/**
 * Retrieves information about drivers within the organization.
 *
 * @param {number} organizationId - The ID of the organization to which the drivers belong.
 * @returns {Promise<DriverInfo[]>} - A promise that resolves to an array of DriverInfo.
 */
export const getDriversByOrganizationIds = async (
  organizationId: number,
  driverIds?: number[],
  isFetchDetail?: boolean
): Promise<DriverInfo[]> => {
  const detailQuery = `
  bankAccount {
    data {
      id
      attributes {
        accountNumber
        bankName
        bankBranch
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
              name
            }
          }
        }
        city {
          data {
            id
            attributes {
              name
            }
          }
        }
        district {
          data {
            id
            attributes {
              name
            }
          }
        }
        ward {
          data {
            id
            attributes {
              name
            }
          }
        }
        addressLine1
      }
    }
  }`;

  const query = gql`
    query (
      ${driverIds ? "$driverIds: [ID]!" : ""}
      $organizationId: Int!
    ) {
      drivers(
        filters: {
            ${driverIds ? "id: { in: $driverIds }" : ""}
            organizationId: { eq: $organizationId },
            isActive: { eq: true },
            publishedAt: { ne: null }
          }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            firstName
            lastName
            phoneNumber
            email
            basicSalary
            unionDues
            securityDeposit
            ${isFetchDetail ? detailQuery : ""}
            vehicle {
              data {
                id
                attributes {
                  vehicleNumber
                  trailer {
                    data {
                      id
                      attributes {
                        trailerNumber
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

  const { data } = await graphQLPost<DriverInfo[]>({
    query,
    params: {
      organizationId,
      ...(driverIds && { driverIds }),
    },
  });

  return data?.drivers ?? [];
};

/**
 * Fetches driver options based on the specified parameters use for screen order monitoring.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial driver object containing the filter parameters.
 * @returns Array of driver data matching the specified parameters.
 */
export const driverOptionsOrderMonitoringFetcher = async ([_, params]: [string, Partial<DriverInfo>]) => {
  const query = gql`
    query ($organizationId: Int) {
      drivers(
        filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            firstName
            lastName
            vehicle {
              data {
                id
                attributes {
                  vehicleNumber
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<DriverInfo[]>({
    query,
    params,
  });

  return data?.drivers ?? [];
};

/**
 * Creates a new driver via API.
 *
 * @param {string} orgLink - The organization link for the driver.
 * @param {DriverInputForm} requestData - The data of the driver being sent.
 * @returns {Promise<ApiResult<number>>} - The result returned from the API after creating the driver.
 */
export const createDriver = async (orgLink: string, requestData: DriverInputForm): Promise<ApiResult<number>> => {
  const { dateOfBirth, idIssueDate, licenseIssueDate, licenseExpiryDate, contractStartDate, contractEndDate } =
    requestData;

  const result = await post<ApiResult<number>>(`/api${orgLink}/drivers/new`, {
    ...requestData,
    ...(dateOfBirth && { dateOfBirth: format(dateOfBirth, "yyyy-MM-dd") }),
    ...(idIssueDate && { idIssueDate: format(idIssueDate, "yyyy-MM-dd") }),
    ...(licenseIssueDate && { licenseIssueDate: format(licenseIssueDate, "yyyy-MM-dd") }),
    ...(licenseExpiryDate && { licenseExpiryDate: format(licenseExpiryDate, "yyyy-MM-dd") }),
    ...(contractStartDate && { contractStartDate: format(contractStartDate, "yyyy-MM-dd") }),
    ...(contractEndDate && { contractEndDate: format(contractEndDate, "yyyy-MM-dd") }),
  });

  return result;
};

/**
 * Updates an existing driver via API.
 *
 * @param {string} orgLink - The organization link for the driver.
 * @param {DriverUpdateInputForm} requestData - The updated data of the driver being sent.
 * @param {string | null | undefined} encryptedId - (Optional) The encrypted ID of the driver to be updated.
 * @returns {Promise<ApiResult<number>>} - The result returned from the API after updating the driver.
 */
export const updateDriver = async (
  orgLink: string,
  requestData: DriverUpdateInputForm,
  encryptedId?: string | null
): Promise<ApiResult<number>> => {
  const { dateOfBirth, idIssueDate, licenseIssueDate, licenseExpiryDate, contractStartDate, contractEndDate } =
    requestData;

  const result = await put<ApiResult<number>>(`/api${orgLink}/drivers/${encryptedId}/edit`, {
    ...requestData,
    ...(dateOfBirth && { dateOfBirth: format(dateOfBirth, "yyyy-MM-dd") }),
    ...(idIssueDate && { idIssueDate: format(idIssueDate, "yyyy-MM-dd") }),
    ...(licenseIssueDate && { licenseIssueDate: format(licenseIssueDate, "yyyy-MM-dd") }),
    ...(licenseExpiryDate && { licenseExpiryDate: format(licenseExpiryDate, "yyyy-MM-dd") }),
    ...(contractStartDate && { contractStartDate: format(contractStartDate, "yyyy-MM-dd") }),
    ...(contractEndDate && { contractEndDate: format(contractEndDate, "yyyy-MM-dd") }),
  });

  return result;
};

/**
 * Retrieves drivers owned by subcontractors from the server.
 *
 * @param organizationId - The ID of the organization associated with the drivers.
 * @returns A promise that resolves to an array of DriverInfo objects if found, or undefined if not found.
 */
export const getDriverIsOwnedBySubcontractor = async (organizationId: number): Promise<DriverInfo[] | []> => {
  const { data } = await graphQLPost<DriverInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        drivers(
          filters: {
            organizationId: { eq: $organizationId }
            isOwnedBySubcontractor: { eq: true }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      organizationId,
    },
  });

  return data?.drivers ?? [];
};
