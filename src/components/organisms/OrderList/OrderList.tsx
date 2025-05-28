import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { SkeletonTableRow, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection, OrderListItem } from "@/components/molecules";
import { NAM_PHONG_ORGANIZATION_ID } from "@/constants/organization";
import { OrderInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";

export type OrderListProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId"> & {
  orders: OrderInfo[];
  isLoading: boolean;
  onCanceled?: (order: OrderInfo) => void;
  onDeleted?: (order: OrderInfo) => void;
};

const OrderList = ({
  orders,
  isLoading,
  orgId,
  orgLink,
  onCanceled,
  onDeleted,
  userId,
  ...otherProps
}: OrderListProps) => {
  const t = useTranslations();

  const isNamPhongOrg = useMemo(() => equalId(orgId, NAM_PHONG_ORGANIZATION_ID), [orgId]);

  return (
    <TableContainer fullHeight horizontalScroll verticalScroll autoHeight allowFullscreen>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell action>
              <span className="sr-only">Expanded/Collapsed</span>
            </TableCell>
            <TableCell>{t("order.list_item.code")}</TableCell>
            {isNamPhongOrg && (
              <>
                <TableCell>{t("order.nam_phong.bill_no")}</TableCell>
                <TableCell>{t("order.nam_phong.cont_no")}</TableCell>
              </>
            )}
            <TableCell>{t("order.list_item.customer")}</TableCell>
            <TableCell className="hidden md:table-cell">{t("order.list_item.phone_number")}</TableCell>
            <TableCell>{t("order.list_item.order_date")}</TableCell>
            <TableCell>{t("order.list_item.total_amount")}</TableCell>
            <TableCell>{t("order.list_item.status")}</TableCell>
            <TableCell
              className={clsx({
                "hidden xl:table-cell": !isNamPhongOrg,
                hidden: isNamPhongOrg,
              })}
            >
              {t("order.list_item.dispatcher")}
            </TableCell>
            <TableCell
              className={clsx({
                "hidden 2xl:table-cell": !isNamPhongOrg,
                hidden: isNamPhongOrg,
              })}
            >
              {t("common.created_info")}
            </TableCell>
            <TableCell action>
              <span className="sr-only">{t("order.list_item.action")}</span>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Loading skeleton */}
          {isLoading && orders.length === 0 && <SkeletonTableRow rows={10} columns={10} />}

          {/* Empty data */}
          {!isLoading && orders.length === 0 && (
            <TableRow hover={false} className="mx-auto max-w-lg">
              <TableCell colSpan={10} className="px-6 lg:px-8">
                <EmptyListSection />
              </TableCell>
            </TableRow>
          )}

          {orders.map((order, index) => (
            <OrderListItem
              actionPlacement={index < 3 ? "end" : index >= orders.length - 3 ? "start" : "center"}
              key={order.code}
              order={order}
              orgId={orgId}
              orgLink={orgLink}
              {...otherProps}
              onDeleted={onDeleted}
              onCanceled={onCanceled}
              userId={userId}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderList;
