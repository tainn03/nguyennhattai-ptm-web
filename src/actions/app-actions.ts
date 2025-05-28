"use server";

import { APP_SECRET } from "@/configs/environment";
import { AnyObject } from "@/types";
import { AppInfo } from "@/types/auth";
import { encryptAES } from "@/utils/security";

export async function getAppInfoAction(): Promise<AppInfo> {
  return {
    version: process.env.APP_VERSION || process.env.NODE_ENV,
    buildHash: process.env.APP_BUILD_HASH ?? "",
    buildDate: process.env.APP_BUILD_DATE ?? "",
  };
}

/**
 * Create token for order sharing URL
 *
 * @param {AnyObject} data - The data want to generate.
 * @returns {Promise<string>} - A promise that resolves to a string.
 */
export async function createToken(data: AnyObject): Promise<string> {
  return encryptAES(JSON.stringify(data), APP_SECRET);
}
