import { RouteInfo, RoutePointInfo, UnitOfMeasureInfo, ZoneInfo } from "@/types/strapi";

export type ImportedRoutePoint = Pick<RoutePointInfo, "id" | "code" | "name" | "address">;

export type ImportedRoute = Pick<RouteInfo, "id" | "code" | "name">;

export type ImportedUnitOfMeasure = Pick<UnitOfMeasureInfo, "id" | "code" | "name">;

export type ImportedZone = Pick<ZoneInfo, "id" | "name">;

export type Product = {
  id: string;
  name: string;
  quantity: number;
  totalCbm?: number;
  unitOfMeasure?: string;
};

export type ImportedOrder = {
  rawPointCode: string;
  rawPointName: string;
  pickupPoint: ImportedRoutePoint | null;
  deliveryPoint: ImportedRoutePoint | null;
  rawPointNotes: string;
  rawPointAddress: string;
  route: ImportedRoute | null;
  rawUnitOfMeasure: string;
  unitOfMeasure: ImportedUnitOfMeasure | null;
  quantity: number;
  cbm: number;
  rawZoneLv1: string;
  zoneLv1: ImportedZone | null;
  rawZoneLv2: string;
  zoneLv2: ImportedZone | null;
  products: Product[];
  notes: string;
  pickupTimeNotes: string;
  deliveryTimeNotes: string;
  isError?: boolean;
  errorMessage?: string;
};
