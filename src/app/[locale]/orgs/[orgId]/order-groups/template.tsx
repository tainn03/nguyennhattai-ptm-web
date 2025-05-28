"use client";

import { useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";

import { Loading } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { Breadcrumb, Header, Sidebar } from "@/components/organisms";
import { useAuth, useCustomerOptions, useUnitOfMeasureOptions, useVehicleTypeOptions, useZoneOptions } from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import { orderGroupAtom } from "@/states";
import { DefaultReactProps } from "@/types";
import { CustomerInfo, UnitOfMeasureInfo, VehicleTypeInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

export default function Template({ children }: DefaultReactProps) {
  const { clearBreadcrumb } = useBreadcrumb();
  const { breadcrumbItems } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { orgId } = useAuth();
  const setOrderGroupState = useSetAtom(orderGroupAtom);

  const { customers, isLoading: isCustomersLoading } = useCustomerOptions({ organizationId: orgId });
  const { zones, isLoading: isZonesLoading } = useZoneOptions({ organizationId: orgId });
  const { unitOfMeasures, isLoading: isUnitOfMeasuresLoading } = useUnitOfMeasureOptions({ organizationId: orgId });
  const { vehicleTypes, isLoading: isVehicleTypesLoading } = useVehicleTypeOptions({ organizationId: orgId });

  // Customer options
  const customerOptions: ComboboxItem[] = useMemo(
    () =>
      customers.map((item: CustomerInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })),
    [customers]
  );

  /**
   * Zone options for the combobox
   */
  const zoneOptions: ComboboxItem[] = useMemo(
    () =>
      zones.map((zone) => ({
        value: ensureString(zone.id),
        label: ensureString(zone.name),
        subLabel: ensureString(zone.parent?.name),
      })),
    [zones]
  );

  // Unit of measure options
  const unitOfMeasuresOptions: ComboboxItem[] = useMemo(
    () =>
      unitOfMeasures.map((item: UnitOfMeasureInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })),
    [unitOfMeasures]
  );

  // Vehicle type options
  const vehicleTypeOptions: ComboboxItem[] = useMemo(
    () => vehicleTypes.map((item: VehicleTypeInfo) => ({ value: ensureString(item.id), label: item.name ?? "" })),
    [vehicleTypes]
  );

  useEffect(() => {
    setOrderGroupState((prev) => ({
      ...prev,
      customerOptions,
      zoneOptions,
      unitOfMeasuresOptions,
      vehicleTypeOptions,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleTypeOptions, unitOfMeasuresOptions, zoneOptions, customerOptions]);

  useEffect(() => {
    return () => {
      clearBreadcrumb();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Sidebar scope="organization" sidebarOpen={sidebarOpen} onSidebarOpen={setSidebarOpen} />

      <div className="transition-all xl:pl-72">
        <Header onSidebarOpen={setSidebarOpen} />
        <Breadcrumb fullWidth items={breadcrumbItems} />

        <main className="py-10">
          <div className="mx-auto sm:px-6 lg:px-8">
            {isUnitOfMeasuresLoading || isVehicleTypesLoading || isZonesLoading || isCustomersLoading ? (
              <Loading />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
