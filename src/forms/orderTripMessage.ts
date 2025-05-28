import { OrderTripMessageType } from "@prisma/client";
import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { OrderTripMessageInfo } from "@/types/strapi";
import { errorMaxLength } from "@/utils/yup";

export type OrderTripMessageInputForm = Partial<OrderTripMessageInfo> & {
  urlFileMessages?: string[];
  fileNames?: string[];
  tripId?: number;
};

export type MessageUploadFormModal = {
  orderCode: string;
  file: string[];
  userId: number;
  organizationId: number;
  tripId: number;
  tripCode: string;
  fullName?: string;
  driverUserId: number;
  orderDate: Date;
  type?: OrderTripMessageType;
  message?: string;
  longitude?: string;
  latitude?: string;
};

export const OrderTripMessageSchema = yup.object<YubObjectSchema<OrderTripMessageInputForm>>({
  message: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});

export type MessageUploadForm = {
  fileNames: string[];
  orderDate: string;
};
