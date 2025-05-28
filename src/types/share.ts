import { ShareObjectType } from "@prisma/client";

export type ShareObjectToken = {
  type: ShareObjectType;
  orgId: number;
  tripCode?: string;
  orderCode?: string;
  exp?: string;
  timestamp: number;
};
