"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ClassValue } from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, MouseEvent, useCallback, useRef, useState } from "react";

import {
  DescriptionProperty2,
  InfoBox,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { EmptyListSection } from "@/components/molecules";
import { RoutePointCustomFieldsDisplay } from "@/components/organisms";
import { ConfirmModal } from "@/components/organisms";
import { RoutePointType } from "@/forms/route";
import { OrderRouteStatusInfo, RoutePointInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getDetailAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

type RoutePointTableProps = {
  type: RoutePointType;
  loading?: boolean;
  label?: string;
  required?: boolean;
  routePoints?: Partial<RoutePointInfo>[];
  routeStatuses?: Partial<OrderRouteStatusInfo>[];
  canCreate?: boolean;
  className?: ClassValue;
  labelStyles?: ClassValue;
  onCreate?: (routePointType: RoutePointType) => void;
  onEdit?: (
    routePointType: RoutePointType,
    routePoint?: Partial<RoutePointInfo>,
    routePointStatus?: Partial<OrderRouteStatusInfo>
  ) => void;
  onDelete?: (routePointType: RoutePointType, routePoint: Partial<RoutePointInfo>) => void;
};

const RoutePointTable = ({
  label,
  loading,
  required,
  routePoints = [],
  routeStatuses = [],
  type,
  canCreate,
  className,
  labelStyles,
  onCreate,
  onEdit,
  onDelete,
}: RoutePointTableProps) => {
  const t = useTranslations();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const pointRef = useRef<Partial<RoutePointInfo>>();

  const handleEdit = useCallback(
    (routePoint?: Partial<RoutePointInfo>, status?: Partial<OrderRouteStatusInfo>) =>
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onEdit && onEdit(type, routePoint, status);
      },
    [onEdit, type]
  );

  const handleOpenDeleteConfirm = useCallback(
    (point: Partial<RoutePointInfo>) => (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      pointRef.current = point;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  const handleCloseDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
    pointRef.current = undefined;
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (onDelete && pointRef.current) {
      onDelete(type, pointRef.current);
    }
    handleCloseDeleteConfirm();
  }, [handleCloseDeleteConfirm, onDelete, type]);

  const handleCreate = useCallback(() => {
    onCreate && onCreate(type);
  }, [onCreate, type]);

  const formattedStringDisplay = useCallback(
    (items: Array<string | undefined>) => {
      const validItems = items.filter((item) => item !== null && item !== undefined && item.trim() !== "");
      if (validItems.length === 0) {
        return <>{t("common.empty")}</>;
      }
      return validItems.map((item, index) => (
        <Fragment key={index}>
          {validItems.length > 1 && index === 0 ? <span className="font-semibold">{item}</span> : <span>{item}</span>}
          {index < validItems.length - 1 && ", "}
        </Fragment>
      ));
    },
    [t]
  );

  return (
    <>
      {label && (
        <label className={cn("relative block text-sm font-medium leading-6 text-gray-900", labelStyles)}>
          {label}
          {required && <span className="text-red-600"> (*)</span>}
        </label>
      )}
      <TableContainer className={cn("-mx-4 !mt-2 sm:-mx-6", className)} variant="paper" inside>
        <Table dense={!loading}>
          <TableHead uppercase>
            <TableRow>
              <TableCell action className="!px-0">
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
              <TableCell>{t("order_new.route_tab.address")}</TableCell>
              <TableCell className="hidden 2xl:table-cell 2xl:w-44">{t("order_new.route_tab.contact_info")}</TableCell>
              <TableCell action>
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && routePoints.length === 0 && <SkeletonTableRow rows={5} columns={4} />}
            {!loading && routePoints.length === 0 && (
              <TableRow hover={false}>
                <TableCell colSpan={4}>
                  {onCreate ? (
                    <EmptyListSection
                      onClick={canCreate ? handleCreate : undefined}
                      description={
                        canCreate ? (
                          <>
                            {t.rich("order_new.route_tab.casual_selected_customer_description", {
                              strong: (chunks) => <strong>{chunks}</strong>,
                            })}
                          </>
                        ) : (
                          <>{t("order_new.route_tab.casual_no_customer_description")}</>
                        )
                      }
                    />
                  ) : (
                    <EmptyListSection description={t("order_new.route_tab.empty_list_message")} />
                  )}
                </TableCell>
              </TableRow>
            )}

            {routePoints
              .sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder))
              .map((item) => {
                const routeStatus = routeStatuses.find((status) => {
                  if (status.routePoint?.id) {
                    return equalId(status.routePoint?.id, item.id);
                  } else if (status.routePoint && "tempId" in status.routePoint && "tempId" in item) {
                    return status.routePoint?.tempId === item.tempId;
                  }
                  return false;
                });
                return (
                  <Disclosure key={item.id} as={Fragment}>
                    {({ open }) => (
                      <>
                        <Disclosure.Button as={Fragment}>
                          <TableRow
                            className={cn({
                              "bg-blue-50": open,
                              "hover:bg-gray-50": !open,
                            })}
                            key={item.id}
                            hover={false}
                          >
                            <TableCell action align="center" className="!px-0">
                              <span className="ml-2 flex items-center">
                                {open ? (
                                  <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell nowrap={false} className="max-w-[18rem] break-normal !pl-3">
                              {formattedStringDisplay([item.code, item.name, getDetailAddress(item.address)])}
                            </TableCell>
                            <TableCell className="hidden align-top 2xl:table-cell">
                              <InfoBox
                                nowrap={false}
                                label={item.contactName}
                                subLabel={item.contactPhoneNumber}
                                emptyLabel={t("common.empty")}
                              />
                            </TableCell>
                            <TableCell className="flex flex-col items-start justify-start gap-y-2">
                              {onEdit && (
                                <button
                                  type="button"
                                  title={t("order.route_point_modal.title_fixed")}
                                  onClick={handleEdit(item, routeStatus)}
                                >
                                  <PencilSquareIcon
                                    aria-hidden="true"
                                    className="h-5 w-5 text-gray-400 hover:text-gray-500"
                                  />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  title={t("common.delete")}
                                  onClick={handleOpenDeleteConfirm(item)}
                                >
                                  <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        </Disclosure.Button>
                        <Disclosure.Panel as="tr">
                          <TableCell colSpan={4} className="p-4" nowrap={false}>
                            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                              <div className="group col-span-full overflow-hidden rounded-lg px-4">
                                <DescriptionProperty2
                                  className="block 2xl:hidden"
                                  label={t("order_new.route_tab.contact_name")}
                                >
                                  {item.contactName || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2
                                  className="block 2xl:hidden"
                                  label={t("order_new.route_tab.contact_phone")}
                                >
                                  {item.contactPhoneNumber || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2 label={t("order_new.route_tab.contact_email")}>
                                  {item.contactEmail || t("common.empty")}
                                </DescriptionProperty2>
                                <DescriptionProperty2 label={t("order_new.route_tab.notes")}>
                                  {item.notes || t("common.empty")}
                                </DescriptionProperty2>
                                <RoutePointCustomFieldsDisplay meta={routeStatus?.meta} />
                              </div>
                            </div>
                          </TableCell>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", {
          name: pointRef.current?.code || pointRef.current?.displayOrder,
        })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirm}
        onCancel={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default RoutePointTable;
