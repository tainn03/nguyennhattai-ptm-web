import { PrismaClient } from "@prisma/client";
import { ITXClientDenyList } from "@prisma/client/runtime/library";

import { __DEV__ } from "./environment";

export type PrismaClientTransaction = Omit<PrismaClient, ITXClientDenyList>;

export const prisma = new PrismaClient({
  log: __DEV__ ? ["info", "warn", "error"] : ["error"],
});
