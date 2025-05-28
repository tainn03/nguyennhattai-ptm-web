import axios from "axios";

import { STRAPI_HEALTH_URL } from "./configs/environment";
import { prisma } from "./configs/prisma";
import logger from "./utils/logger";
import { ensureString } from "./utils/string";

/**
 * Performs waiting for a specified amount of time
 *
 * @param seconds: number of seconds to wait
 * @returns Promise<void> A Promise that does not return any value
 */
const waiting = (seconds: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
};

/**
 * Check the connection to the Strapi using HTTP Client (Axios).
 * If the connection fails, the method retries up to 3 times.
 *
 * @param {number} [retryCount=0] - The retry count, indicating the number of attempts to connect.
 * @returns {Promise<boolean>} Returns a promise resolving to `true` if the connection is successful, otherwise `false`.
 */
const checkStrapiConnection = async (retryCount = 0) => {
  if (retryCount > 0) {
    logger.info(`[RETRY-${retryCount}] Trying to connect to the Strapi`);
  }
  try {
    const res = await axios.get(STRAPI_HEALTH_URL);
    const healthResult = ensureString(res.headers.strapi);
    if (healthResult) {
      logger.info(`Strapi connection successful: ${healthResult}`);
      return true;
    }
    throw new Error("Cannot receive health status from Strapi");
  } catch (ex) {
    const { stack, message } = ex as Error;
    logger.error(stack || message);
    logger.error("#checkStrapiConnection: Strapi connection error");
    if (retryCount < 3) {
      await waiting(3);
      await checkStrapiConnection(retryCount + 1);
    } else {
      return false;
    }
  }
};

/**
 * Check the connection to the database using Prisma client.
 * If the connection fails, the method retries up to 3 times.
 *
 * @param {number} [retryCount=0] - The retry count, indicating the number of attempts to connect.
 * @returns {Promise<boolean>} Returns a promise resolving to `true` if the connection is successful, otherwise `false`.
 */
const checkDbConnection = async (retryCount = 0) => {
  if (retryCount > 0) {
    logger.info(`[RETRY-${retryCount}] Trying to connect to the database`);
  }
  try {
    await prisma.$connect();
    logger.info("MySQL connection successful");
    return true;
  } catch (ex) {
    const { stack, message } = ex as Error;
    logger.error(stack || message);
    logger.error("#checkDbConnection: MySQL connection error");
    if (retryCount < 3) {
      await waiting(3);
      await checkDbConnection(retryCount + 1);
    } else {
      return false;
    }
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Server Initialization Hook
 *
 * This function is called whenever the Next.js server is started.
 * It is responsible for checking the database connection or performing any necessary server initialization tasks.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Check the connection to the Strapi
    const isStrapiConnectionValid = await checkStrapiConnection();
    if (!isStrapiConnectionValid) {
      process.exit(1);
    }

    // Check the connection to the Db
    const isDbConnectionValid = await checkDbConnection();
    if (!isDbConnectionValid) {
      process.exit(1);
    }

    logger.info("\nEverything is ready for use!!!");
  }
}
