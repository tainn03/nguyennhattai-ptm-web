import { GraphQLClient, RequestDocument, Variables } from "graphql-request";
import has from "lodash/has";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";

import { STRAPI_GRAPHQL_URL, STRAPI_REQUEST_TIMEOUT } from "@/configs/environment";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import { GraphQLResult, GraphQLResults, Meta } from "@/types/graphql";

import logger from "./logger";

/**
 * Flatten `attributes` for the input object.
 *
 * @param data Object data
 * @returns Object data flatten `attributes`
 */
const flattenAttributes = (data: AnyObject): AnyObject => {
  if (has(data, "attributes")) {
    return {
      id: data.id,
      ...data.attributes,
    };
  }
  return data;
};

/**
 * Normalize format object data with recursive.
 *
 * @param data Object data
 * @returns Object data normalize format
 */
const recursiveTransformer = (data: AnyObject): AnyObject | null => {
  if (isArray(data)) {
    return (data as AnyObject[]).map((item) => recursiveTransformer(item));
  }

  if (isObject(data) as boolean) {
    let dataTemp: AnyObject | null;
    if (isArray(data.data)) {
      dataTemp = [...data.data];
    } else if (isObject(data.data)) {
      dataTemp = flattenAttributes({ ...data.data });
    } else if (data.data === null) {
      dataTemp = null;
    } else {
      dataTemp = flattenAttributes(data);
    }
    for (const key in dataTemp) {
      dataTemp[key] = recursiveTransformer(dataTemp[key]);
    }
    return dataTemp;
  }

  return data;
};

/**
 * Transform the REST/GRAPHQL API response of Strapi to normalize format
 *
 * @see https://github.com/pankod/refine/blob/next/packages/strapi-v4/src/dataProvider.ts#L94
 * @param graphQLResults Graph result data
 * @returns Data flatten `data` and `attributes`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeData = <T = any>(graphQLResults: GraphQLResults<T>): GraphQLResult<AnyObject<T>> => {
  const result: AnyObject = {};
  let resultMeta: Meta | undefined;
  const keys = Object.keys(graphQLResults);
  keys.forEach((key) => {
    const { meta, ...otherProps } = graphQLResults[key];
    result[key] = recursiveTransformer(otherProps as AnyObject);
    if (meta && !resultMeta) {
      resultMeta = meta;
    }
  });
  return {
    data: result,
    ...(resultMeta && { meta: resultMeta }),
  };
};

/**
 * Returns a GraphQL client with optional authentication token
 *
 * @param endpointURL - The GraphQL Endpoint URL
 * @param token Optional authentication token
 * @returns GraphQL client
 */
const createGraphQLClient = (endpointURL: string, token?: string) => {
  const client = new GraphQLClient(endpointURL, {
    ...(STRAPI_REQUEST_TIMEOUT && { timeout: STRAPI_REQUEST_TIMEOUT }),
  } as AnyObject);
  if (token) {
    client.setHeader("Authorization", `Bearer ${token}`);
  }
  return client;
};

/**
 * Extracts the status code and error message from an array of GraphQL errors.
 *
 * @param {AnyObject[]} errors - The array of errors from the GraphQL response.
 * @returns {{ statusCode: number, errorMessage: string }} An object containing the status code and error message.
 */
const extractErrorInfo = (errors: AnyObject[]): { statusCode: number; errorMessage: string } => {
  let statusCode = HttpStatusCode.InternalServerError;
  let errorMessage = "";

  for (const error of errors) {
    const errorName = error?.name || error?.extensions?.error?.name;
    errorMessage = error?.message || error?.extensions?.error?.message || errorMessage;

    switch (errorName) {
      case "UnauthorizedError":
        statusCode = HttpStatusCode.Unauthorized;
        break;
      case "ForbiddenError":
        statusCode = HttpStatusCode.Forbidden;
        break;
      default:
        break;
    }
  }

  return { statusCode, errorMessage };
};

/**
 * Fetches data from a GraphQL endpoint using the provided token, document, and optional variables.
 *
 * @param token - The authorization token for accessing the GraphQL endpoint.
 * @param document - The GraphQL document (query or mutation) to execute.
 * @param variables - Optional variables to pass with the GraphQL document.
 * @param throwDefaultError - Optional. Throws the original error if set to true.
 * @returns A promise that resolves to the transformed GraphQL result.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetcher = async <T = any>(
  token: string,
  document: RequestDocument,
  variables?: Variables,
  throwDefaultError?: boolean
) => {
  const client = createGraphQLClient(STRAPI_GRAPHQL_URL, token);
  try {
    const result = await client.request<GraphQLResults<T>>(document, variables);
    return normalizeData(result);
  } catch (err) {
    if (throwDefaultError) {
      throw err;
    }

    // Extract error details from the caught error
    const { response, message, stack } = err as AnyObject;

    // Log the error stack or message for debugging purposes
    logger.error(`#fetcher: ${stack || message}`);

    // Throw an ApiError with the determined status code and message
    const errors = response.errors || [response.error];
    const { statusCode, errorMessage } = extractErrorInfo(errors);
    throw new ApiError(statusCode, errorMessage, { provider: "strapi" });
  }
};
