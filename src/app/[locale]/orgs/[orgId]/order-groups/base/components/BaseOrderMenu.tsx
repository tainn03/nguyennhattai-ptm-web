"use client";
import round from "lodash/round";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { BsCalendar3, BsTrash } from "react-icons/bs";

import { VisibleWithSetting } from "@/components/atoms";
import { Button } from "@/components/molecules";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { OrderInfo } from "@/types/strapi";
import { formatNumber } from "@/utils/number";

type BaseOrderMenuProps = {
  selectedOrders: OrderInfo[];
  onPlan: () => void;
  onDelete?: () => void;
};

export default function BaseOrderMenu({ selectedOrders, onPlan, onDelete }: BaseOrderMenuProps) {
  const t = useTranslations();
  const { enableCbmField } = useOrgSettingExtendedStorage();

  const totalQuantity = useMemo(() => {
    const groupedQuantities = selectedOrders.reduce(
      (acc, order) => {
        if (order.unit?.code) {
          if (!acc[order.unit?.code]) {
            acc[order.unit?.code] = 0;
          }
          acc[order.unit?.code] += order.weight ?? 0;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(groupedQuantities)
      .map(([unit, quantity]) => `${formatNumber(quantity)} ${unit}`)
      .join(", ");
  }, [selectedOrders]);

  const totalCbm = useMemo(() => {
    if (!enableCbmField) return null;
    return selectedOrders.reduce((acc, order) => {
      if (order.cbm) {
        acc += order.cbm;
      }
      return acc;
    }, 0);
  }, [selectedOrders, enableCbmField]);

  if (selectedOrders.length === 0) return null;

  return (
    <div className="mt-2 w-full rounded-md border border-x-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full flex-col items-start gap-y-2">
        <div className="flex w-full items-center justify-between rounded-t-md border-b border-gray-200 bg-gray-50 p-4 text-sm font-semibold">
          {t("order_group.order_menu.statistics")}
        </div>
        <div className="w-full space-y-4 p-4">
          <div className="text-sm text-gray-600">
            {t("order_group.order_menu.total")}: <span className="font-semibold">{totalQuantity}</span>
          </div>

          <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
            <div className="text-sm text-gray-600">
              {t("order_group.order_menu.cbm")}:{" "}
              <span className="font-semibold">{totalCbm ? round(totalCbm, 2) : t("common.empty")}</span>
            </div>
          </VisibleWithSetting>

          <div className="flex flex-col gap-y-2 text-sm text-gray-600">
            <label className="text-sm text-gray-600">{t("order_group.order_menu.customer")}:</label>
            <div className="flex flex-col gap-y-2">
              {Array.from(new Set(selectedOrders.map((c) => c.customer.name))).map((name) => (
                <div key={name} className="truncate font-semibold">
                  - {name}
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col items-end gap-4">
            <Button className="flex w-full items-center gap-2" onClick={onPlan}>
              <BsCalendar3 className="h-4 w-4" />
              {t("order_group.order_menu.plan")}
            </Button>

            <Button color="error" variant="outlined" className="flex w-full items-center gap-2" onClick={onDelete}>
              <BsTrash className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
