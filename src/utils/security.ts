import CryptoJS from "crypto-js";
import { FieldNode, OperationDefinitionNode, parse } from "graphql";
import jwt from "jsonwebtoken";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";

import { NEXT_PUBLIC_APP_SECRET } from "@/configs/environment";
import { SESSION_USER_PROFILE } from "@/constants/storage";
import { AnyObject } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { UserInfo } from "@/types/strapi";

import logger from "./logger";
import { getItemObject } from "./storage";
import { ensureString } from "./string";

/**
 * Encryption ID secret
 */
const ENCRYPTION_ID_SECRET = CryptoJS.enc.Base64.parse(NEXT_PUBLIC_APP_SECRET);

/**
 * Encryption ID iv
 */
const ENCRYPTION_ID_IV = CryptoJS.enc.Base64.parse(NEXT_PUBLIC_APP_SECRET);

/**
 * Combine Data Object into a URL-Encoded String
 *
 * This function takes a generic data object and combines its key-value pairs into a URL-encoded string.
 * It sorts the keys alphabetically and handles various value types, including null, undefined, Dates, arrays,
 * and nested objects, while URL-encoding their values.
 *
 * @template T - The type of the input data.
 * @param {T} data - The data object to be combined into a URL-encoded string.
 * @returns {string} - The URL-encoded string representing the combined key-value pairs.
 */
export const combineDataBeforeSign = <T>(data: T): string => {
  const dataObj = data as AnyObject;
  return Object.keys(dataObj)
    .sort()
    .map((key) => {
      const objValue = dataObj[key];
      if (objValue === null || objValue === undefined) {
        return `${key}=`;
      }
      if (objValue instanceof Date) {
        return `${key}=${encodeURIComponent(objValue.toISOString())}`;
      }
      if (isArray(objValue)) {
        return `${key}=[${combineDataBeforeSign(objValue)}]`;
      }
      if (isObject(objValue)) {
        return `${key}={${combineDataBeforeSign(objValue)}}`;
      }
      return `${key}=${encodeURIComponent(ensureString(objValue))}`;
    })
    .join("&");
};

/**
 * Calculate the HMAC-SHA256 hash of the message using the provided secret key.
 *
 * @param message - The message to hash.
 * @param secret - The secret key for HMAC.
 * @returns - The hexadecimal hash value.
 */
export const hmacSHA256 = (message: string | CryptoJS.lib.WordArray, secret: string | CryptoJS.lib.WordArray) =>
  CryptoJS.HmacSHA256(message, secret).toString();

/**
 * Verify if a provided hash matches the HMAC-SHA256 hash of the message using the secret key.
 *
 * @param hashed - The expected hash value.
 * @param message - The message to verify.
 * @param secret - The secret key for HMAC.
 * @returns - True if the provided hash matches the calculated hash, false otherwise.
 */
export const verifyHmacSHA256 = (
  hashed: string,
  message: string | CryptoJS.lib.WordArray,
  secret: string | CryptoJS.lib.WordArray
) => {
  // Calculate the HMAC-SHA256 hash of the message.
  const newHashed = hmacSHA256(message, secret);
  return newHashed === hashed;
};

/**
 * Encrypt a message using AES encryption with the provided secret key.
 *
 * @param message - The message to encrypt.
 * @param secret - The secret key for encryption.
 * @returns - The encrypted message.
 */
export const encryptAES = (message: string | CryptoJS.lib.WordArray, secret: string | CryptoJS.lib.WordArray) =>
  CryptoJS.AES.encrypt(message, secret).toString();

/**
 * Decrypt an AES-encrypted message using the provided secret key.
 *
 * @param cipherText - The encrypted message.
 * @param secret - The secret key for decryption.
 * @returns - The decrypted message.
 */
export const decryptAES = (cipherText: string | CryptoJS.lib.CipherParams, secret: string | CryptoJS.lib.WordArray) =>
  CryptoJS.AES.decrypt(cipherText, secret).toString(CryptoJS.enc.Utf8);

/**
 * Encrypt and Convert ID to Hex
 *
 * This function takes a numeric ID, pads it with leading zeros, encrypts it using AES encryption with a secret key,
 * and then converts the encrypted result to Base64 and further to a hexadecimal string. This is often used to obfuscate
 * sensitive IDs for secure transmission or storage.
 *
 * @param {number} id - The numeric ID to be encrypted.
 * @returns {string} - A hexadecimal string representing the encrypted ID.
 */
export const encryptId = (id?: number | null): string => {
  if (id) {
    // Pad the ID with leading zeros and encrypt it
    const idWithPadding = ensureString(id).padStart(10, "0");
    const encrypted = CryptoJS.AES.encrypt(idWithPadding, ENCRYPTION_ID_SECRET, {
      iv: ENCRYPTION_ID_IV,
    }).toString();

    // Convert the encrypted result to Base64 and then to Hex
    const encryptedBase64 = CryptoJS.enc.Base64.parse(encrypted);
    return encryptedBase64.toString(CryptoJS.enc.Hex);
  }
  return "";
};

/**
 * Decrypt and Convert Hex to Numeric ID
 *
 * This function takes a hexadecimal string, decrypts it using AES decryption with a secret key, and converts
 * the decrypted result back to a numeric ID. It also removes leading zeros and ensures the result is a valid number.
 * If decryption fails or the result is not a valid number, it returns null.
 *
 * @param {string} encrypted - The hexadecimal string representing the encrypted ID.
 * @returns {number | null} - The decrypted numeric ID or null if decryption fails.
 */
export const decryptId = (encrypted?: string | null): number | null => {
  if (encrypted) {
    try {
      // Parse the Hex value and convert it back to Base64
      const hex = CryptoJS.enc.Hex.parse(encrypted);
      const encryptedBase64 = hex.toString(CryptoJS.enc.Base64);

      // Decrypt the ID and remove leading zeros
      const decrypted = CryptoJS.AES.decrypt(encryptedBase64, ENCRYPTION_ID_SECRET, {
        iv: ENCRYPTION_ID_IV,
      });
      const idWithPadding = decrypted.toString(CryptoJS.enc.Utf8);

      // Check if the result is a valid number
      const originId = Number(idWithPadding);
      if (!isNaN(originId)) {
        return originId;
      }
    } catch (err) {
      // Error handling: return null if decryption fails
    }
  }
  return null;
};

/**
 * Sign request data using a HMAC-SHA256 signature.
 *
 * @param data - The data to be signed.
 * @returns The signed data object, including the HMAC-SHA256 signature.
 */
export const signRequestData = async (data: AnyObject = {}): Promise<AnyObject> => {
  const combined = combineDataBeforeSign(data);

  // Calculate the HMAC-SHA256
  const signature = hmacSHA256(combined, NEXT_PUBLIC_APP_SECRET);
  return { ...data, signature };
};

/**
 * Verify the authenticity of request data using HMAC-SHA256 signature.
 *
 * @param req - The API request object.
 * @param data - The request data to be verified, including a signature.
 * @returns A promise that resolves to a boolean indicating
 * whether the request data is authentic.
 */
export const verifyRequestData = async (req: ApiNextRequest, data: AnyObject): Promise<boolean> => {
  const { signature, ...others } = data;
  const combined = combineDataBeforeSign(others);

  // Verify the HMAC-SHA256 signature from the request data
  return verifyHmacSHA256(signature, combined, NEXT_PUBLIC_APP_SECRET);
};

/**
 * Extracts relevant parameters from a GraphQL request query.
 *
 * @param {string} requestQuery - The GraphQL request query.
 * @returns {Object} - An object containing extracted parameters.
 */
export const getGraphQLParams = (requestQuery: string): AnyObject => {
  // Extract Resource from the request query
  const document = parse(requestQuery);
  const resources: string[] = [];
  if (document?.definitions?.length > 0) {
    document.definitions.forEach((def) => {
      const selections = (def as OperationDefinitionNode)?.selectionSet?.selections || [];
      const selectionNames = selections.map((sel) => (sel as FieldNode)?.name?.value);
      resources.push(...selectionNames);
    });
  }

  // Extract URL from the pathname and search
  let url = "";
  if (typeof window !== "undefined") {
    const { pathname, search } = window.location;
    url = `${pathname}${search}`;
  }

  // Extract user ID from the session user profile
  const userId = getItemObject<UserInfo>(SESSION_USER_PROFILE)?.id;

  return {
    ...(userId && { userId }),
    resources: resources.join(","),
    ...(url && { url }),
  };
};

/**
 * Encodes data into a JSON Web Token (JWT) using the provided data and a public application secret.
 *
 * @param data - The data to be encoded into the JWT. Default is an empty object.
 * @returns The generated JWT.
 */
export const encodeJWT = (data: AnyObject = {}): string => {
  return jwt.sign(data, NEXT_PUBLIC_APP_SECRET);
};

/**
 * Decodes a JSON Web Token (JWT) to retrieve its payload using the provided JWT token and public application secret.
 *
 * @param token - The JWT token to be decoded.
 * @returns A Promise that resolves to the decoded JWT payload or an error message, or undefined if an error occurs.
 *
 */
export const decodeJWT = <T>(token: string): T | null => {
  try {
    return jwt.verify(token, NEXT_PUBLIC_APP_SECRET) as T;
  } catch (err) {
    logger.error(`#decodeJWT: ${err}`);
  }
  return null;
};
