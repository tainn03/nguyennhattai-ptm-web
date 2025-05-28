import * as yup from "yup";

import { YubObjectSchema } from "@/types";
import { MetaObject } from "@/types/customField";
import { RoutePointInfo } from "@/types/strapi";
import { errorFormat, errorMaxLength, errorRequired } from "@/utils/yup";

export type RoutePointInputForm = MetaObject<RoutePointInfo>;

export type RoutePointTimeRange = {
  start: string;
  end: string;
};

export const routePointInputValidationSchema = yup.object<YubObjectSchema<RoutePointInfo>>({
  code: yup.string().trim().required(errorRequired("route_point.code")).max(64, errorMaxLength(64)),
  name: yup.string().trim().required(errorRequired("route_point.name")).max(255, errorMaxLength(255)),
  description: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  notes: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  contactName: yup.string().nullable().trim().max(255, errorMaxLength(255)),
  contactPhoneNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  contactEmail: yup
    .string()
    .trim()
    .nullable()
    .email(errorFormat("customer.route.contact_email"))
    .max(255, errorMaxLength(255)),
  displayOrder: yup.number().nullable().integer(errorFormat("order.route_point_modal.display_order")).min(0),
  requestedNote: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});

export const routePointInputFormSchema = yup.object<YubObjectSchema<RoutePointInputForm>>({
  contactName: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  contactEmail: yup
    .string()
    .trim()
    .nullable()
    .email(errorFormat("customer.route.contact_email"))
    .max(255, errorMaxLength(255)),
  contactPhoneNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  notes: yup.string().trim().nullable().max(500, errorMaxLength(500)),
});

export const routePointModalSchema = yup.object<YubObjectSchema<RoutePointInputForm>>({
  code: yup
    .string()
    .trim()
    .nullable()
    .max(64, errorMaxLength(64))
    .required(errorRequired("order.route_point_modal.code")),
  name: yup.string().trim().nullable().max(255, errorMaxLength(255)),
  notes: yup.string().trim().nullable().max(500, errorMaxLength(500)),
  contactName: yup.string().nullable().trim().max(255, errorMaxLength(255)),
  contactPhoneNumber: yup.string().trim().nullable().max(20, errorMaxLength(20)),
  contactEmail: yup
    .string()
    .trim()
    .nullable()
    .email(errorFormat("customer.route.contact_email"))
    .max(255, errorMaxLength(255)),
  displayOrder: yup.number().nullable().integer(errorFormat("order.route_point_modal.display_order")).min(0),
});
