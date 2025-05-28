"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useState } from "react";
import { FiInfo as FiInfoIcon } from "react-icons/fi";

import {
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  InfoBox,
  ModalContent,
  ModalHeader,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { RoutePointCustomFieldsDisplay } from "@/components/organisms";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { getOrderById } from "@/services/client/order";
import { OrderInfo, RoutePointInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getDetailAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

export type RoutePointInfoModalProps = {
  orderId: number;
  onClose?: () => void;
  onOpen?: () => void;
};

const RoutePointInfoModal = ({ orderId, onClose, onOpen }: RoutePointInfoModalProps) => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [order, setOrder] = useState<Partial<OrderInfo>>();
  const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();

  const handleClose = useCallback(async () => {
    setIsOpenModal(false);
    onClose && onClose();
  }, [onClose]);

  const handleGetRoute = useCallback(async () => {
    setIsLoading(true);
    onOpen && onOpen();
    const order = await getOrderById(orderId);
    if (order && order.route) {
      setOrder(order);
    }
    setIsLoading(false);
  }, [onOpen, orderId]);

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsOpenModal(true);
      handleGetRoute();
    },
    [handleGetRoute]
  );

  const renderPoint = useCallback(
    (point: Partial<RoutePointInfo>, index: number) => {
      const meta = (order?.routeStatuses || []).find((item) => equalId(item.routePoint?.id, point.id))?.meta;
      const shouldDisplay = point.contactName || point.contactPhoneNumber || point.contactEmail || point.notes || meta;
      return (
        <Disclosure key={point.id} as={Fragment}>
          {({ open }) => (
            <Fragment>
              <Disclosure.Button
                as="tr"
                className={cn({
                  "bg-blue-50": open,
                  "hover:bg-gray-50": !open,
                })}
              >
                <TableCell className="px-3 py-3.5">
                  <span
                    className={cn("flex items-center pl-4", {
                      hidden: !shouldDisplay,
                    })}
                  >
                    {open ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    )}
                  </span>
                </TableCell>
                <TableCell align="left">{index + 1}</TableCell>
                <TableCell>
                  <InfoBox label={point.code} subLabel={point.name} emptyLabel={t("common.empty")} />
                </TableCell>
                <TableCell nowrap={false}>{getDetailAddress(point.address) || t("common.empty")}</TableCell>
              </Disclosure.Button>

              {shouldDisplay && (
                <Disclosure.Panel as="tr">
                  <TableCell colSpan={4} className="p-4" nowrap={false}>
                    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                      <div className="group col-span-full overflow-hidden rounded-lg px-4">
                        <DescriptionProperty2 label={t("order_new.route_tab.contact_name")}>
                          {point.contactName || t("common.empty")}
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order_new.route_tab.contact_phone")}>
                          {point.contactPhoneNumber || t("common.empty")}
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order_new.route_tab.contact_email")}>
                          {point.contactEmail || t("common.empty")}
                        </DescriptionProperty2>
                        <DescriptionProperty2 className="whitespace-pre" label={t("order_new.route_tab.notes")}>
                          {point.notes || t("common.empty")}
                        </DescriptionProperty2>
                        {order?.routeStatuses && <RoutePointCustomFieldsDisplay loading={isLoading} meta={meta} />}
                      </div>
                    </div>
                  </TableCell>
                </Disclosure.Panel>
              )}
            </Fragment>
          )}
        </Disclosure>
      );
    },
    [isLoading, order?.routeStatuses, t]
  );

  const renderCardContent = useCallback(
    (routes?: Partial<RoutePointInfo>[]) => (
      <CardContent padding={false}>
        <TableContainer className="!mt-0 p-0" variant="paper" inside>
          <Table dense={!isLoading}>
            <TableHead uppercase>
              <TableRow>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
                <TableCell action>{t("order_new.route_tab.index")}</TableCell>
                <TableCell className="w-[176px]">{t("components.route_point_info_modal.route_code")}</TableCell>
                <TableCell>{t("components.route_point_info_modal.address")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && <SkeletonTableRow rows={1} columns={4} />}
              {/* Order list */}
              {!isLoading && routes && routes.map((point, index) => renderPoint(point, index))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    ),
    [isLoading, renderPoint, t]
  );

  if (!orderId) {
    return null;
  }

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        <FiInfoIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
      </div>
      <Modal size="3xl" open={isOpenModal} onClose={handleClose} onDismiss={handleClose} showCloseButton>
        <ModalHeader title={t("components.route_point_info_modal.route_point_info")} />
        <ModalContent padding={false}>
          <Card className="!rounded-b-none">
            <CardHeader
              loading={isLoading}
              title={
                mergeDeliveryAndPickup
                  ? t("components.route_point_info_modal.pickup_delivery_points")
                  : t("components.route_point_info_modal.pickup_points")
              }
            />
            {renderCardContent(order?.route?.pickupPoints)}
          </Card>
          {!mergeDeliveryAndPickup && (
            <Card className="!rounded-t-none">
              <CardHeader loading={isLoading} title={t("components.route_point_info_modal.delivery_points")} />
              {renderCardContent(order?.route?.deliveryPoints)}
            </Card>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default RoutePointInfoModal;
