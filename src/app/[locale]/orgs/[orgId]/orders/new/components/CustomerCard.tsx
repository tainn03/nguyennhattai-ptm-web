import { CustomerType } from "@prisma/client";
import { useFormikContext } from "formik";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/atoms";
import { OrderInputForm } from "@/forms/order";
import { CustomerInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";

import { CustomerTab, RouteTab } from ".";

export type CustomerCardProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId">;

export const CustomerCard = (props: CustomerCardProps) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>();
  const { values, setFieldValue } = useFormikContext<OrderInputForm>();

  const handleFixedCustomerChange = useCallback(
    (customer: CustomerInfo | undefined) => {
      setFieldValue("customerId", Number(customer?.id));
      setFieldValue("customerCode", customer?.code);
      setFieldValue("route.id", 0);
      setFieldValue("routeId", 0);
      setFieldValue("unit.id", customer?.defaultUnit?.id ? Number(customer?.defaultUnit?.id) : 0);
    },
    [setFieldValue]
  );

  useEffect(() => {
    if (values.customer?.type === CustomerType.FIXED && !!values.customerId) {
      setSelectedCustomerId(values.customerId);
    }
  }, [values.customer?.type, values.customerId]);

  return (
    <div className="lg:col-span-2">
      <Card allowOverflow className="">
        <CustomerTab onFixedCustomerChange={handleFixedCustomerChange} {...props} />
        <RouteTab selectedCustomerId={selectedCustomerId} {...props} />
      </Card>
    </div>
  );
};

export default CustomerCard;
