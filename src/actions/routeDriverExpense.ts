"use server";

import { gql } from "graphql-request";

import { HttpStatusCode } from "@/types/api";
import { RouteDriverExpenseInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Creates a new route driver expense record.
 *
 * @param {Object} token - The authentication token object.
 * @param {Partial<RouteDriverExpenseInfo>} params - The parameters for creating a new route driver expense.
 * @returns {Promise<{ status: HttpStatusCode, data: RouteDriverExpenseInfo }>} A promise that resolves to an object containing the status and the created route driver expense data.
 */
export const createRouteDriverExpense = withActionExceptionHandler<
  Partial<RouteDriverExpenseInfo>,
  RouteDriverExpenseInfo
>(async (token, params) => {
  const { driverExpense, ...otherProps } = params;
  const query = gql`
    mutation ($data: RouteDriverExpenseInput!) {
      createRouteDriverExpense(data: $data) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RouteDriverExpenseInfo>(token.jwt, query, {
    data: {
      ...otherProps,
      driverExpense: driverExpense?.id ?? null,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.createRouteDriverExpense,
  };
});

/**
 * Updates an existing route driver expense record.
 *
 * @param {Object} token - The authentication token object.
 * @param {Partial<RouteDriverExpenseInfo>} params - The parameters for updating an existing route driver expense.
 * @returns {Promise<{ status: HttpStatusCode, data: RouteDriverExpenseInfo }>} A promise that resolves to an object containing the status and the updated route driver expense data.
 */
export const updateRouteDriverExpense = withActionExceptionHandler<
  Partial<RouteDriverExpenseInfo>,
  RouteDriverExpenseInfo
>(async (token, params) => {
  const { id, driverExpense, ...otherProps } = params;

  const query = gql`
    mutation ($id: ID!, $data: RouteDriverExpenseInput!) {
      updateRouteDriverExpense(id: $id, data: $data) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<RouteDriverExpenseInfo>(token.jwt, query, {
    id,
    data: {
      ...otherProps,
      driverExpense: driverExpense?.id ?? null,
    },
  });

  return {
    status: HttpStatusCode.Ok,
    data: data.updateRouteDriverExpense,
  };
});

/**
 * Upserts a route driver expense record.
 *
 * @param {Object} token - The authentication token object.
 * @param {Partial<RouteDriverExpenseInfo>} params - The parameters for upserting a route driver expense.
 * @returns {Promise<{ status: HttpStatusCode, data: RouteDriverExpenseInfo }>} A promise that resolves to an object containing the status and the upserted route driver expense data.
 */
export const upsertRouteDriverExpense = withActionExceptionHandler<
  Partial<RouteDriverExpenseInfo>,
  RouteDriverExpenseInfo
>(async (_, params) => {
  if (params?.id) {
    return updateRouteDriverExpense(params);
  }

  return createRouteDriverExpense(params);
});
