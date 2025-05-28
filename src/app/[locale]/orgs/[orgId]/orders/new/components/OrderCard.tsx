import { memo } from "react";

import { MerchandisePanel, OrderPanel } from "@/app/[locale]/orgs/[orgId]/orders/new/components";
import { Card } from "@/components/atoms";
import { DefaultReactProps } from "@/types";

type OrderCardProps = Partial<DefaultReactProps>;

export const OrderCard = ({ children }: OrderCardProps) => {
  return (
    <div className="lg:col-span-3">
      <Card>
        <OrderPanel />
        <MerchandisePanel />
        {children}
      </Card>
    </div>
  );
};

export default memo(OrderCard);
