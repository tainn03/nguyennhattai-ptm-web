/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElementType, JSXElementConstructor } from "react";

import { LocaleType } from "./locale";

/**
 * Generic type representing any value.
 * Use this type with caution as it disables type safety.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyType = any;

/**
 * DefaultReactProps for React components that can receive children
 */
export type DefaultReactProps = {
  children: React.ReactNode;
  params?: AnyObject;
};

export type GenerateMetadataProps = {
  params: {
    locale: LocaleType;
  };
};

/**
 * Generic YubObjectSchema type for defining objects with optional properties.
 */
export type YubObjectSchema<T> = {
  [P in keyof T]?: T[P] | any;
};

/**
 * Generic AnyObject type for representing objects with string keys.
 */
export type AnyObject<T = any> = {
  [key: string]: T;
};

/**
 * Generic type representing a nullable value.
 */
export type Nullable<T> = T | null | undefined;

/**
 * Makes all properties in T optional and nullable
 */
export type NullablePartial<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

/**
 * React tag
 */
export type ReactTag = keyof JSX.IntrinsicElements | JSXElementConstructor<any>;

/**
 * Breadcrumb element
 */
export type BreadcrumbItem = {
  name: string;
  link: string;
  icon?: ElementType;
};

/**
 * Notification
 */
export type Notification = {
  id?: string;
  color: "info" | "success" | "warning" | "error";
  title?: string;
  message?: string;
  duration?: number;
};

export enum ErrorType {
  NOT_FOUND = "ERROR_NOT_FOUND",
  EXISTED = "ERROR_EXISTED",
  EXCLUSIVE = "ERROR_EXCLUSIVE",
  UNKNOWN = "ERROR_UNKNOWN",
}
