import { CustomerType, RouteType } from "@prisma/client";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CardContent, CardHeader } from "@/components/atoms";
import { Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { OrderInputForm } from "@/forms/order";
import { OrgPageProps } from "@/utils/client";

import { FixedRoutePanel, NonFixedRoutePanel } from ".";

export type RouteTabProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId"> & {
  selectedCustomerId?: number;
};

export const RouteTab = ({ ...otherProps }: RouteTabProps) => {
  const t = useTranslations();
  const { values, setFieldValue } = useFormikContext<OrderInputForm>();

  const routeTypes: TabItem[] = [
    { label: t("order_new.route_tab.fixed"), value: RouteType.FIXED },
    { label: t("order_new.route_tab.casual"), value: RouteType.NON_FIXED },
  ];

  const [selectedRouteTypeTab, setSelectedRouteTypeTab] = useState(routeTypes[0].value);

  useEffect(() => {
    if (values.customer?.type === CustomerType.CASUAL) {
      setSelectedRouteTypeTab(RouteType.NON_FIXED);
      setFieldValue("route.type", RouteType.NON_FIXED);
    } else {
      if (values.route?.type) {
        setSelectedRouteTypeTab(values.route.type);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.customer?.type, values.route?.type]);

  const handleRouteTypeTabChange = useCallback(
    (tab: string) => {
      setSelectedRouteTypeTab(tab);
      setFieldValue("route.type", tab);
    },
    [setFieldValue]
  );

  return (
    <>
      <CardHeader title={t("order_new.route_tab.title")} />
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
        {values.customer?.type === CustomerType.FIXED && (
          <Tabs
            items={routeTypes}
            selectedTab={selectedRouteTypeTab}
            onTabChange={handleRouteTypeTabChange}
            className="col-span-full"
          />
        )}

        <FixedRoutePanel type={routeTypes[0]} selectedTab={selectedRouteTypeTab} {...otherProps} />
        <NonFixedRoutePanel type={routeTypes[1]} selectedTab={selectedRouteTypeTab} {...otherProps} />
      </CardContent>
    </>
  );
};

export default RouteTab;
