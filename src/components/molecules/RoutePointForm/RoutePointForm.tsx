"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useRef, useState } from "react";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";

import {
  DescriptionProperty2,
  InfoBox,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { EmptyListSection, RoutePointListModal } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { RouteInputForm } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { getDetailAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

type RoutePointKey = "pickupPoints" | "deliveryPoints";

type DeliveryFormProps = {
  routePoint: RoutePointKey;
};

const RoutePointForm = ({ routePoint }: DeliveryFormProps) => {
  const t = useTranslations();
  const [openRoutePointListModal, setOpenRoutePointListModal] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const selectedRouteRef = useRef<RoutePointInputForm>();

  const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
  const { setFieldValue, values } = useFormikContext<RouteInputForm>();

  const handleCloseRoutePointListModal = useCallback(() => {
    setOpenRoutePointListModal(false);
  }, []);

  const handleOpenRoutePointListModal = useCallback(() => {
    setOpenRoutePointListModal(true);
  }, []);

  const handleRoutesChange = useCallback(
    (route: RouteInputForm) => {
      setFieldValue(routePoint, route[routePoint]);
      setOpenRoutePointListModal(false);
    },
    [routePoint, setFieldValue]
  );

  const handleOpenDeleteConfirm = useCallback(
    (item: RoutePointInputForm) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      selectedRouteRef.current = item;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  const handleCloseDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const handleDeleteRoutePoint = useCallback(() => {
    if (routePoint) {
      const newPoint = [...(values?.[routePoint] || [])];
      const index = newPoint.findIndex((item) => item.id === selectedRouteRef.current?.id);

      if (index > -1) {
        newPoint.splice(index, 1);
        newPoint.forEach((item, index) => {
          item.displayOrder = index + 1;
        });
        setFieldValue(routePoint, newPoint);
      }
    }

    setIsDeleteConfirmOpen(false);
  }, [routePoint, setFieldValue, values]);

  const handleMoveItem = useCallback(
    (currentIndex: number, newIndex: number) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (currentIndex < 0 || currentIndex > (values[routePoint] || []).length - 1 || currentIndex === newIndex) {
        return;
      }

      const newList = [...(values[routePoint] || [])];
      const [removedItem] = newList.splice(currentIndex, 1);

      newList.splice(newIndex, 0, removedItem);
      newList.forEach((item, idx) => {
        item.displayOrder = idx + 1;
      });

      setFieldValue(routePoint, newList);
    },
    [routePoint, setFieldValue, values]
  );

  return (
    <>
      <div className="col-span-full">
        <label className="relative block text-sm font-medium leading-6 text-gray-900">
          {mergeDeliveryAndPickup
            ? t("order_new.route_tab.pickup_delivery")
            : routePoint === "pickupPoints"
            ? t("order_new.route_tab.pickup")
            : t("order_new.route_tab.delivery")}
        </label>

        <TableContainer className="!mt-2" inside horizontalScroll variant="paper">
          <Table dense>
            <TableHead uppercase>
              <TableRow>
                <TableCell className="w-4">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
                <TableCell className="w-4">{t("order_new.route_tab.index")}</TableCell>
                <TableCell className="min-w-[10rem]">{t("order_new.route_tab.code_and_name")}</TableCell>
                <TableCell>{t("order_new.route_tab.address")}</TableCell>
                <TableCell className="w-fit">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-200 bg-white">
              <TableRow hover={false}>
                {(!values[routePoint] || values[routePoint]?.length === 0) && (
                  <TableCell colSpan={5}>
                    <EmptyListSection
                      onClick={handleOpenRoutePointListModal}
                      title={
                        routePoint === "pickupPoints"
                          ? t("customer.route.no_pickup_point_title")
                          : t("customer.route.no_delivery_point_title")
                      }
                      description={
                        routePoint === "pickupPoints"
                          ? t("customer.route.no_pickup_point_description")
                          : t("customer.route.no_delivery_point_description")
                      }
                    />
                  </TableCell>
                )}
              </TableRow>

              {(values[routePoint] || []).map((item: RoutePointInputForm, index) => (
                <Disclosure key={item.id} as={Fragment}>
                  {({ open }) => {
                    return (
                      <>
                        <Disclosure.Button
                          as="tr"
                          className={cn({
                            "bg-blue-50": open,
                            "hover:bg-gray-50": !open,
                          })}
                        >
                          <TableCell className="px-3 py-3.5">
                            <span className="flex items-center">
                              {open ? (
                                <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              )}
                            </span>
                          </TableCell>
                          <TableCell align="left">{index + 1}</TableCell>
                          <TableCell className="max-w-[10rem]">
                            <InfoBox
                              nowrap={false}
                              label={item.code}
                              subLabel={item.name}
                              emptyLabel={t("common.empty")}
                            />
                          </TableCell>
                          <TableCell nowrap={false} className="min-w-[18rem] break-normal">
                            {getDetailAddress(item.address) || t("common.empty")}
                          </TableCell>
                          <TableCell className="flex flex-nowrap items-center justify-end gap-x-2">
                            {index !== 0 && (
                              <button
                                data-tooltip-id="tooltip"
                                data-tooltip-content={t("driver_report.move_upward")}
                                type="button"
                                onClick={handleMoveItem(index, index - 1)}
                              >
                                <BiUpArrowAlt
                                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                            {index !== (values[routePoint] || []).length - 1 && (
                              <button
                                type="button"
                                data-tooltip-id="tooltip"
                                onClick={handleMoveItem(index, index + 1)}
                                data-tooltip-content={t("driver_report.move_downward")}
                              >
                                <BiDownArrowAlt
                                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                            {/* <button
                              type="button"
                              data-tooltip-id="tooltip"
                              data-tooltip-content={t("common.edit")}
                              onClick={handleOpenEditModal(index)}
                            >
                              <PencilSquareIcon
                                aria-hidden="true"
                                className="h-5 w-5 text-gray-400 hover:text-gray-500"
                              />
                            </button> */}
                            <button
                              type="button"
                              data-tooltip-id="tooltip"
                              data-tooltip-content={t("common.delete")}
                              onClick={handleOpenDeleteConfirm(item)}
                            >
                              <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                            </button>
                          </TableCell>
                        </Disclosure.Button>

                        <Disclosure.Panel as="tr">
                          <TableCell colSpan={5} className="p-4" nowrap={false}>
                            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                              <div className="group col-span-full overflow-hidden rounded-lg px-4">
                                <DescriptionProperty2 label={t("order_new.route_tab.contact_name")}>
                                  {item.contactName || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2 label={t("order_new.route_tab.contact_phone")}>
                                  {item.contactPhoneNumber || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2 label={t("order_new.route_tab.contact_email")}>
                                  {item.contactEmail || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2 label={t("order_new.route_tab.notes")}>
                                  {item.notes || t("common.empty")}
                                </DescriptionProperty2>
                              </div>
                            </div>
                          </TableCell>
                        </Disclosure.Panel>
                      </>
                    );
                  }}
                </Disclosure>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {(values[routePoint] || []).length > 0 && (
          <div className="mt-2">
            <Link
              href=""
              useDefaultStyle
              className="font-semibold"
              type="button"
              onClick={handleOpenRoutePointListModal}
            >
              <span aria-hidden="true">+ </span>
              {mergeDeliveryAndPickup
                ? t("order_new.route_tab.new_point")
                : routePoint === "pickupPoints"
                ? t("order_new.route_tab.new_casual_pickup")
                : t("order_new.route_tab.new_casual_delivery")}
            </Link>
          </div>
        )}
      </div>

      {/* Route point list modal */}
      <RoutePointListModal
        route={values}
        open={openRoutePointListModal}
        onClose={handleCloseRoutePointListModal}
        point={routePoint}
        onChange={handleRoutesChange}
      />

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", {
          name: selectedRouteRef.current?.code,
        })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirm}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleDeleteRoutePoint}
      />
    </>
  );
};

export default RoutePointForm;
