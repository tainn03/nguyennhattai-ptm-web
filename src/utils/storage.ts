import { __DEV__, NEXT_PUBLIC_APP_SECRET } from "@/configs/environment";
import { AnyObject } from "@/types";

import { decryptAES, encryptAES, hmacSHA256 } from "./security";
import { ensureString } from "./string";

/**
 * Options for client-side storage.
 */
export type StorageOptions = {
  provider?: "session" | "persistent";
  security?: boolean;
  remove?: boolean;
};

/**
 * Default storage options.
 */
const DEFAULT_OPTIONS: StorageOptions = {
  provider: "session",
  security: true,
  remove: false,
};

/**
 * Gets the appropriate storage provider (localStorage or sessionStorage) based on options.
 *
 * @param options - Storage options specifying the provider.
 * @returns The selected storage provider.
 */
const getStorage = (options: StorageOptions = DEFAULT_OPTIONS): Storage => {
  return options.provider === "persistent" ? window.localStorage : window.sessionStorage;
};

/**
 * Merges the provided storage options with the default options and returns the result.
 *
 * @param {StorageOptions} options - The storage options to merge with the default options.
 * @returns {StorageOptions} - The merged storage options.
 */
const mergeOptions = (options: StorageOptions): StorageOptions => {
  return { ...DEFAULT_OPTIONS, ...options };
};

/**
 * Generates a security key for securing data in storage.
 *
 * @param key - The original key.
 * @returns The security key.
 */
const getSecurityKey = (key: string): string => {
  const secret = `${key}#${NEXT_PUBLIC_APP_SECRET}`;
  return hmacSHA256(key, secret);
};

/**
 * Clears all items in storage.
 *
 * @param options - Storage options specifying the provider.
 */
export const clearAll = (options: StorageOptions = DEFAULT_OPTIONS) => {
  options = mergeOptions(options);
  const storage = getStorage(options);
  storage.clear();
};

/**
 * Removes an item from storage by key.
 *
 * @param key - The key of the item to remove.
 * @param options - Storage options specifying the provider and security.
 */
export const removeItem = (key: string, options: StorageOptions = DEFAULT_OPTIONS) => {
  options = mergeOptions(options);
  if (!__DEV__ && options.security) {
    // handler security data
    const securityKey = getSecurityKey(key);
    removeItem(securityKey, {
      ...options,
      security: false,
    });
  } else {
    const storage = getStorage(options);
    storage.removeItem(key);
  }
};

/**
 * Retrieves a string value from storage by key.
 *
 * @param key - The key of the item to retrieve.
 * @param options - Storage options specifying the provider and security.
 * @param defaultValue - (Optional) The default value to return if the item is not found.
 * @returns The retrieved string value.
 */
export const getItemString = (key: string, options: StorageOptions = DEFAULT_OPTIONS, defaultValue = ""): string => {
  options = mergeOptions(options);
  let result: string | null = "";
  try {
    const storage = getStorage(options);
    if (!__DEV__ && options.security) {
      // handler security data
      const securityKey = getSecurityKey(key);
      const cipherText = storage.getItem(securityKey) || "";
      result = decryptAES(cipherText, securityKey);
    } else {
      result = storage.getItem(key);
    }
    if (options.remove) {
      removeItem(key, options);
    }
  } catch (err) {
    console.error(err);
  }
  return result || defaultValue;
};

/**
 * Sets a string value in storage by key.
 *
 * @param key - The key of the item to set.
 * @param value - The value to store.
 * @param options - Storage options specifying the provider and security.
 */
export const setItemString = (key: string, value: string, options: StorageOptions = DEFAULT_OPTIONS) => {
  options = mergeOptions(options);
  try {
    const storage = getStorage(options);
    if (!__DEV__ && options.security) {
      // handler security data
      const securityKey = getSecurityKey(key);
      const securityData = encryptAES(value, securityKey);
      storage.setItem(securityKey, securityData);
    } else {
      storage.setItem(key, value);
    }
  } catch (err) {
    console.error(err);
  }
};

/**
 * Retrieves an object from storage by key.
 *
 * @param key - The key of the item to retrieve.
 * @param options - Storage options specifying the provider and security.
 * @returns The retrieved object, or null if not found or if an error occurs.
 */
export const getItemObject = <T = AnyObject>(key: string, options: StorageOptions = DEFAULT_OPTIONS): T | null => {
  let result: T | null = null;
  try {
    const valueStr = getItemString(key, options);
    if (valueStr) {
      result = JSON.parse(valueStr);
    }
  } catch (err) {
    console.error(err);
  }
  return result;
};

/**
 * Stores an object in storage by key.
 *
 * @param key - The key of the item to set.
 * @param value - The object value to store.
 * @param options - Storage options specifying the provider and security.
 */
export const setItemObject = <T = AnyObject>(
  key: string,
  value: T,
  options: StorageOptions = DEFAULT_OPTIONS
): void => {
  const valueStr = ensureString(value);
  setItemString(key, valueStr, options);
};
