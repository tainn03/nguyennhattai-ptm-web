import { Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey, ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { DriverInputForm } from "@/forms/driver";
import { AnyObject } from "@/types";
import { IndividualDriverSalaryParams, MobileDriverSalaries } from "@/types/report";
import { DriverInfo } from "@/types/strapi";
import { convertEndOfDayString, convertStartOfDayString, formatDate } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { transformObject } from "@/utils/object";
import { trim } from "@/utils/string";

/**
 * Creates a new driver.
 *
 * @param jwt - The JWT of the user making the request.
 * @param entity - The driver to create.
 * @returns The ID of the newly created driver.
 */
export const createDriver = async (jwt: string, entity: DriverInputForm): Promise<DriverInfo> => {
  const {
    dateOfBirth,
    addressInformationId,
    email,
    idIssueDate,
    licenseTypeId,
    licenseIssueDate,
    licenseExpiryDate,
    contractStartDate,
    contractEndDate,
    basicSalary,
    bankAccountId,
    userId,
    meta,
    ...otherEntityProps
  } = trim(entity);

  delete otherEntityProps.id;

  const query = gql`
    mutation (
      $organizationId: Int!
      $firstName: String!
      $lastName: String!
      $dateOfBirth: Date
      $gender: ENUM_DRIVER_GENDER!
      $idNumber: String
      $idIssueDate: Date
      $idIssuedBy: String
      $email: String
      $phoneNumber: String
      $addressInformationId: ID
      $licenseTypeId: ID
      $licenseNumber: String
      $licenseIssueDate: Date
      $licenseExpiryDate: Date
      $licenseFrontImageId: ID
      $licenseBackImageId: ID
      $experienceYears: Int
      $basicSalary: Float
      $bankAccountId: ID
      $contractType: ENUM_DRIVER_CONTRACTTYPE
      $contractStartDate: Date
      $contractEndDate: Date
      $contractDocumentIds: [ID]
      $description: String
      $isActive: Boolean
      $isOwnedBySubcontractor: Boolean
      $userId: ID
      $unionDues: Float
      $securityDeposit: Float
      $createdById: ID
      $publishedAt: DateTime
      $meta: JSON
    ) {
      createDriver(
        data: {
          organizationId: $organizationId
          firstName: $firstName
          lastName: $lastName
          dateOfBirth: $dateOfBirth
          gender: $gender
          idNumber: $idNumber
          idIssueDate: $idIssueDate
          idIssuedBy: $idIssuedBy
          email: $email
          phoneNumber: $phoneNumber
          address: $addressInformationId
          licenseType: $licenseTypeId
          licenseNumber: $licenseNumber
          licenseIssueDate: $licenseIssueDate
          licenseExpiryDate: $licenseExpiryDate
          licenseFrontImage: $licenseFrontImageId
          licenseBackImage: $licenseBackImageId
          experienceYears: $experienceYears
          basicSalary: $basicSalary
          bankAccount: $bankAccountId
          contractType: $contractType
          contractStartDate: $contractStartDate
          contractEndDate: $contractEndDate
          contractDocuments: $contractDocumentIds
          description: $description
          isActive: $isActive
          isOwnedBySubcontractor: $isOwnedBySubcontractor
          user: $userId
          unionDues: $unionDues
          securityDeposit: $securityDeposit
          createdByUser: $createdById
          updatedByUser: $createdById
          publishedAt: $publishedAt
          meta: $meta
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<DriverInfo>(jwt, query, {
    ...otherEntityProps,
    addressInformationId: addressInformationId ? Number(addressInformationId) : null,
    email: email || null,
    dateOfBirth: dateOfBirth || null,
    idIssueDate: idIssueDate || null,
    licenseTypeId: licenseTypeId ? Number(licenseTypeId) : null,
    licenseIssueDate: licenseIssueDate || null,
    licenseExpiryDate: licenseExpiryDate || null,
    contractStartDate: contractStartDate || null,
    contractEndDate: contractEndDate || null,
    basicSalary: basicSalary ? Number(basicSalary) : null,
    bankAccountId: bankAccountId ? Number(bankAccountId) : null,
    userId: userId ? Number(userId) : null,
    publishedAt: new Date(),
    meta: JSON.stringify(meta),
  });

  return data.createDriver;
};

/**
 * Checks if a driver has been updated since a specified date.
 *
 * @param jwt - The JWT of the user making the request.
 * @param organizationId - The ID of the organization to which the driver belongs.
 * @param id - The ID of the driver to check.
 * @param lastUpdatedAt - The date to compare against the driver's last updated timestamp.
 * @returns A promise that resolves to true if the driver has been updated, otherwise false.
 */
export const checkDriverExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      drivers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DriverInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data.drivers[0].updatedAt !== lastUpdatedAt;
};

/**
 * Updates a driver's attributes within the organization.
 *
 * @param jwt - The JWT of the user making the request.
 * @param entity - The driver entity to update.
 * @returns A promise that resolves to the updated driver or an error type.
 */
export const updateDriver = async (jwt: string, entity: DriverInputForm): Promise<DriverInfo> => {
  const {
    dateOfBirth,
    email,
    idIssueDate,
    licenseTypeId,
    licenseIssueDate,
    licenseExpiryDate,
    contractStartDate,
    contractEndDate,
    basicSalary,
    userId,
    meta,
    ...otherEntityProps
  } = trim(entity);

  const query = gql`
    mutation (
      $id: ID!
      $firstName: String!
      $lastName: String!
      $dateOfBirth: Date
      $gender: ENUM_DRIVER_GENDER!
      $idNumber: String
      $idIssueDate: Date
      $idIssuedBy: String
      $email: String
      $phoneNumber: String
      $licenseTypeId: ID
      $licenseNumber: String
      $licenseIssueDate: Date
      $licenseExpiryDate: Date
      $licenseFrontImageId: ID
      $licenseBackImageId: ID
      $experienceYears: Int
      $basicSalary: Float
      $contractType: ENUM_DRIVER_CONTRACTTYPE
      $contractStartDate: Date
      $contractEndDate: Date
      $contractDocumentIds: [ID]
      $description: String
      $isActive: Boolean
      $userId: ID
      $unionDues: Float
      $securityDeposit: Float
      $isOwnedBySubcontractor: Boolean
      $updatedById: ID
      $meta: JSON
    ) {
      updateDriver(
        id: $id
        data: {
          firstName: $firstName
          lastName: $lastName
          dateOfBirth: $dateOfBirth
          gender: $gender
          idNumber: $idNumber
          idIssueDate: $idIssueDate
          idIssuedBy: $idIssuedBy
          email: $email
          phoneNumber: $phoneNumber
          licenseType: $licenseTypeId
          licenseNumber: $licenseNumber
          licenseIssueDate: $licenseIssueDate
          licenseExpiryDate: $licenseExpiryDate
          licenseFrontImage: $licenseFrontImageId
          licenseBackImage: $licenseBackImageId
          experienceYears: $experienceYears
          basicSalary: $basicSalary
          contractType: $contractType
          contractStartDate: $contractStartDate
          contractEndDate: $contractEndDate
          contractDocuments: $contractDocumentIds
          description: $description
          isActive: $isActive
          user: $userId
          unionDues: $unionDues
          isOwnedBySubcontractor: $isOwnedBySubcontractor
          securityDeposit: $securityDeposit
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

  const { data } = await fetcher<DriverInfo>(jwt, query, {
    ...otherEntityProps,
    email: email || null,
    dateOfBirth: dateOfBirth || null,
    idIssueDate: idIssueDate || null,
    licenseTypeId: licenseTypeId ? Number(licenseTypeId) : null,
    licenseIssueDate: licenseIssueDate || null,
    licenseExpiryDate: licenseExpiryDate || null,
    contractStartDate: contractStartDate || null,
    contractEndDate: contractEndDate || null,
    basicSalary: basicSalary ? Number(basicSalary) : null,
    userId: userId || null,
    meta: JSON.stringify(meta),
  });

  return data.updateDriver;
};

/**
 * Checks if a driver with the given ID number exists in the organization.
 * @param jwt The JSON Web Token for authentication
 * @param organizationId The ID of the organization
 * @param idNumber The ID number of the driver to check
 * @param excludeId Optional. The ID of a driver to exclude from the check
 * @returns A boolean indicating whether a driver with the given ID number exists
 */
export const checkDriverIdNumberExists = async (
  jwt: string,
  organizationId: number,
  idNumber: string,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query (
      $organizationId: Int!
      $idNumber: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      drivers(
        filters: {
          organizationId: { eq: $organizationId }
          idNumber: { eq: $idNumber }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<DriverInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    idNumber,
    organizationId,
  });

  return (data?.drivers.length ?? 0) > 0;
};

/**
 * Fetches driver salary based on the provided parameters.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching driver salary.
 * @returns {Promise<DetailedDriverSalaryInfo>}
 * Returns a promise that resolves to an object containing the driver salary.
 */
export const getDriverSalaryById = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, startDate, endDate, driverReportIds, driverId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
      break;
  }

  const query = Prisma.sql`
WITH waiting_for_pickup_order AS (
  SELECT display_order
  FROM driver_reports
  WHERE type = 'WAITING_FOR_PICKUP'
    AND organization_id = ${organizationId}
),
latest_statuses AS (
  SELECT
    ot.id AS order_trip_id,
    dr.id AS driver_report_id,
    dr.display_order,
    ots.created_at,
    ot.pickup_date,
    ot.delivery_date,
    ot.bill_of_lading,
    ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
  FROM
    order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
    ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
    ON otstl.order_trip_id = ot.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
driver_filter_trips AS (
  SELECT
    ls.order_trip_id,
    COALESCE(
      CASE
        WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup_order) THEN ls.pickup_date
        WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup_order) THEN ls.created_at
        ELSE (
          SELECT created_at
          FROM order_trip_statuses ots2
          JOIN order_trip_statuses_trip_links otstl2
            ON ots2.id = otstl2.order_trip_status_id
          WHERE otstl2.order_trip_id = ls.order_trip_id
            AND ots2.type = 'WAITING_FOR_PICKUP'
          ORDER BY ots2.created_at DESC
          LIMIT 1
        )
      END,
      ls.pickup_date
    ) AS start_date
  FROM
    latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
    AND ls.bill_of_lading IS NOT NULL
    AND ls.bill_of_lading <> ''
),
filtered_trips AS (
  SELECT * FROM driver_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
driver_salaries AS (
  SELECT
    otdl.driver_id,
    SUM(tde.amount) AS trip_salary_total
  FROM
    trip_driver_expenses tde
  JOIN trip_driver_expenses_trip_links tdetl
    ON tde.id = tdetl.trip_driver_expense_id
  JOIN order_trips_driver_links otdl
    ON tdetl.order_trip_id = otdl.order_trip_id
  WHERE
    tde.organization_id = ${organizationId}
    AND tdetl.order_trip_id IN (SELECT order_trip_id FROM filtered_trips)
  GROUP BY
    otdl.driver_id
)
SELECT
  d.id,
  COUNT(dft.order_trip_id) AS total_trip,
  COALESCE(ds.trip_salary_total, 0) AS trip_salary_total
FROM
  drivers d
LEFT JOIN order_trips_driver_links otdl
  ON d.id = otdl.driver_id
LEFT JOIN driver_filter_trips dft
  ON otdl.order_trip_id = dft.order_trip_id
LEFT JOIN driver_salaries ds
  ON d.id = ds.driver_id
WHERE
  d.organization_id = ${organizationId}
  AND d.is_active = true
  AND d.published_at IS NOT NULL
  AND d.id = ${driverId}
GROUP BY
  d.id,
  ds.trip_salary_total;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data ? transformObject<MobileDriverSalaries>(data) : ([] as MobileDriverSalaries[]);
  return transformedData.length > 0
    ? {
        ...transformedData[0],
        startDate,
        endDate,
      }
    : null;
};

/**
 * Deprecated function for getting driver salary by ID.
 * @deprecated Use getDriverSalaryById instead.
 * @param params - The parameters for fetching driver salary.
 * @returns A promise that resolves to an object containing the driver salary.
 */
export const deprecatedGetDriverSalaryById = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, driverReportIds, driverId } = params;
  const startDate = convertStartOfDayString(params.startDate);
  const endDate = convertEndOfDayString(params.endDate);

  const query = Prisma.sql`
WITH latest_statuses AS (
  SELECT
    ot.id AS order_trip_id,
    dr.id AS driver_report_id,
    ot.bill_of_lading,
    ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
  FROM
    order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
    ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
    ON otstl.order_trip_id = ot.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ots.organization_id = ${organizationId}
    AND ot.organization_id = ${organizationId}
    AND dr.organization_id = ${organizationId}
    AND ot.published_at IS NOT NULL
    AND ots.created_at >= ${startDate} AND ots.created_at <= ${endDate}
  ),
driver_filter_trips AS (
  SELECT
    ls.order_trip_id
  FROM
    latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
    AND ls.bill_of_lading IS NOT NULL
    AND ls.bill_of_lading <> ''
),
driver_salaries AS (
  SELECT
    otdl.driver_id,
    SUM(tde.amount) AS trip_salary_total
  FROM
    trip_driver_expenses tde
  JOIN trip_driver_expenses_trip_links tdetl
    ON tde.id = tdetl.trip_driver_expense_id
  JOIN order_trips_driver_links otdl
    ON tdetl.order_trip_id = otdl.order_trip_id
  WHERE
    tde.organization_id = ${organizationId}
    AND tdetl.order_trip_id IN (SELECT order_trip_id FROM driver_filter_trips)
  GROUP BY
    otdl.driver_id
  )
SELECT
  d.id,
  COUNT(dft.order_trip_id) AS total_trip,
  COALESCE(ds.trip_salary_total, 0) AS trip_salary_total
FROM
  drivers d
LEFT JOIN order_trips_driver_links otdl
  ON d.id = otdl.driver_id
LEFT JOIN driver_filter_trips dft
  ON otdl.order_trip_id = dft.order_trip_id
LEFT JOIN driver_salaries ds
  ON d.id = ds.driver_id
WHERE
  d.organization_id = ${organizationId}
  AND d.is_active = true
  AND d.published_at IS NOT NULL
  AND d.id = ${driverId}
GROUP BY
  d.id,
  ds.trip_salary_total;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data ? transformObject<MobileDriverSalaries>(data) : ([] as MobileDriverSalaries[]);
  return transformedData.length > 0
    ? {
        ...transformedData[0],
        month: formatDate(startDate, "MM"),
        year: formatDate(startDate, "YYYY"),
      }
    : null;
};
