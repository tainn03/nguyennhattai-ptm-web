"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { RejectOrderRequestModal } from "@/app/[locale]/orgs/[orgId]/order-requests/components";
import { Badge, Card, CardContent, CardHeader, DescriptionProperty2, Link } from "@/components/atoms";
import { Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { useIdParam, useOrderRequest } from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { AnyObject } from "@/types";
import { withOrg } from "@/utils/client";
import { ensureString } from "@/utils/string";

export default withOrg(
  ({ orgLink }) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();
    const { encryptedId } = useIdParam();
    const { orderRequest } = useOrderRequest();
    const [open, setOpen] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("driver.manage"), link: orgLink },
        { name: "Yêu cầu đặt hàng", link: `${orgLink}/order-requests` },
        { name: `${orderRequest.code}`, link: `${orgLink}/order-requests/${encryptedId}` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderRequest.code]);

    function formatAddress(address?: string) {
      return address || "Không có địa chỉ";
    }

    return (
      <>
        <PageHeader
          title={`Chi tiết yêu cầu đơn đặt hàng #${orderRequest.code}`}
          description="Trang hiển thị chi tiết của một yêu cầu đơn đặt hàng."
          actionHorizontal
          actionComponent={
            <>
              <Button type="button" color="error" onClick={() => setOpen(true)}>
                Từ chối
              </Button>
              <Button as={Link} color="primary" href={`${orgLink}/orders/new`}>
                Tiếp nhận
              </Button>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8 xl:flex-row">
          {/* Cột bên trái */}
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 2xl:grid-cols-6">
              {/* Thông tin chung về đơn hàng */}
              <Card className="col-span-full">
                <CardHeader title="Thông tin yêu cầu" />
                <CardContent>
                  <DescriptionProperty2 label="Mã yêu cầu">{orderRequest.code}</DescriptionProperty2>
                  <DescriptionProperty2 label="Khối lượng chở">
                    {ensureString(orderRequest.shipmentDetails)
                      .split(", ")
                      .map((item: string) => (
                        <Badge key={item} color="secondary" label={item} className="me-2" />
                      ))}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label="Ngày nhận">02/01/2025 11:00</DescriptionProperty2>
                  <DescriptionProperty2 label="Ngày giao">03/01/2025 12:24</DescriptionProperty2>
                  <DescriptionProperty2 label="Nơi nhận hàng">
                    {(orderRequest.pickupPoints ?? []).map((item: AnyObject) => item.address)[0]}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label="Nơi giao hàng">
                    {(orderRequest.deliveryPoints ?? []).map((item: AnyObject) => item.address)[0]}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label="Trạng thái">
                    <Badge
                      label={orderRequest.status}
                      color={orderRequest.status === "Đang chờ xác nhận" ? "primary" : "success"}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label="Ghi chú">{orderRequest.description}</DescriptionProperty2>
                </CardContent>
              </Card>

              {/* <LocationCard title="Nơi nhận" isLoading={isLoading} locations={orderRequest.pickupPoints} /> */}
              {/* <LocationCard title="Nơi giao" isLoading={isLoading} locations={orderRequest.deliveryPoints} /> */}

              {/* Danh sách hàng hóa (hoặc dịch vụ) */}
              {/* <ItemCard isLoading={isLoading} items={orderRequest.items} /> */}
            </div>
          </div>

          {/* Cột bên phải */}
          <div className="w-full sm:space-y-6 lg:max-w-xs lg:space-y-8 xl:max-w-sm">
            {/* Thông tin khách hàng */}
            <Card>
              <CardHeader title="Thông tin khách hàng" />
              <CardContent>
                <DescriptionProperty2 label="Mã khách hàng">{orderRequest.customer?.code}</DescriptionProperty2>
                <DescriptionProperty2 label="Tên khách hàng">{orderRequest.customer?.name}</DescriptionProperty2>
                <DescriptionProperty2 label="Số điện thoại">
                  <Link useDefaultStyle href={`tel:${orderRequest.customer?.phone}`}>
                    {orderRequest.customer?.phone}
                  </Link>
                </DescriptionProperty2>
                <DescriptionProperty2 label="Email">
                  <Link useDefaultStyle href={`mailto:${orderRequest.customer?.email}`}>
                    {orderRequest.customer?.email}
                  </Link>
                </DescriptionProperty2>
                <DescriptionProperty2 label="Địa chỉ">
                  {formatAddress(orderRequest.customer?.address)}
                </DescriptionProperty2>
                <DescriptionProperty2 label="Ghi chú">{orderRequest.customer?.note}</DescriptionProperty2>
              </CardContent>
            </Card>
            {/* Thông tin chi phí */}
            {/* <Card>
              <CardHeader title="Thông tin chi phí" />
              <CardContent>
                <DescriptionProperty2 label="Tạm tính (chưa thuế)">
                  <NumberLabel type="currency" value={orderRequest.costInfo?.subTotal} emptyLabel="Không có" />
                </DescriptionProperty2>
                <DescriptionProperty2 label="Thuế VAT">
                  <NumberLabel type="currency" value={orderRequest.costInfo?.tax} emptyLabel="Không có" />
                </DescriptionProperty2>
                <DescriptionProperty2 label="Phí vận chuyển">
                  <NumberLabel type="currency" value={orderRequest.costInfo?.shippingFee} emptyLabel="Không có" />
                </DescriptionProperty2>
                <DescriptionProperty2 label="Tổng cộng">
                  <NumberLabel type="currency" value={orderRequest.costInfo?.total} emptyLabel="Không có" />
                </DescriptionProperty2>
              </CardContent>
            </Card> */}
            {/* Thông tin hệ thống / audit trail */}
            <SystemInfoCard
              entity={{
                createdAt: new Date(orderRequest.createdAt),
                createdByUser: { detail: { firstName: "Văn A", lastName: "Nguyễn" } },
                updatedAt: new Date(orderRequest.updatedAt),
                updatedByUser: { detail: { firstName: "Văn B", lastName: "Trần" } },
              }}
            />
          </div>
        </div>

        <RejectOrderRequestModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  {
    resource: "order-request",
    action: "detail",
  }
);
