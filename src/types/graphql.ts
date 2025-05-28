/* eslint-disable @typescript-eslint/no-explicit-any */

import { RequestDocument, Variables } from "graphql-request";

import { AnyObject, ErrorType } from "@/types";

/**
 * Pagination type representing pagination information.
 */
export type Pagination = {
  /**
   * The current page number
   */
  page: number;

  /**
   * The number of items per page
   */
  pageSize: number;

  /**
   * The total number of pages
   */
  pageCount: number;

  /**
   * The total number of items across all pages
   */
  total: number;
};

/**
 * Meta type that can optionally include pagination data.
 */
export type Meta = {
  /**
   * Optional pagination information
   */
  pagination?: Pagination;
};

/**
 * Generic GraphQLResult type, which includes data and optional meta information.
 * The generic type 'T' represents the type of the 'data' property.
 */
export type GraphQLResult<T = any> = AnyObject & {
  /**
   * The main data payload
   */
  data: T;

  /**
   * Optional meta information
   */
  meta?: Meta;
};

/**
 * Generic GraphQLResults type, which includes data and optional meta information.
 * The generic type 'T' represents the type of the 'data' property.
 */
export type GraphQLResults<T = any> = {
  [key: string]: GraphQLResult<T>;
};

/**
 * Data for a GraphQL request
 */
export type GraphQLRequestData = {
  /**
   * The GraphQL query document
   */
  query: RequestDocument;

  /**
   * Optional variables to be used with the query
   */
  params?: Variables;

  /**
   * HmacSHA256
   */
  signature?: string;
};

export type MutationResult<T = any> = {
  data?: T;
  error?: ErrorType;
  errorField?: string;
};
