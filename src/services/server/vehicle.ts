"use server";

import { Prisma, VehicleFuelType, VehicleOwnerType } from "@prisma/client";
import { gql } from "graphql-request";

import { prisma } from "@/configs/prisma";
import { VehicleInfoUpdateForm, VehicleInputForm } from "@/forms/vehicle";
import { AnyObject } from "@/types";
import { OrganizationSettingInfo, VehicleInfo } from "@/types/strapi";
import {
  DetailLatestVehicleLocationParams,
  DetailLatestVehicleLocationResponse,
  LatestVehicleLocationParams,
  LatestVehicleLocationResponse,
  VehiclesByStatusResponse,
} from "@/types/vehicle";
import { addDays, formatGraphQLDate } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { transformObject } from "@/utils/object";
import { trim } from "@/utils/string";

/**
 * Check if vehicle data is still up to date based on organization ID and last update time.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - Identifier for the organization.
 * @param {number} id - Identifier for the specific vehicle.
 * @param {Date | string} lastUpdatedAt - Date or string representing the last update time of the vehicle data.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the data has changed, `false` otherwise.
 */
export const checkVehiclesExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      vehicles(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleInfo[]>(jwt, query, {
    organizationId,
    id,
  });

  return data?.vehicles[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Check if a vehicle with the specified vehicle number exists within an organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {string} vehicleNumber - The vehicle number to check for existence.
 * @param {number} organizationId - Identifier for the organization.
 * @param {number | undefined} excludeId - (Optional) Identifier of a vehicle to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if a matching vehicle is found, `false` otherwise.
 */
export const checkVehicleNumberExists = async (
  jwt: string,
  vehicleNumber: string,
  organizationId: number,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $vehicleNumber: String!, ${excludeId ? "$excludeId: ID" : ""}) {
      vehicles(filters: { vehicleNumber: { eq: $vehicleNumber }, publishedAt: { ne: null }, organizationId: { eq: $organizationId }, ${
        excludeId ? "id: { ne: $excludeId }" : ""
      }  }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    vehicleNumber,
    organizationId,
  });

  return data?.vehicles.length > 0;
};

/**
 * Check if a vehicle with the specified ID number exists within an organization.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {string} idNumber - The ID number to check for existence.
 * @param {number} organizationId - Identifier for the organization.
 * @param {number | undefined} excludeId - (Optional) Identifier of a vehicle to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if a matching vehicle is found, `false` otherwise.
 */
export const checkIdNumberExists = async (
  jwt: string,
  idNumber: string,
  organizationId: number,
  excludeId?: number
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $idNumber: String!,  ${excludeId ? "$excludeId: ID" : ""}) {
      vehicles(filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null }, idNumber: { eq: $idNumber }, ${
        excludeId ? "id: { ne: $excludeId }" : ""
      } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleInfo[]>(jwt, query, {
    ...(excludeId && { excludeId }),
    idNumber,
    organizationId,
  });

  return data?.vehicles.length > 0;
};

/**
 * Create a new vehicle record.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {VehicleInputForm} entity - The vehicle information to be created.
 * @returns {Promise<VehicleInfo | undefined>} A promise that resolves to the newly created vehicle information or `undefined` if there was an error.
 */
export const createVehicle = async (jwt: string, entity: VehicleInputForm): Promise<VehicleInfo | undefined> => {
  const {
    ownerType,
    createdById,
    organizationId,
    subcontractorId,
    yearOfManufacture,
    typeId,
    driverId,
    trailerId,
    fuelType,
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
    meta,
    ...otherEntityProps
  } = trim(entity);
  const query = gql`
    mutation (
      $ownerType: ENUM_VEHICLE_OWNERTYPE
      $organizationId: Int
      $subcontractorId: Int
      $model: String
      $type: ID
      $vehicleNumber: String!
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
      $fuelType: ENUM_VEHICLE_FUELTYPE
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
      $driver: ID
      $trailer: ID
      $publishedAt: DateTime
      $createdById: ID
      $fuelConsumption: Float
      $meta: JSON
    ) {
      createVehicle(
        data: {
          ownerType: $ownerType
          organizationId: $organizationId
          subcontractorId: $subcontractorId
          model: $model
          type: $type
          vehicleNumber: $vehicleNumber
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
          fuelType: $fuelType
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
          driver: $driver
          trailer: $trailer
          publishedAt: $publishedAt
          createdByUser: $createdById
          updatedByUser: $createdById
          fuelConsumption: $fuelConsumption
          meta: $meta
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleInfo>(jwt, query, {
    ...otherEntityProps,
    ownerType: ownerType as VehicleOwnerType,
    organizationId: Number(organizationId),
    subcontractorId: ownerType === VehicleOwnerType.SUBCONTRACTOR ? Number(subcontractorId) : null,
    yearOfManufacture: Number(yearOfManufacture),
    type: typeId,
    driver: driverId,
    trailer: trailerId,
    fuelType: fuelType as VehicleFuelType,
    startUsageDate: startUsageDate || null,
    registrationDate: registrationDate || null,
    registrationExpirationDate: registrationExpirationDate || null,
    technicalSafetyRegistrationDate: technicalSafetyRegistrationDate || null,
    technicalSafetyExpirationDate: technicalSafetyExpirationDate || null,
    liabilityInsuranceRegistrationDate: liabilityInsuranceRegistrationDate || null,
    liabilityInsuranceExpirationDate: liabilityInsuranceExpirationDate || null,
    images: idImages,
    registrationCertificate: registrationCertificate ? registrationCertificate[0].id : null,
    technicalSafetyCertificate: technicalSafetyCertificate ? technicalSafetyCertificate[0].id : null,
    liabilityInsuranceCertificate: liabilityInsuranceCertificate ? liabilityInsuranceCertificate[0].id : null,
    createdById,
    publishedAt: new Date(),
    meta: JSON.stringify(meta),
  });

  return data.createVehicle;
};

/**
 * Update an existing vehicle record.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {VehicleInfoUpdateForm} entity - The updated vehicle information.
 * @returns {Promise<VehicleInfo | undefined>} A promise that resolves to the updated vehicle information or `undefined` if there was an error.
 */
export const updateVehicle = async (jwt: string, entity: VehicleInfoUpdateForm): Promise<VehicleInfo | undefined> => {
  const {
    ownerType,
    subcontractorId,
    organizationId,
    yearOfManufacture,
    typeId,
    driverId,
    trailerId,
    fuelType,
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
        $ownerType: ENUM_VEHICLE_OWNERTYPE
        $organizationId: Int
        $subcontractorId: Int
        $model: String
        $type: ID
        $vehicleNumber: String!
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
        $fuelType: ENUM_VEHICLE_FUELTYPE
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
        $driver: ID
        $trailer: ID
        $updatedById: ID
        $fuelConsumption: Float
        $meta: JSON
      ) {
        updateVehicle(
          id: $id
          data: {
            ownerType: $ownerType
            organizationId: $organizationId
            subcontractorId: $subcontractorId
            model: $model
            type: $type
            vehicleNumber: $vehicleNumber
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
            fuelType: $fuelType
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
            driver: $driver
            trailer: $trailer
            updatedByUser: $updatedById
            fuelConsumption: $fuelConsumption
            meta: $meta
          }
        ) {
          data {
            id
          }
        }
      }
    `;

  const { data } = await fetcher<VehicleInfo>(jwt, query, {
    ...otherEntityProps,
    ownerType: ownerType as VehicleOwnerType,
    subcontractorId: ownerType === VehicleOwnerType.SUBCONTRACTOR ? Number(subcontractorId) : null,
    organizationId: Number(organizationId),
    yearOfManufacture: Number(yearOfManufacture),
    type: typeId,
    driver: driverId,
    trailer: trailerId,
    fuelType: fuelType as VehicleFuelType,
    startUsageDate: formatGraphQLDate(startUsageDate),
    registrationDate: formatGraphQLDate(registrationDate),
    registrationExpirationDate: formatGraphQLDate(registrationExpirationDate),
    technicalSafetyRegistrationDate: formatGraphQLDate(technicalSafetyRegistrationDate),
    technicalSafetyExpirationDate: formatGraphQLDate(technicalSafetyExpirationDate),
    liabilityInsuranceRegistrationDate: formatGraphQLDate(liabilityInsuranceRegistrationDate),
    liabilityInsuranceExpirationDate: formatGraphQLDate(liabilityInsuranceExpirationDate),
    images: idImages,
    ...(registrationCertificate && { registrationCertificate: registrationCertificate[0].id }),
    ...(technicalSafetyCertificate && { technicalSafetyCertificate: technicalSafetyCertificate[0].id }),
    ...(liabilityInsuranceCertificate && { liabilityInsuranceCertificate: liabilityInsuranceCertificate[0].id }),
    updatedById,
    meta: JSON.stringify(meta),
  });

  return data.updateVehicle;
};

/**
 * Retrieves a list of vehicles that are due for reminders based on the organization settings.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {OrganizationSettingInfo[]} organizationSettings - An array of organization settings.
 * @return {Promise<VehicleInfo[]>} - A promise that resolves to an array of vehicles that are due for reminders.
 */
export const getReminderVehicles = async (
  jwt: string,
  organizationSettings: OrganizationSettingInfo[]
): Promise<VehicleInfo[]> => {
  let reminderVariables: string = "";
  let reminderQueries: string = "";
  const reminderParams: AnyObject = {};

  organizationSettings.forEach((setting) => {
    const { organizationId, minVehicleDocumentReminderDays } = setting;
    if (!minVehicleDocumentReminderDays) {
      return;
    }

    reminderVariables += `$reminderDate${organizationId}: Date\n`;
    reminderQueries += `
      {
        organizationId: { eq: ${organizationId} }
        or: [
          { technicalSafetyExpirationDate: { eq: $reminderDate${organizationId} } }
          { liabilityInsuranceExpirationDate: { eq: $reminderDate${organizationId} } }
        ]
      }
    `;
    reminderParams[`reminderDate${organizationId}`] = formatGraphQLDate(
      addDays(new Date(), minVehicleDocumentReminderDays)
    );
  });

  if (!reminderQueries || !reminderParams) {
    return [];
  }

  const query = gql`
    query (${reminderVariables}) {
      vehicles(
        pagination: { limit: -1 }
        filters: {
          isActive: { eq: true }
          or: [
            ${reminderQueries}
          ]
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            organizationId
            vehicleNumber
            technicalSafetyExpirationDate
            liabilityInsuranceExpirationDate
            driver {
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
        }
      }
    }
  `;

  const { data } = await fetcher<VehicleInfo[]>(jwt, query, {
    ...reminderParams,
  });

  return data?.vehicles ?? [];
};

export const vehiclesAndLastStatusFetcher = async (params: Pick<VehicleInfo, "organizationId">) => {
  const { organizationId } = params;
  const query = Prisma.sql`
WITH waiting_for_pickup_order AS (
  SELECT display_order FROM driver_reports WHERE type = 'WAITING_FOR_PICKUP' AND organization_id = ${organizationId}
),
delivered_order AS (
  SELECT display_order FROM driver_reports WHERE type = 'DELIVERED' AND organization_id = ${organizationId}
),
vehicle_statuses AS (
  SELECT
    otvl.vehicle_id,
    dr.type as driver_report_type,
    dr.id as driver_report_id,
    dr.name as driver_report_name,
    dr.display_order,
    ROW_NUMBER() OVER(PARTITION BY otvl.vehicle_id ORDER BY ots.created_at DESC) as rn
  FROM
    order_trip_statuses ots
  LEFT JOIN
    order_trip_statuses_trip_links otstl ON ots.id = otstl.order_trip_status_id
  LEFT JOIN
    order_trips ot ON otstl.order_trip_id = ot.id
  LEFT JOIN
    order_trips_vehicle_links otvl ON ot.id = otvl.order_trip_id
  LEFT JOIN
    order_trip_statuses_driver_report_links otsdrl ON ots.id = otsdrl.order_trip_status_id
  LEFT JOIN
    driver_reports dr ON otsdrl.driver_report_id = dr.id
  WHERE ots.organization_id = ${organizationId}
    AND ot.organization_id = ${organizationId}
    AND dr.organization_id = ${organizationId}
),
latest_statuses AS (
    SELECT
        vehicle_id,
        driver_report_type,
        driver_report_id,
        driver_report_name,
        display_order
    FROM
        vehicle_statuses
    WHERE
        rn = 1
)
SELECT
    v.id,
    v.vehicle_number,
    d.first_name,
    d.last_name,
    ls.driver_report_type,
    ls.driver_report_id,
    ls.driver_report_name,
    ls.display_order,
    CASE
        WHEN
            display_order NOT BETWEEN (SELECT display_order FROM waiting_for_pickup_order) AND (SELECT display_order - 1 FROM delivered_order)
            OR display_order IS NULL
            THEN 'true'
        ELSE 'false'
    END as isFree
FROM
  vehicles v
LEFT JOIN
  vehicles_driver_links vdl ON v.id = vdl.vehicle_id
LEFT JOIN
  drivers d ON vdl.driver_id = d.id
LEFT JOIN
  latest_statuses ls ON v.id = ls.vehicle_id
WHERE
  v.organization_id = ${organizationId}
  AND v.published_at IS NOT NULL
ORDER BY
    v.vehicle_number;
`;

  const response = await prisma.$queryRaw<AnyObject[]>(query);
  return response ? transformObject<VehiclesByStatusResponse>(response) : ([] as VehiclesByStatusResponse[]);
};

export const latestVehicleLocationFetcher = async (params: LatestVehicleLocationParams) => {
  const { organizationId, vehicleIds, startDate, endDate } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`u.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.delivery_date BETWEEN ${startDate} AND ${endDate}`);
  vehicleIds && searchConditions.push(Prisma.sql`otvl.vehicle_id IN (${vehicleIds})`);

  const query = Prisma.sql`
WITH waiting_for_pickup AS (
  SELECT display_order
  FROM driver_reports
  WHERE type = 'WAITING_FOR_PICKUP'
      AND organization_id = ${organizationId}
),
latest_trip_statuses AS (
    SELECT
        ot.id AS order_trip_id,
        ot.code AS order_trip_code,
        ot.weight,
        ot.pickup_date,
        ot.delivery_date,
        o.id AS order_id,
        o.code AS order_code,
        u.code AS unit_of_measure_code,
        dr.id AS driver_report_id,
        dr.name AS driver_report_name,
        dr.type AS driver_report_type,
        dr.display_order,
        ots.created_at,
        otvl.vehicle_id,
        r.code as route_code,
        r.name as route_name,
        ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
    FROM order_trip_statuses ots
    JOIN order_trip_statuses_trip_links otstl
        ON ots.id = otstl.order_trip_status_id
    JOIN order_trips ot
        ON otstl.order_trip_id = ot.id
    JOIN order_trip_statuses_driver_report_links otsdrl
        ON ots.id = otsdrl.order_trip_status_id
    JOIN driver_reports dr
        ON otsdrl.driver_report_id = dr.id
    JOIN order_trips_vehicle_links otvl
        ON ot.id = otvl.order_trip_id
    JOIN order_trips_order_links otol
        ON ot.id = otol.order_trip_id
    JOIN orders o
        ON otol.order_id = o.id
    JOIN orders_route_links orl
        ON o.id = orl.order_id
    JOIN routes r
        ON orl.route_id = r.id
    JOIN orders_unit_links oul
      ON o.id = oul.order_id
    JOIN unit_of_measures u
      ON oul.unit_of_measure_id = u.id
    WHERE
        ${Prisma.join(searchConditions, " AND ")}
),
current_trip AS (
    SELECT
        ls.order_trip_id,
        ls.order_trip_code,
        ls.weight,
        ls.route_code,
        ls.route_name,
        ls.pickup_date,
        ls.delivery_date,
        ls.order_id,
        ls.order_code,
        ls.unit_of_measure_code,
        ls.vehicle_id,
        ls.driver_report_id,
        ls.driver_report_type,
        ls.driver_report_name,
        COALESCE(
            CASE
                WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup) THEN ls.pickup_date
                WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup) THEN ls.created_at
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
    FROM latest_trip_statuses ls
    WHERE ls.rn = 1
    ORDER BY ls.pickup_date DESC
),
filtered_trips AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY start_date DESC) AS rn
        FROM current_trip
    # WHERE start_date >= startDate
    # AND start_date <= endDate
)
SELECT v.id,
      v.vehicle_number,
      vt.latitude,
      vt.longitude,
      vt.address,
      vt.car_status,
      vt.instant_fuel,
      vt.speed,
      ft.order_trip_id,
      ft.order_trip_code,
      ft.pickup_date,
      ft.delivery_date,
      ft.order_id,
      ft.order_code,
      ft.weight,
      ft.unit_of_measure_code,
      ft.driver_report_id,
      ft.driver_report_type,
      ft.driver_report_name,
      ft.route_code,
      ft.route_name,
      d.id as driver_id,
      d.first_name,
      d.last_name,
      d.phone_number,
      f.formats as avatar_obj
FROM vehicles v
        LEFT JOIN
    vehicles_driver_links vdl ON v.id = vdl.vehicle_id
        LEFT JOIN
    drivers d ON vdl.driver_id = d.id AND d.organization_id = ${organizationId}
        LEFT JOIN
    filtered_trips ft ON v.id = ft.vehicle_id AND ft.rn = 1
        LEFT JOIN
    drivers_user_links dul ON dul.driver_id = d.id
        LEFT JOIN
    up_users_detail_links uudl ON uudl.user_id = dul.user_id
        LEFT JOIN
    files_related_morphs frm ON frm.related_type = 'api::user-detail.user-detail'
            AND frm.field = 'avatar'
            AND frm.related_id = uudl.user_detail_id
        LEFT JOIN files f ON frm.file_id = f.id
        JOIN vehicle_trackings_vehicle_links vtv ON v.id = vtv.vehicle_id
        JOIN vehicle_trackings vt
            ON vtv.vehicle_tracking_id = vt.id
            AND vt.organization_id = ${organizationId}
            AND vt.published_at IS NOT NULL

WHERE
  v.organization_id = ${organizationId}
  AND v.is_active = true
  AND v.published_at IS NOT NULL
  ${vehicleIds ? Prisma.sql`AND v.id IN (${Prisma.join(vehicleIds)})` : Prisma.empty}
`;

  const response = await prisma.$queryRaw<AnyObject[]>(query);

  const rs = response
    ? transformObject<LatestVehicleLocationResponse>(response)
    : ([] as LatestVehicleLocationResponse[]);

  const result = rs.map((item) => {
    let avatarObj: AnyObject | null = null;
    if (item.avatarObj) {
      avatarObj = JSON.parse(item.avatarObj);
    }
    return {
      ...item,
      avatarObj: avatarObj ? avatarObj.thumbnail.url : null,
    };
  });

  return result;
};

export const detailLatestVehicleLocationFetcher = async (params: DetailLatestVehicleLocationParams) => {
  const { driverId, orderTripId, driverReportId, id: vehicleId } = params;

  const query = Prisma.sql`
    SELECT
      v.vehicle_number,
      d.first_name,
      d.last_name,
      d.phone_number,
      o.code as order_code,
      ot.id as order_trip_id,
      ot.code as order_trip_code,
      dr.type as driver_report_type,
      dr.name as driver_report_name,
      c.name as customer_name,
      r.name as route_name
    FROM
      vehicles v
    LEFT JOIN
            vehicles_driver_links vdl ON
      v.id = vdl.vehicle_id
    LEFT JOIN
            drivers d ON
      vdl.driver_id = d.id
      AND d.id = ${driverId}
    LEFT JOIN order_trips ot ON
      ot.id = ${orderTripId}
    LEFT JOIN order_trips_order_links otol ON
      otol.order_trip_id = ot.id
    LEFT JOIN orders o ON
      o.id = otol.order_id
    LEFT JOIN driver_reports dr ON
      dr.id = ${driverReportId}
    LEFT JOIN orders_customer_links ocl ON
      ocl.order_id = o.id
    LEFT JOIN customers c ON
      c.id = ocl.customer_id
    LEFT JOIN orders_route_links orl ON
      orl.order_id = o.id
    LEFT JOIN
        routes r ON
      r.id = orl.route_id
    WHERE
      v.id = ${vehicleId}
`;

  const response = await prisma.$queryRaw<AnyObject>(query);

  return response
    ? transformObject<DetailLatestVehicleLocationResponse>(response)[0]
    : ({} as DetailLatestVehicleLocationResponse);
};
