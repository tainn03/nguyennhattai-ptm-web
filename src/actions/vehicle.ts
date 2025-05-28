"use server";

import { gql } from "graphql-request";

import { FilterRequest } from "@/types/filter";
import { VehicleInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { getServerToken } from "@/utils/server";

export const vehicleMonitoringFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const { jwt, user } = await getServerToken();
  const { page, pageSize, idVehicle, idSubcontractor } = params;

  const query = gql`
    query ($organizationId: Int!, $page: Int, $pageSize: Int, $idVehicle: ID, $idSubcontractor: Int) {
      vehicles(
        filters: {
          or: [{ subcontractorId: { eq: $idSubcontractor } }, { id: { eq: $idVehicle } }]
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          isActive: { eq: true }
        }
        pagination: { page: $page, pageSize: $pageSize }
      ) {
        data {
          id
          attributes {
            vehicleNumber
            fuelType
            subcontractorId
            ownerType
            driver {
              data {
                id
                attributes {
                  firstName
                  lastName
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

  const { data, meta } = await fetcher<VehicleInfo[]>(jwt, query, {
    organizationId: user.orgId,
    page,
    pageSize,
    ...(idVehicle && { idVehicle: Number(idVehicle) }),
    ...(idSubcontractor && { idSubcontractor: Number(idSubcontractor) }),
  });

  return { data: data?.vehicles ?? [], meta };
};
