"use client";

import { Menu, RadioGroup, Transition } from "@headlessui/react";
import { AdjustmentsHorizontalIcon, Bars3Icon, InboxIcon, PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ElementType, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiaSortAlphaDownAltSolid as LiaSortAlphaDownAltSolidIcon,
  LiaSortAlphaUpAltSolid as LiaSortAlphaUpAltSolidIcon,
} from "react-icons/lia";

import { Link, SkeletonOrderList, Switcher } from "@/components/atoms";
import { Authorization, Button, PageHeader, QuickSearch } from "@/components/molecules";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import {
  ConfirmModal,
  DeleteOrderModal,
  FilterStatus,
  OrderFilterModal,
  OrderGrid,
  OrderList,
  Pagination,
  UserGuideTrigger,
} from "@/components/organisms";
import { OrderListModalFilterOptions } from "@/components/organisms/OrderFilterModal/OrderFilterModal";
import { PAGE_SIZE_OPTIONS, PAGE_SIZE_ORDER_GRID_OPTIONS } from "@/constants/pagination";
import { useOrders, useOrganizationsByUserId, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { ORDER_UPDATE_SEARCH_CONDITIONS, ORDER_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { OrgPageProps, withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";

type DisplayType = {
  value: string;
  icon: ElementType;
};

const displayTypes: DisplayType[] = [
  { value: "list", icon: Bars3Icon },
  { value: "grid", icon: Squares2X2Icon },
];

export default withOrg(({ org, orgId, orgLink, user, userId }: OrgPageProps) => {
  const t = useTranslations();
  const router = useRouter();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const { setBreadcrumb } = useBreadcrumb();

  const { canNew, canFind } = usePermission("order");

  const pathname = usePathname();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [orderFilterModalOpen, setOrderFilterModalOpen] = useState(false);
  const [displayType, setDisplayType] = useState(displayTypes[1]);

  const sortCols = [
    { value: "createdAt", label: t("order.created_at") },
    { value: "updatedAt", label: t("order.updated_at") },
    { value: "orderDate", label: t("order.order_date") },
  ];

  const [sortField, setSortField] = useState(sortCols[0]);
  const [sortType, setSortType] = useState<"asc" | "desc">("asc");
  const { searchConditions } = useOrderState();

  const [filterOptions, setFilterOptions] = useSearchConditions(
    searchConditions,
    displayType.value === "grid" ? PAGE_SIZE_ORDER_GRID_OPTIONS : undefined
  );
  const [isDateModal, setIsDateModal] = useState(false);
  const [isManaged, setIsManged] = useState(false);
  const [isDispatcher, setIsDispatcher] = useState(false);

  const selectedCodeRef = useRef<OrderInfo>();
  const updateRouteRef = useRef(false);

  const { isLoading: isLoadingRole, organizationMembers } = useOrganizationsByUserId({ id: userId });

  useEffect(() => {
    if (organizationMembers.length === 1) {
      if (!canFind()) {
        setIsDispatcher(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationMembers]);

  const { orders, pagination, mutate, isLoading } = useOrders({
    mode: displayType.value,
    organizationId: orgId,
    isDispatcher: isDispatcher,
    userIdOwner: user.id,
    ...getFilterRequest(filterOptions),
    ...(isManaged && { isManaged, userId }),
  });

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("order.management"), link: orgLink },
      { name: t("order.title"), link: `${orgLink}/orders` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderDateFrom = useMemo(() => {
    if (filterOptions["orderDateFromFilter"]?.filters[0]?.value) {
      setIsDateModal(true);
    }
    return filterOptions["orderDateFromFilter"]?.filters[0]?.value;
  }, [filterOptions]);

  const orderDateTo = useMemo(() => {
    if (filterOptions["orderDateToFilter"]?.filters[0]?.value) {
      setIsDateModal(true);
    }
    return filterOptions["orderDateToFilter"]?.filters[0]?.value;
  }, [filterOptions]);

  const isDisplayList = useMemo(() => displayType.value === "list", [displayType.value]);

  /**
   * Updating search params.
   */
  useEffect(() => {
    if (updateRouteRef.current) {
      const queryString = getQueryString(filterOptions);
      router.push(`${pathname}${queryString}`);
      dispatch<FilterOptions>({
        type: ORDER_UPDATE_SEARCH_CONDITIONS,
        payload: filterOptions,
      });
      dispatch<string>({
        type: ORDER_UPDATE_SEARCH_QUERY_STRING,
        payload: queryString,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

  /**
   * Callback function for opening a dialog.
   */
  const handleOpenFilterModal = useCallback(() => {
    setOrderFilterModalOpen(true);
  }, []);

  /**
   * Callback function for closing a dialog.
   */
  const handleCloseFilterModal = useCallback(() => {
    setOrderFilterModalOpen(false);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be deleted.
   */
  const handleOpenDeleteModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setIsDeleteModalOpen(true);
  }, []);

  /**
   * Handles the confirmation of deletion.
   * Sends a delete request, and displays a notification based on the result.
   */
  const handleConfirmDelete = useCallback(
    async (order: OrderInfo) => {
      if (order.code === selectedCodeRef.current?.code) {
        const result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/delete`, {
          order: {
            id: Number(selectedCodeRef.current.id),
            code: order.code,
            updatedByUser: user,
            trips: order.trips,
          },
          lastUpdatedAt: selectedCodeRef.current.updatedAt,
        });

        if (result.status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        }
        setIsDeleteModalOpen(false);
        mutate();
      } else {
        showNotification({
          color: "error",
          message: t("order.list_item.not_matched_message"),
        });
      }
    },
    [mutate, orgLink, showNotification, t, user]
  );

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be canceled.
   */
  const handleOpenCancelModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setIsCancelModalOpen(true);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseCancelModal = useCallback(() => {
    setIsCancelModalOpen(false);
  }, []);

  /**
   * Handle the confirmation of order cancellation.
   * This function is called with an optional OrderInfo object to confirm the cancellation of an order.
   * @param {OrderInfo} [_order] - The order to cancel. If not provided, the function will use the currently selected order.
   */
  const handleConfirmCancel = useCallback(async () => {
    setIsCancelling(true);
    const order = selectedCodeRef.current;
    let result: ApiResult<OrderInfo> | undefined;
    if (order) {
      result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/cancel`, {
        order: {
          id: Number(order.id),
          code: order.code,
          updatedByUser: user,
          trips: order.trips,
        },
        lastUpdatedAt: order.updatedAt,
      });
    }

    setIsCancelling(false);
    if (!result) {
      return;
    }

    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order?.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order?.code });
          break;
        default:
          break;
      }

      // Show an error notification
      showNotification({
        color: "error",
        title: t("order.cancel_error_title"),
        message,
      });
    } else {
      // Show a success notification and navigate to the maintenance types page
      showNotification({
        color: "success",
        title: t("order.cancel_success_title"),
        message: t("order.cancel_success_message", { orderCode: order?.code }),
      });
    }
    setIsCancelModalOpen(false);
    mutate();
  }, [mutate, orgLink, showNotification, t, user]);

  /**
   * Callback function for applying filters to a specific column and updating filter options.
   *
   * @param columnName - The name or identifier of the column to which the filters should be applied.
   * @param filters - An array of filter properties to apply to the column.
   * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      updateRouteRef.current = true;
      setFilterOptions((prevValue) => {
        const { pagination, ...values } = prevValue;
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };
        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (sortType) {
            value.sortType = undefined;
          }
          if (columnName === key) {
            value = {
              ...value,
              filters,
              sortType,
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Handles the application of date filters for a specific column and updates the filter options accordingly.
   * @param {string} columnName - The name of the column to filter.
   * @param {Date | undefined} date - The date to be applied as a filter.
   */
  const handleFilterDateApply = useCallback((columnName: string, date: Date | undefined) => {
    updateRouteRef.current = true;
    setFilterOptions((prevValue) => {
      const { ...values } = prevValue;
      const newValue: FilterOptions = {};

      Object.keys(values).forEach((key) => {
        let value = values[key];
        if (columnName === key) {
          value = {
            ...value,
            filters: [
              {
                ...value.filters[0],
                isShowBtnDelete: key === "orderDate" ? false : true,
                value: date,
              },
            ],
          };
        }
        newValue[key] = value;
      });
      return newValue;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles the application of filters based on different types and updates the filter options accordingly.
   * @param {string} columnName - The name of the column to filter.
   * @param {string} type - The type of filter being applied.
   * @param {Date | null | string | CheckboxItem[]} valueFilter - The value to be applied as a filter.
   */
  const handleModalFilterApply = useCallback(
    (columnName: string, type: string, valueFilter: Date | null | string | CheckboxItem[]) => {
      updateRouteRef.current = true;

      let valueFilterFormat: Date | string | CheckboxItem[];
      switch (type) {
        case "date":
        case "checkbox":
          valueFilterFormat = valueFilter as Date | CheckboxItem[];
          break;
        case "text":
          valueFilterFormat = valueFilter as string;
          break;
        default:
          break;
      }

      setFilterOptions((prevValue) => {
        const { ...values } = prevValue;
        const newValue: FilterOptions = {};

        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (columnName === key) {
            value = {
              ...value,
              filters: [
                {
                  ...value.filters[0],
                  value: valueFilterFormat,
                },
              ],
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Handles confirming the selected filters from the modal and applies them to the order list.
   * Closes the filter modal and applies filters based on the keys present in the modalFilter object.
   * @param {OrderListModalFilterOptions} modalFilter - Selected filters from the modal.
   */
  const handleConfirmFilterModal = useCallback((modalFilter: OrderListModalFilterOptions) => {
    setOrderFilterModalOpen(false);
    let hasFilterDate = false;
    for (const [key, value] of Object.entries(modalFilter)) {
      switch (key) {
        case "unitOfMeasureName":
        case "merchandiseName":
        case "customerName":
          handleModalFilterApply(key, "text", value);
          break;
        case "orderDateFromFilter":
          handleModalFilterApply(key, "date", value);
          hasFilterDate = true;
          break;
        case "orderDateToFilter":
          handleModalFilterApply(key, "date", value);
          hasFilterDate = true;
          break;
        case "orderStatus":
          handleModalFilterApply(key, "checkbox", value);
          break;
        default:
          break;
      }
    }

    hasFilterDate && handleFilterDateApply("orderDate", undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles the change in sorting parameters triggered by selecting an item.
   * Updates the route reference and sets the sorting field and type within the filter options.
   * @param {{ value: string; label: string }} item - The selected item containing value and label properties.
   */
  const handleChangeSort = useCallback(
    (item: { value: string; label: string }) => () => {
      updateRouteRef.current = true;
      setSortField(item);
      setFilterOptions((prevValue) => {
        const { ...values } = prevValue;
        const newValue: FilterOptions = {};

        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (sortType) {
            value.sortType = undefined;
          }
          if (item.value === key) {
            value = {
              ...value,
              sortColumn: item.value,
              sortType: sortType,
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    [setFilterOptions, sortType]
  );

  /**
   * Handles changes in filter options.
   * Updates the route reference and sets the filter options based on the provided options.
   * @param {FilterOptions} options - The updated filter options.
   */
  const handleFilterChange = useCallback(
    (options: FilterOptions) => {
      updateRouteRef.current = true;
      if (!options["orderDateFromFilter"].filters[0].value) {
        options["orderDateToFilter"].filters[0].value = "";
        options["orderDate"].filters[0].value = new Date();
      }
      if (!options["orderDateToFilter"].filters[0].value) {
        options["orderDateFromFilter"].filters[0].value = "";
        options["orderDate"].filters[0].value = new Date();
      }
      setFilterOptions(options);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Handles changes in filter options.
   * Updates the route reference and sets the filter options based on the provided options.
   * @param {FilterOptions} options - The updated filter options.
   */
  const handleSortIconChange = useCallback(
    (item: { value: string; label: string }) => () => {
      let sortTypeFilter: SortType;
      setSortType((prevValue) => {
        sortTypeFilter = prevValue === "asc" ? "desc" : "asc";
        return prevValue === "asc" ? "desc" : "asc";
      });

      updateRouteRef.current = true;
      setFilterOptions((prevValue) => {
        const { ...values } = prevValue;
        const newValue: FilterOptions = {};

        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (sortType) {
            value.sortType = undefined;
          }
          if (item.value === key) {
            value = {
              ...value,
              sortColumn: item.value,
              sortType: sortTypeFilter,
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (orderDateFrom && orderDateTo) {
      handleFilterDateApply("orderDate", undefined);
    }

    if ((!orderDateFrom || !orderDateTo) && isDateModal) {
      handleFilterDateApply("orderDateFromFilter", undefined);
      handleFilterDateApply("orderDateToFilter", undefined);
      handleFilterDateApply("orderDate", new Date());
    }

    if (!orderDateFrom && !orderDateTo && !isDateModal) {
      handleFilterDateApply("orderDate", new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDateFrom, orderDateTo]);

  /**
   * Switch to get data under management or not
   */
  const handleSwitcherChange = useCallback(() => {
    setIsManged((prev) => !prev);
  }, []);

  /**
   * Handles the change of page number in pagination.
   * @param {number} page - The new page number.
   */
  const handlePageChange = useCallback(
    (page: number) => {
      updateRouteRef.current = true;
      setFilterOptions((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page,
        },
      }));
    },
    [setFilterOptions]
  );

  /**
   * Handles the change of page size in pagination.
   * @param {number} pageSize - The new page size.
   */
  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      updateRouteRef.current = true;
      setFilterOptions((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page: 1,
          pageSize,
        },
      }));
    },
    [setFilterOptions]
  );

  /**
   * Handles the change of display style (e.g., list view or grid view).
   * @param {DisplayType} displayStyle - The new display style.
   */
  const handleChangeDisplayStyle = useCallback(
    (displayStyle: DisplayType) => {
      setDisplayType(displayStyle);
      handlePageSizeChange(displayStyle.value === "list" ? PAGE_SIZE_OPTIONS[0] : PAGE_SIZE_ORDER_GRID_OPTIONS[0]);
      handlePageChange(1);
    },
    [handlePageChange, handlePageSizeChange]
  );

  return (
    <>
      <PageHeader
        title={
          <>
            {t("order.feature")}
            <UserGuideTrigger targetPath="/orgs/[code]/orders" />
          </>
        }
        description={
          <>
            <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
            <Switcher
              className="pt-4"
              label={t("order.show_under_management")}
              checked={isManaged}
              onChange={handleSwitcherChange}
            />
            <FilterStatus options={filterOptions} onChange={handleFilterChange} />
          </>
        }
        actionHorizontal
        actionComponent={
          <div className="flex flex-col items-end justify-end gap-y-6">
            <Authorization resource="order" action="new" alwaysAuthorized={canNew()}>
              <Button as={Link} href={`${orgLink}/orders/new`} icon={PlusIcon} className="w-fit">
                {t("common.new")}
              </Button>
            </Authorization>
            <div className="flex items-end gap-x-4">
              {/* Display List/Grid */}
              <div>
                <RadioGroup
                  value={displayType}
                  onChange={handleChangeDisplayStyle}
                  className="isolate inline-flex rounded-md shadow-sm"
                >
                  <RadioGroup.Label className="sr-only">{t("order.display_type_label")}</RadioGroup.Label>
                  <div className="flex flex-row">
                    {displayTypes.map((item, index) => (
                      <RadioGroup.Option
                        key={item.value}
                        value={item}
                        className={({ checked }) =>
                          clsx(
                            "flex cursor-pointer items-center justify-center p-2 text-sm focus:outline-none sm:flex-1",
                            {
                              "-ml-px": index > 0,
                              "rounded-l-md": index === 0,
                              "rounded-r-md": index === displayTypes.length - 1,
                              "bg-blue-700 text-white hover:bg-blue-600": checked,
                              "bg-white text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50": !checked,
                            }
                          )
                        }
                      >
                        <RadioGroup.Label as="span">
                          <item.icon className="h-5 w-5" />
                        </RadioGroup.Label>
                      </RadioGroup.Option>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Sort */}
              <div>
                <div className="relative inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    className="relative inline-flex items-center gap-x-1.5 whitespace-nowrap rounded-l-md bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
                    onClick={handleSortIconChange(sortField)}
                  >
                    {sortType === "asc" ? (
                      <LiaSortAlphaUpAltSolidIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <LiaSortAlphaDownAltSolidIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                    )}
                    {sortField.label}
                  </button>
                  <Menu as="div" className="-ml-px block">
                    <Menu.Button className="relative inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10">
                      <span className="sr-only">{t("order.sort_options")}</span>
                      <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute left-0 z-10 -mr-1 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          {sortCols.map((item) => (
                            <Menu.Item key={item.value}>
                              {({ active }) => (
                                <button
                                  type="button"
                                  className={clsx("block w-full px-4 py-2 text-left text-sm", {
                                    "bg-gray-100 text-gray-900": active,
                                    "text-gray-700": !active,
                                  })}
                                  onClick={handleChangeSort(item)}
                                >
                                  {item.label}
                                </button>
                              )}
                            </Menu.Item>
                          ))}
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>

              {/* Filter */}
              <div>
                <button
                  type="button"
                  className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  onClick={handleOpenFilterModal}
                >
                  <AdjustmentsHorizontalIcon className="-ml-0.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                  {t("order.filter")}
                </button>
              </div>
            </div>
          </div>
        }
      />

      {!isLoading && !isLoadingRole && orders.length === 0 ? (
        <div className="mx-auto max-w-lg px-6 lg:px-8">
          <div className="text-center">
            <InboxIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">{t("order.no_order")}</h3>
            <Authorization
              resource="order"
              action="new"
              alwaysAuthorized={canNew()}
              fallbackComponent={<p className="mt-1 text-sm text-gray-500">{t("common.empty_list")}</p>}
            >
              <p className="mt-1 text-sm text-gray-500">
                {t.rich("order.filter_not_found_description", {
                  createOrder: () => <strong>{t("order.create_order")}</strong>,
                })}
              </p>
              <div className="mt-6">
                <Link
                  useDefaultStyle={false}
                  href={`${orgLink}/orders/new`}
                  className="inline-flex items-center rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  {t("order.create_order")}
                </Link>
              </div>
            </Authorization>
          </div>
        </div>
      ) : (
        <>
          {isDisplayList ? (
            <OrderList
              orders={orders}
              onCanceled={handleOpenCancelModal}
              onDeleted={handleOpenDeleteModal}
              isLoading={isLoading}
              orgId={orgId}
              orgLink={orgLink}
              userId={userId}
            />
          ) : (
            <>
              {isLoading && isLoadingRole && (
                <div className="flex items-center justify-center">
                  <SkeletonOrderList isLoading={isLoading} />
                </div>
              )}
              <OrderGrid
                orderList={orders}
                onCanceled={handleOpenCancelModal}
                onDeleted={handleOpenDeleteModal}
                org={org}
                orgId={orgId}
                orgLink={orgLink}
                user={user}
                userId={userId}
              />
            </>
          )}
          {/* <Authorization resource="order" action="new" alwaysAuthorized={canNew()}>
            <div className="fixed bottom-6 right-6 z-50">
              <Link
                useDefaultStyle={false}
                href={`${orgLink}/orders/new`}
                className="flex items-center justify-center rounded-full bg-green-600 p-3.5 text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                <DocumentPlusIcon className="h-6 w-6" aria-hidden="true" />
              </Link>
            </div>
          </Authorization> */}
        </>
      )}

      {/* Pagination */}
      {(pagination?.pageCount || 0) > 0 && (
        <Pagination
          className="mt-4"
          showPageSizeOptions
          page={pagination?.page}
          total={pagination?.total}
          pageSize={pagination?.pageSize ? pagination.pageSize : PAGE_SIZE_ORDER_GRID_OPTIONS[0]}
          pageOptions={isDisplayList ? PAGE_SIZE_OPTIONS : PAGE_SIZE_ORDER_GRID_OPTIONS}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Filter modal */}
      <OrderFilterModal
        open={orderFilterModalOpen}
        onClose={handleCloseFilterModal}
        onConfirm={handleConfirmFilterModal}
        filterOptions={filterOptions}
      />

      {/* Cancel confirm modal */}
      <ConfirmModal
        open={isCancelModalOpen}
        loading={isCancelling}
        icon="question"
        title={t("order.details.confirm_cancel_title")}
        message={t("order.details.confirm_cancel_message")}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />

      {/* Delete confirm modal */}
      <DeleteOrderModal
        open={isDeleteModalOpen}
        order={selectedCodeRef.current as OrderInfo}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
});
