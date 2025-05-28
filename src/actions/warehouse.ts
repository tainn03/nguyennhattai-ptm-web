"use server";

import { gql } from "graphql-request";

import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { WarehouseInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { transformToGraphqlPayload } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Fetch zone options with the given parameters
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing sort and organizationId
 * @returns Object containing data and meta
 */
export const warehouseOptionsFetcher = withActionExceptionHandler<
  [string, FilterRequest<WarehouseInfo>],
  WarehouseInfo[]
>(async (token, params) => {
  const [_, filters] = params;
  const query = gql`
    query ($sort: [String], $organizationId: Int) {
      warehouses(
        pagination: { limit: -1 }
        sort: $sort
        filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null }, isActive: { eq: true } }
      ) {
        data {
          id
          attributes {
            name
            address {
              data {
                id
                attributes {
                  code
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<WarehouseInfo[]>(token.jwt, query, {
    sort: ["name:asc"],
    ...transformToGraphqlPayload(filters),
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.warehouses,
  };
});
