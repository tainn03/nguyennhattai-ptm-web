import { OrderGridItem } from "@/components/molecules";
import { useUserGuide } from "@/hooks";
import { OrderInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { cn } from "@/utils/twcn";

export type OrderGridProps = OrgPageProps & {
  orderList: OrderInfo[];
  onCanceled?: (order: OrderInfo) => void;
  onDeleted?: (order: OrderInfo) => void;
};

const OrderGrid = ({ orderList, onCanceled, onDeleted, ...otherProps }: OrderGridProps) => {
  const { open } = useUserGuide();
  return (
    <div className="min-h-[50vh]">
      <ul
        role="list"
        className={cn("grid grid-cols-1 gap-6", {
          "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4": !open,
          "sm:grid-cols-2 2xl:grid-cols-3": open,
        })}
      >
        {orderList.map((item) => (
          <OrderGridItem key={item.id} order={item} onDeleted={onDeleted} onCanceled={onCanceled} {...otherProps} />
        ))}
      </ul>
    </div>
  );
};

export default OrderGrid;
