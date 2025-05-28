"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, useEffect } from "react";

import {
  DateTimeLabel,
  Link,
  ModalContent,
  ModalHeader,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, EmptyListSection, Modal } from "@/components/molecules";
import { OrderTab } from "@/constants/order";
import { useAuth, useOrderTripStatus, useOrgSettingExtendedStorage } from "@/hooks";
import { useDispatch } from "@/redux/actions";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { getFullName } from "@/utils/auth";
import { ensureString } from "@/utils/string";

import OrderTripStatusProcess from "./OrderTripStatusProcess";

const DATE_PLACEHOLDER = "--/--/----";
const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

type OrderTripStatusModalProps = {
  code?: string;
  open: boolean;
  onClose: () => void;
};

const OrderTripStatusModal = ({ code, open, onClose }: OrderTripStatusModalProps) => {
  const t = useTranslations();
  const dispatch = useDispatch();
  const { orgId, orgLink } = useAuth();
  const { haveNewNotification } = useNotificationState();
  const { order, isLoading, mutate } = useOrderTripStatus({ organizationId: orgId, code });
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  useEffect(() => {
    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  return (
    <Modal open={open} onClose={onClose} size="7xl" showCloseButton onDismiss={onClose}>
      <ModalHeader title={t("order_plan.code", { code })} />
      <ModalContent padding={false}>
        <TableContainer
          verticalScroll
          stickyHeader
          autoHeight
          fullHeight
          className="!mt-0 py-0 [&>div>div>div]:rounded-none"
          variant="paper"
        >
          <Table dense={!isLoading}>
            <TableHead uppercase>
              <TableRow>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
                <TableCell>{t("order_plan.plan_list_modal.trips.code")}</TableCell>
                <TableCell>{t("order_plan.plan_list_modal.trips.vehicle")}</TableCell>
                <TableCell>{t("order_plan.plan_list_modal.trips.driver")}</TableCell>
                <TableCell>{t("order_plan.plan_list_modal.trips.weight")}</TableCell>
                <TableCell>{t("order_plan.plan_list_modal.trips.pickup_delivery_date")}</TableCell>
                <Authorization resource="bill-of-lading" action="find">
                  <TableCell>{t("order_plan.plan_list_modal.trips.bill_of_lading")}</TableCell>
                </Authorization>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && (order?.trips || []).length === 0 && <SkeletonTableRow rows={10} columns={7} />}

              {/* Empty data */}
              {!isLoading && (order?.trips || []).length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={7} className="px-6 lg:px-8">
                    <EmptyListSection
                      title={t("order.vehicle_dispatch.vehicle_dispatch_not_found_title")}
                      description={t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {(order?.trips || []).map((item) => (
                <Disclosure key={item.id} as={Fragment} defaultOpen={true}>
                  {({ open }) => (
                    <>
                      <TableRow hover={!open}>
                        {/* Action */}
                        <Disclosure.Button
                          as="td"
                          className={clsx("relative w-10 min-w-[40px] !pl-2", {
                            "bg-blue-50": open,
                          })}
                        >
                          {open ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          )}
                        </Disclosure.Button>

                        {/* Trip code */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <Authorization
                            resource="order-trip"
                            action="detail"
                            fallbackComponent={<span className="!font-semibold">{item.code}</span>}
                          >
                            <Link
                              useDefaultStyle
                              href={`${orgLink}/orders/${code}?tab=${OrderTab.DISPATCH_VEHICLE}`}
                              className="!font-semibold"
                            >
                              {item.code}
                            </Link>
                          </Authorization>
                        </Disclosure.Button>

                        {/* Vehicle */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <div className="flex flex-col text-left">
                            <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              {item.vehicle?.vehicleNumber}
                            </p>
                            {(item.vehicle?.idNumber || item.vehicle?.model) && (
                              <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                {item.vehicle?.idNumber || item.vehicle?.model}
                              </div>
                            )}
                          </div>
                        </Disclosure.Button>

                        {/* Driver */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <div className="flex flex-col text-left">
                            <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              {getFullName(item.driver?.firstName, item.driver?.lastName)}
                            </p>
                            {(item.driver?.phoneNumber || item.driver?.email) && (
                              <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                {item.driver?.phoneNumber || item.driver?.email}
                              </div>
                            )}
                          </div>
                        </Disclosure.Button>

                        {/* Weight */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <NumberLabel
                            value={Number(item.weight)}
                            emptyLabel={t("common.empty")}
                            unit={order?.unit?.code}
                          />
                        </Disclosure.Button>

                        {/* Pickup / Delivery date */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <DateTimeLabel
                            value={ensureString(item.pickupDate)}
                            type={organizationOrderRelatedDateFormat}
                            emptyLabel={DATE_PLACEHOLDER}
                          />
                          <br />
                          <DateTimeLabel
                            value={ensureString(item.deliveryDate)}
                            type={organizationOrderRelatedDateFormat}
                            emptyLabel={DATE_PLACEHOLDER}
                          />
                        </Disclosure.Button>

                        {/* Bill of lading */}
                        <Authorization resource="bill-of-lading" action="find">
                          <Disclosure.Button
                            as="td"
                            className={clsx(styleTableCell, {
                              "bg-blue-50": open,
                            })}
                          >
                            {item.billOfLading || t("common.empty")}
                          </Disclosure.Button>
                        </Authorization>
                      </TableRow>

                      {/* Process */}
                      <Disclosure.Panel as="tr">
                        <TableCell colSpan={7} className="overflow-x-auto !pl-4">
                          <OrderTripStatusProcess orderTrip={item} />
                        </TableCell>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>
    </Modal>
  );
};

export default OrderTripStatusModal;
