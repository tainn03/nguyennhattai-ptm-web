"use client";

import { Disclosure } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Fragment, memo, useCallback, useState } from "react";
import { BiArrowToBottom, BiArrowToTop, BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";

import {
  Badge,
  DateTimeLabel,
  DescriptionProperty2,
  SkeletonTableRow,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Visible,
} from "@/components/atoms";
import { TableProps } from "@/components/atoms/Table/Table";
import { TableContainerProps } from "@/components/atoms/TableContainer/TableContainer";
import { Authorization, EmptyListSection, MasterActionTable } from "@/components/molecules";
import { useAuth, useIdParam, usePermission } from "@/hooks";
import { DriverReportInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { cn } from "@/utils/twcn";

type DriverReportTableProps = {
  driverReports: Partial<DriverReportInfo>[];
  allowEdit?: boolean;
  inside?: boolean;
  loadingRowId?: number | null;
  loadingRow: boolean;
  flashingId?: number | null;
  handleFlashed?: () => void;
  tableContainerProps?: TableContainerProps;
  tableProps?: TableProps;
  onDelete?: (item: DriverReportInfo) => void;
  onMoveItem?: (fromIndex: number, toIndex: number) => void;
};

const DriverReportTable = ({
  driverReports,
  allowEdit,
  inside,
  loadingRowId,
  loadingRow,
  flashingId,
  handleFlashed,
  onDelete,
  onMoveItem,
}: DriverReportTableProps) => {
  const t = useTranslations();
  const { userId, orgLink } = useAuth();
  const { encryptId } = useIdParam();
  const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("driver-report");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleDelete = useCallback(
    (item: DriverReportInfo) => () => {
      onDelete?.(item);
    },
    [onDelete]
  );

  const handleMoveItem = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, fromIndex: number, toIndex: number, action: string) => {
      event.stopPropagation();
      if (loadingRowId !== null) return;

      setLoadingAction(action);
      onMoveItem?.(fromIndex, toIndex);
    },
    [onMoveItem, loadingRowId]
  );

  return (
    <TableContainer
      className={cn({
        "!mt-0 [&>div>div>div]:rounded-t-none [&>div>div]:!pb-0": inside,
      })}
      fullHeight
      horizontalScroll
      verticalScroll
      stickyHeader
    >
      <Table dense={inside}>
        <TableHead uppercase={inside}>
          <TableRow>
            <TableCell action className="!px-0">
              <span className="sr-only">{t("common.actions")}</span>
            </TableCell>
            <TableCell action className="pl-0">
              {t("driver_report.checklist_item_no")}
            </TableCell>
            <TableCell>{t("driver_report.name")}</TableCell>
            <TableCell>{t("driver_report.description")}</TableCell>
            <TableCell align="center">{t("driver_report.is_required")}</TableCell>
            <TableCell align="center">{t("driver_report.is_photo_required")}</TableCell>
            <TableCell align="center">{t("driver_report.is_bill_of_lading_required")}</TableCell>
            <TableCell nowrap>{t("driver_report.status")}</TableCell>
            {allowEdit && (
              <TableCell action>
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Loading skeleton */}
          {loadingRow && <SkeletonTableRow rows={10} columns={9} />}

          {/* Empty data */}
          {!loadingRow && driverReports.length === 0 && (
            <EmptyListSection actionLink={canNew() ? `${orgLink}/settings/driver-reports/new` : undefined} />
          )}

          {!loadingRow &&
            driverReports.length > 0 &&
            driverReports.map((item: Partial<DriverReportInfo>, index: number) => (
              <Disclosure as={Fragment} key={`workflow-${item.id}`}>
                {({ open }) => (
                  <>
                    <Disclosure.Button as={Fragment}>
                      <TableRow
                        key={item.id}
                        className="select-none !px-0"
                        flash={Number(item.id) === flashingId}
                        onFlashed={handleFlashed}
                      >
                        {/* Chevron */}
                        <TableCell action>
                          <span>
                            {open ? (
                              <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            )}
                          </span>
                        </TableCell>

                        {/* Checklist item no */}
                        <TableCell align="center">{index + 1}</TableCell>

                        {/* Name */}
                        <TableCell>{item.name}</TableCell>

                        {/* Description */}
                        <TableCell nowrap={false} className="max-w-[350px]">
                          {item.description || t("common.empty")}
                        </TableCell>

                        {/* Is required */}
                        <TableCell className="place-content-center place-items-center">
                          {item.isRequired ? (
                            <CheckIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>

                        {/* Is photo required */}
                        <TableCell className="place-content-center place-items-center">
                          {item.photoRequired ? (
                            <CheckIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>

                        {/* Is bill of lading required */}
                        <TableCell className="place-content-center place-items-center">
                          {item.billOfLadingRequired ? (
                            <CheckIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell nowrap className="place-content-center place-items-center">
                          <Badge
                            label={
                              item.isActive ? t("driver_report.status_active") : t("driver_report.status_inactive")
                            }
                            color={item.isActive ? "success" : "error"}
                          />
                        </TableCell>

                        {/* Actions */}
                        <Visible when={!inside}>
                          <TableCell className="group flex flex-none items-center justify-end gap-x-2">
                            {!item.isSystem &&
                              (canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))) && (
                                <>
                                  {index !== 0 && (
                                    <>
                                      <div
                                        onClick={(event) => handleMoveItem(event, index, 0, "moveToTop")}
                                        title={t("driver_report.move_to_top")}
                                        className={`hidden rounded-md py-1.5 text-sm font-semibold ${
                                          loadingRowId !== null
                                            ? "cursor-not-allowed text-gray-300"
                                            : "text-gray-400 hover:cursor-pointer group-hover:text-gray-900"
                                        } sm:block`}
                                      >
                                        {loadingRowId === item.id && loadingAction === "moveToTop" ? (
                                          <Spinner />
                                        ) : (
                                          <BiArrowToTop aria-hidden="true" className="h-6 w-6" />
                                        )}
                                      </div>
                                      <div
                                        onClick={(event) => handleMoveItem(event, index, index - 1, "moveUp")}
                                        title={t("driver_report.move_upward")}
                                        className={`hidden rounded-md py-1.5 text-sm font-semibold ${
                                          loadingRowId !== null
                                            ? "cursor-not-allowed text-gray-300"
                                            : "text-gray-400 hover:cursor-pointer group-hover:text-gray-900"
                                        } sm:block`}
                                      >
                                        {loadingRowId === item.id && loadingAction === "moveUp" ? (
                                          <Spinner />
                                        ) : (
                                          <BiUpArrowAlt aria-hidden="true" className="h-6 w-6" />
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {index !== driverReports.length - 1 && (
                                    <>
                                      <div
                                        onClick={(event) => handleMoveItem(event, index, index + 1, "moveDown")}
                                        title={t("driver_report.move_downward")}
                                        className={`hidden rounded-md py-1.5 text-sm font-semibold ${
                                          loadingRowId !== null
                                            ? "cursor-not-allowed text-gray-300"
                                            : "text-gray-400 hover:cursor-pointer group-hover:text-gray-900"
                                        } sm:block`}
                                      >
                                        {loadingRowId === item.id && loadingAction === "moveDown" ? (
                                          <Spinner />
                                        ) : (
                                          <BiDownArrowAlt aria-hidden="true" className="h-6 w-6" />
                                        )}
                                      </div>
                                      <div
                                        onClick={(event) =>
                                          handleMoveItem(event, index, driverReports.length - 1, "moveToBottom")
                                        }
                                        title={t("driver_report.move_to_bottom")}
                                        className={`hidden rounded-md py-1.5 text-sm font-semibold ${
                                          loadingRowId !== null
                                            ? "cursor-not-allowed text-gray-300"
                                            : "text-gray-400 hover:cursor-pointer group-hover:text-gray-900"
                                        } sm:block`}
                                      >
                                        {loadingRowId === item.id && loadingAction === "moveToBottom" ? (
                                          <Spinner />
                                        ) : (
                                          <BiArrowToBottom aria-hidden="true" className="h-6 w-6" />
                                        )}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}

                            <Authorization
                              resource="driver-report"
                              action={["edit", "new", "delete"]}
                              type="oneOf"
                              alwaysAuthorized={
                                (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                                (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                              }
                            >
                              <MasterActionTable
                                actionPlacement={
                                  driverReports.length >= 3 &&
                                  (driverReports.length - 1 === index || driverReports.length - 2 === index)
                                    ? "start"
                                    : "end"
                                }
                                editLink={
                                  canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                                    ? `${orgLink}/settings/driver-reports/${encryptId(item.id)}/edit`
                                    : ""
                                }
                                copyLink={
                                  canNew() ? `${orgLink}/settings/driver-reports/new?copyId=${encryptId(item.id)}` : ""
                                }
                                onDelete={
                                  !item.isSystem &&
                                  (canDelete() || (canDeleteOwn() && equalId(item.createdByUser?.id, userId)))
                                    ? handleDelete(item as DriverReportInfo)
                                    : undefined
                                }
                              />
                            </Authorization>
                          </TableCell>
                        </Visible>
                      </TableRow>
                    </Disclosure.Button>

                    <Disclosure.Panel as="tr">
                      <TableCell colSpan={allowEdit ? 9 : 8} className="overflow-x-auto" nowrap={false}>
                        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                          <div className="group col-span-full overflow-hidden rounded-lg px-4">
                            {item.reportDetails?.length === 0 ? (
                              <DescriptionProperty2 label={t("driver_report.checklist_title")}>
                                {t("common.empty")}
                              </DescriptionProperty2>
                            ) : (
                              <DescriptionProperty2 label={t("driver_report.checklist_title")} className="flex-col">
                                <Fragment />
                                <TableContainer inside variant="paper" className="[&_thead]:bg-white">
                                  <Table dense>
                                    <TableHead uppercase>
                                      <TableRow>
                                        <TableCell align="right" action className="pl-0">
                                          {t("driver_report.checklist_item_no")}
                                        </TableCell>
                                        <TableCell>{t("driver_report.name")}</TableCell>
                                        <TableCell>{t("driver_report.description")}</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {item?.reportDetails?.map((item, index) => (
                                        <TableRow key={item.id}>
                                          <TableCell align="right">{index + 1}</TableCell>
                                          <TableCell>{item.name}</TableCell>
                                          <TableCell nowrap={false}>{item.description || t("common.empty")}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </DescriptionProperty2>
                            )}

                            <DescriptionProperty2 label={t("components.system_info_card.created_at")}>
                              <DateTimeLabel type="datetime" value={item.createdAt} />
                            </DescriptionProperty2>
                            <DescriptionProperty2 label={t("components.system_info_card.created_by")}>
                              {getAccountInfo(item?.createdByUser).displayName}
                            </DescriptionProperty2>

                            <DescriptionProperty2 label={t("components.system_info_card.updated_at")}>
                              <DateTimeLabel type="datetime" value={item.updatedAt} />
                            </DescriptionProperty2>
                            <DescriptionProperty2 label={t("components.system_info_card.updated_by")}>
                              {getAccountInfo(item?.updatedByUser).displayName}
                            </DescriptionProperty2>
                          </div>
                        </div>
                      </TableCell>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default memo(DriverReportTable);
