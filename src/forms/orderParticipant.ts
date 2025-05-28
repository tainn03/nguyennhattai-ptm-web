import { OrderParticipantInfo, OrganizationMemberInfo } from "@/types/strapi";

export type OrderParticipantInputForm = Partial<OrderParticipantInfo> & {
  orderParticipantOrder?: number;
  orgMember?: OrganizationMemberInfo;
  fullName?: string;
  orderCode?: string;
};

export type UpdateOrderParticipantInputForm = {
  orderParticipant?: OrderParticipantInputForm;
  lastUpdatedAt: Date | string;
};
