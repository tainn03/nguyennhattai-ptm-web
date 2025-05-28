import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DescriptionProperty2, NumberLabel } from "@/components/atoms";
import { useOrderState } from "@/redux/states";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";

type GeneralDispatchVehicleInfoProps = {
  loading?: boolean;
};

const GeneralDispatchVehicleInfo = ({ loading }: GeneralDispatchVehicleInfoProps) => {
  const t = useTranslations();
  const { order } = useOrderState();

  const { unitCode, weight, totalTripWeight, remainingWeight } = useMemo(
    () => getGeneralDispatchVehicleInfo({ ...order }),
    [order]
  );

  return (
    <ul role="list" className="border border-gray-200 shadow-sm sm:rounded-md">
      <li className="w-full">
        <div className="flex w-full items-center justify-between space-x-6 px-2">
          <div className="flex-1 truncate">
            <ul role="list" className="grid grid-cols-1 gap-x-4 xl:grid-cols-12 xl:divide-x xl:divide-gray-300">
              <li className="px-3 pt-3 xl:col-span-4 xl:p-3">
                <DescriptionProperty2
                  loading={loading}
                  label={t("order.vehicle_dispatch.vehicle_dispatch_merchandise_type")}
                >
                  {order?.merchandiseTypes?.length && (
                    <p className="whitespace-break-spaces">
                      {(order?.merchandiseTypes || []).map((item) => item.name).join(", ")}
                    </p>
                  )}
                </DescriptionProperty2>
                <DescriptionProperty2
                  loading={loading}
                  label={t("order.vehicle_dispatch.vehicle_dispatch_estimated_cost")}
                >
                  <NumberLabel value={order?.totalAmount} type="currency" emptyLabel={t("common.empty")} />
                </DescriptionProperty2>
              </li>

              <li className="px-3 xl:col-span-4 xl:p-3">
                <DescriptionProperty2
                  loading={loading}
                  label={t("order.vehicle_dispatch.vehicle_dispatch_driver_unit")}
                >
                  {unitCode}
                </DescriptionProperty2>
                <DescriptionProperty2 loading={loading} label={t("order.vehicle_dispatch.vehicle_dispatch_quantity")}>
                  <NumberLabel value={weight} emptyLabel="0" unit={unitCode} />
                </DescriptionProperty2>
              </li>

              <li className="px-3 pb-3 xl:col-span-4 xl:p-3">
                <DescriptionProperty2 loading={loading} label={t("order.vehicle_dispatch.vehicle_dispatch_shipped")}>
                  <NumberLabel value={totalTripWeight} emptyLabel="0" unit={unitCode} />
                </DescriptionProperty2>
                <DescriptionProperty2 loading={loading} label={t("order.vehicle_dispatch.vehicle_dispatch_remaining")}>
                  <NumberLabel value={remainingWeight} emptyLabel="0" unit={unitCode} />
                </DescriptionProperty2>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>
  );
};

export default GeneralDispatchVehicleInfo;
