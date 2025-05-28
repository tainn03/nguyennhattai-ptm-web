import { AdvanceStatus } from "@prisma/client";

import { BadgeProps } from "@/components/atoms/Badge/Badge";
import { AnyObject } from "@/types";

/**
 * Advance status item
 */
type AdvanceStatusItem = {
  color: BadgeProps["color"];
  label: string;
};

export const ADVANCE_STATUS: AnyObject<AdvanceStatusItem> = {
  [AdvanceStatus.PENDING]: { color: "info", label: "advance.status_pending" },
  [AdvanceStatus.REJECTED]: { color: "error", label: "advance.status_rejected" },
  [AdvanceStatus.ACCEPTED]: { color: "teal", label: "advance.status_accepted" },
  [AdvanceStatus.PAYMENT]: { color: "success", label: "advance.status_paid" },
};
