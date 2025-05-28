import axios, { AxiosError, AxiosRequestConfig } from "axios";
import gqlPrettier from "graphql-prettier";
import { signOut } from "next-auth/react";

import { AnyObject } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { GraphQLRequestData } from "@/types/graphql";
import { getGraphQLParams, signRequestData } from "@/utils/security";
import { ensureString } from "@/utils/string";

const handleAxiosError =
  <T>(resolve: (value: T | PromiseLike<T>) => void) =>
  async (err: unknown) => {
    const response = (err as AxiosError<T>).response;
    let data = response?.data;
    let statusCode = response?.status;
    if (!data) {
      data = {
        status: statusCode || HttpStatusCode.InternalServerError,
        message: response?.statusText,
      } as T;
    } else {
      statusCode = (data as unknown as AxiosError).status;
    }

    if (
      (statusCode === HttpStatusCode.Forbidden || statusCode === HttpStatusCode.Unauthorized) &&
      (data as AnyObject)?.meta?.provider === "strapi" &&
      typeof window !== "undefined"
    ) {
      try {
        const pathname = window.location?.pathname || "";
        if (!pathname.includes("/auth/signin")) {
          const message = (data as AnyObject)?.message || "Error Forbidden or Unauthorized";
          console.error(`${message}, sign out automatically.`);
          await signOut({
            redirect: true,
            callbackUrl: "/auth/signin",
          });
          return;
        }
      } catch (signOutError) {
        console.error("Failed to sign out the user:", signOutError);
      }
    }
    resolve(data);
  };

/**
 * Fetches data from the given URL with query parameters.
 *
 * @param url - The URL to fetch data from.
 * @param params - The query parameters to be appended to the URL.
 * @param config - Configuration for Axios request.
 * @returns A promise that resolves to the fetched data.
 */
export const get = <T>(url: string, params?: AnyObject, config?: AxiosRequestConfig) => {
  return new Promise<T>((resolve) => {
    axios
      .get<T>(url, {
        ...config,
        params,
      })
      .then((result) => {
        return resolve(result.data);
      })
      .catch(handleAxiosError(resolve));
  });
};

/**
 * Perform a POST request to the specified URL with the given parameters and return the response data.
 *
 * @param url - The URL to send the POST request to.
 * @param params - An object containing the parameters to include in the request body.
 * @param config - Configuration for Axios request.
 * @returns The response data from the POST request.
 */
export const post = <T>(url: string, params?: AnyObject, config?: AxiosRequestConfig) => {
  return new Promise<T>((resolve) => {
    axios
      .post<T>(url, { ...params }, { ...config })
      .then((result) => {
        return resolve(result.data);
      })
      .catch(handleAxiosError(resolve));
  });
};

/**
 * Perform a POST request to the specified URL with the given parameters and return the response data.
 *
 * @param url - The URL to send the POST request to.
 * @param params - An object containing the parameters to include in the request form data.
 * @param config - Configuration for Axios request.
 * @returns The response data from the POST request.
 */
export const postForm = <T>(url: string, params?: AnyObject | FormData, config?: AxiosRequestConfig) => {
  return new Promise<T>((resolve) => {
    let formData: FormData;
    if (params instanceof FormData) {
      formData = params;
    } else {
      formData = new FormData();
      if (params) {
        Object.keys(params).forEach((key) => {
          formData.append(key, params[key]);
        });
      }
    }

    axios
      .post<T>(url, formData, {
        ...config,
        headers: {
          "Content-Type": "multipart/form-data",
          ...config?.headers,
        },
      })
      .then((result) => {
        return resolve(result.data);
      })
      .catch(handleAxiosError(resolve));
  });
};

/**
 * Perform a POST request to the specified URL with the given parameters and return the response data.
 *
 * @param url - The URL to send the POST request to.
 * @param params - An object containing the parameters to include in the request body.
 * @param config - Configuration for Axios request.
 * @returns The response data from the POST request.
 */
export const graphQLPost = async <T>(params: GraphQLRequestData, config?: AxiosRequestConfig) => {
  const query = gqlPrettier(ensureString(params.query));
  const graphQLParams = getGraphQLParams(query);
  const dataSigned = await signRequestData({ ...params, query });
  return post<ApiResult<AnyObject<T>>>("/api/graphql", dataSigned, {
    ...config,
    params: graphQLParams,
  });
};

/**
 * Sends a PUT request to the specified URL with the provided data and returns the response data.
 * @param url - The URL to send the request to.
 * @param params - The data to send with the request.
 * @param config - Configuration for Axios request.
 * @returns A Promise that resolves to the response data.
 */
export const put = <T>(url: string, params: AnyObject, config?: AxiosRequestConfig) => {
  return new Promise<T>((resolve) => {
    axios
      .put<T>(url, { ...params }, { ...config })
      .then((result) => {
        return resolve(result.data);
      })
      .catch(handleAxiosError(resolve));
  });
};

/**
 * Sends a DELETE request to the specified URL with the given parameters and returns the response data.
 * @param url - The URL to send the DELETE request to.
 * @param params - The parameters to include in the request.
 * @param config - Configuration for Axios request.
 * @returns - The response data as a Promise.
 */
export const del = <T>(url: string, params: AnyObject, config?: AxiosRequestConfig) => {
  return new Promise<T>((resolve) => {
    axios
      .delete<T>(url, {
        ...config,
        params,
      })
      .then((result) => {
        return resolve(result.data);
      })
      .catch(handleAxiosError(resolve));
  });
};
