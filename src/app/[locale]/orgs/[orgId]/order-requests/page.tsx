"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import addDays from "date-fns/addDays";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FaRoute as FaRouteIcon } from "react-icons/fa";

import { Badge, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { BadgeProps } from "@/components/atoms/Badge/Badge";
import { Button, Combobox, DatePicker, PageHeader, Pagination, ProfileInfo, TextField } from "@/components/molecules";
import { customerComboboxItems, orderRequestStatuses } from "@/constants/prototype";
import { useIdParam, useOrderRequests } from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { AnyObject } from "@/types";
import { withOrg } from "@/utils/client";

import { OrderRequestAction, OrderRequestSummary, RejectOrderRequestModal } from "./components";

export default withOrg(
  ({ orgLink }) => {
    const t = useTranslations();
    const router = useRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const { encryptId } = useIdParam();
    const [open, setOpen] = useState(false);

    const { orderRequests } = useOrderRequests();

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("driver.manage"), link: orgLink },
        { name: "Yêu cầu đặt hàng", link: `${orgLink}/order-requests` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        <PageHeader title="Yêu cầu đặt hàng">
          <OrderRequestSummary />

          <div className="grid grid-cols-1 place-content-end gap-4 sm:grid-cols-12">
            <div className="col-span-full md:col-span-4 lg:col-span-5 xl:col-span-3">
              <TextField label="Tìm kiếm" icon={MagnifyingGlassIcon} placeholder="Nhập từ khóa" />
            </div>
            <div className="col-span-full md:col-span-4 lg:col-span-4 xl:col-span-2">
              <Combobox label="Khách hàng" items={customerComboboxItems} placeholder="Chọn khách hàng" />
            </div>
            <div className="col-span-full md:col-span-4 lg:col-span-3 xl:col-span-2">
              <Combobox label="Trạng thái" items={orderRequestStatuses} placeholder="Chọn trạng thái" />
            </div>
            <div className="col-span-full md:col-span-4 lg:col-span-4 xl:col-span-2">
              <DatePicker
                label="Ngày nhận hàng"
                placeholder="Chọn ngày"
                selected={new Date()}
                onChange={(date) => console.log(date)}
              />
            </div>
            <div className="col-span-full md:col-span-4 lg:col-span-4 xl:col-span-2">
              <DatePicker
                label="Ngày giao hàng"
                selected={addDays(new Date(), 7)}
                placeholder="Chọn ngày"
                onChange={(date) => console.log(date)}
              />
            </div>
            <div className="col-span-full flex items-end justify-end md:col-span-2 md:justify-start xl:col-span-1 xl:justify-end">
              <Button onClick={() => console.log("Filter")}>Tìm kiếm</Button>
            </div>
          </div>
        </PageHeader>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Khách hàng</TableCell>
                <TableCell>Khối lượng chở</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Ngày nhận / giao</TableCell>
                <TableCell>Nơi nhận</TableCell>
                <TableCell>Nơi giao</TableCell>
                <TableCell action>
                  <span className="sr-only">Actions</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderRequests.map((request, index) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <ProfileInfo
                      href={`${orgLink}/order-requests/${encryptId(request.id)}`}
                      user={{
                        detail: { lastName: "Vantage Logistics", firstName: "Corporation" },
                      }}
                      description={`${request.forwarder}`.toUpperCase().split(" ").join("-")}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell nowrap={false} className="max-w-md space-y-2">
                    {request.shipmentDetails.split(", ").map((item: string) => (
                      <Badge key={item} color="secondary" label={item} className="me-2" />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge color={request.statusColor as BadgeProps["color"]} label={request.status} />
                  </TableCell>
                  <TableCell>
                    {request.pickupDate}
                    <br />
                    {request.deliveryDate}
                  </TableCell>
                  <TableCell nowrap={false} className="min-w-[20rem] max-w-md">
                    <div className="mx-auto max-w-lg">
                      <div className="space-y-2">
                        {(request.pickupPoints || []).map((pickupPoint: AnyObject, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <FaRouteIcon className="me-2 inline-block h-3 w-3 flex-shrink-0 text-teal-600" />
                            <span className="text-xs text-gray-500">{pickupPoint.address}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell nowrap={false} className="min-w-[20rem] max-w-md">
                    <div className="mx-auto max-w-lg">
                      <div className="space-y-2">
                        {(request.deliveryPoints || []).map((deliveryPoint: AnyObject, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <FaRouteIcon className="me-2 inline-block h-3 w-3 flex-shrink-0 text-teal-600" />
                            <span className="text-xs text-gray-500">{deliveryPoint.address}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell action>
                    <OrderRequestAction
                      actionPlacement={
                        orderRequests.length >= 3 &&
                        (orderRequests.length - 1 === index || orderRequests.length - 2 === index)
                          ? "start"
                          : "end"
                      }
                      onTransform={
                        request.status === "Đang chờ xác nhận" ? () => router.push(`${orgLink}/orders/new`) : undefined
                      }
                      onReject={request.status === "Đang chờ xác nhận" ? () => setOpen(true) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="mt-4 px-4">
          <Pagination records={100} />
        </div>

        <RejectOrderRequestModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  {
    resource: "order",
    action: "find",
  }
);
