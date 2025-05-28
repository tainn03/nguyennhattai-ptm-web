"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "moment/locale/vi";

import { Menu, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { OrganizationRoleType } from "@prisma/client";
import clsx from "clsx";
import moment from "moment";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Messages, momentLocalizer } from "react-big-calendar";

import { Switcher } from "@/components/atoms";
import { Button, DatePicker, PageHeader, TextField } from "@/components/molecules";
import { useOrderPlans, useOrderPlansBase, useOrganizationsByUserId, usePermission } from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { OrderInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { formatDate, isValidDate } from "@/utils/date";

import {
  CalendarDateCell,
  CalendarToolbar,
  NewOrderModal,
  OrderPlanListModal,
  VehicleDispatchModal,
} from "./components";
import { AnchorPoint } from "./components/CalendarDateCell";

const localizer = momentLocalizer(moment);

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations();
    const locale = useLocale();
    const { setBreadcrumb } = useBreadcrumb();
    const { canFind, canNew } = usePermission("order");

    const [anchorPoint, setAnchorPoint] = useState<AnchorPoint>();
    const [isOrderPlanListModalOpen, setIsOrderPlanListModalOpen] = useState(false);
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>();
    const [calendarMonth, setCalendarMonth] = useState(moment(new Date()).format("YYYY-MM"));
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date());

    const [keywords, setKeywords] = useState("");
    const [keywordsHook, setKeywordsHook] = useState("");
    const [orderIds, setOrderIds] = useState<number[]>([]);
    const [displayOrderPlans, setDisplayOrderPlans] = useState<Partial<OrderInfo>[]>([]);
    const [isManaged, setIsManaged] = useState(false);
    const [isDispatcher, setIsDispatcher] = useState(false);

    const { organizationMembers } = useOrganizationsByUserId({ id: userId });

    const [isVehicleDispatchModalOpen, setIsVehicleDispatchModalOpen] = useState(false);
    const [orderCode, setOrderCode] = useState<string | null>(null);

    useEffect(() => {
      if (organizationMembers.length === 1) {
        if (
          organizationMembers[0]?.role?.type === OrganizationRoleType.DISPATCHER ||
          !organizationMembers[0]?.role?.type
        ) {
          if (!canFind()) {
            setIsDispatcher(true);
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationMembers]);

    // Order plan simple data to preview
    const {
      orderPlansBase,
      mutate: mutateOrderPlansBase,
      isLoading: isOrderPlansBaseLoading,
    } = useOrderPlansBase({
      organizationId: orgId,
      isDispatcher: isDispatcher,
      userIdOwner: userId,
      orderDate: new Date(calendarMonth),
      ...(keywordsHook && { keyword: keywordsHook }),
      ...(isManaged && { isManaged, userId }),
    });

    // Order plan detail data
    const { orderPlans, isLoading: isOrderPlansLoading, mutate } = useOrderPlans({ organizationId: orgId, orderIds });

    useEffect(() => {
      router.replace(`${pathname}?month=${calendarMonth}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarMonth]);

    useEffect(() => {
      setBreadcrumb([
        { name: t("order.management"), link: orgLink },
        { name: t("order_plan.title"), link: `${orgLink}/orders/plan` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * After loaded orderPlansBase to show simple data on screen, get maximum 5 ids per day and add all of them in to list id.
     * Get list detail order by that list id
     */
    useEffect(() => {
      if (orderPlansBase.length === 0) {
        setOrderIds([]);
        setDisplayOrderPlans([]);
        return;
      }

      // Get list id of month with maximum 5 ids per day
      const result: Record<string, number[]> = {};
      const dateFormat = t("common.format.date");
      orderPlansBase.forEach((order) => {
        const formattedDate = formatDate(order.orderDate, dateFormat);
        if (!result[formattedDate]) {
          result[formattedDate] = [];
        }
        if (result[formattedDate].length < 5) {
          result[formattedDate].push(Number(order.id));
        }
      });
      const ids = Object.values(result).flat();
      setOrderIds(ids);

      // Set data if orders does not have data yet
      setDisplayOrderPlans((prevValue) => {
        const tempOrderPlans: Partial<OrderInfo>[] = [];
        orderPlansBase.forEach((newItem) => {
          const prevItem = prevValue.find(({ id }) => id === newItem.id);
          tempOrderPlans.push(prevItem || newItem);
        });
        return tempOrderPlans;
      });

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderPlansBase]);

    /**
     * After loaded list order plan detail set new data.
     */
    useEffect(() => {
      if (orderPlans.length === 0) {
        return;
      }

      setDisplayOrderPlans((prevValue) => {
        const tempOrderPlans: Partial<OrderInfo>[] = [];
        prevValue.forEach((prevItem) => {
          const item = orderPlans.find(({ id }) => id === prevItem.id);
          tempOrderPlans.push(item || prevItem);
        });
        return tempOrderPlans;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderPlans]);

    const calendarMessages: Messages = useMemo(
      () => ({
        month: t("order_plan.calendar.month"),
        previous: t("order_plan.calendar.previous"),
        today: t("order_plan.calendar.today"),
        next: t("order_plan.calendar.next"),
      }),
      [t]
    );

    useEffect(() => {
      setSelectedMonth(new Date(calendarMonth));
    }, [calendarMonth]);

    /**
     * Handles the change of the selected date.
     *
     * @param value - The selected date.
     */
    const handlerMonthSelectedChange = useCallback(
      (value: Date | null) => {
        if (!isValidDate(value)) {
          return;
        }

        const monthFormat = moment(value).format("YYYY-MM");
        if (calendarMonth !== monthFormat) {
          setCalendarMonth(monthFormat);
        }
        setSelectedMonth(value);
      },
      [calendarMonth]
    );

    /**
     * Handles the search action.
     */
    const handleSearch = useCallback(() => {
      setKeywordsHook(keywords);
    }, [keywords]);

    /**
     * Handles the change event of the search input or textarea.
     *
     * @param event - The change event object.
     */
    const handleKeywordsChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setKeywords(event.target.value);
    }, []);

    /**
     * Handles the key down event for the search input or textarea.
     *
     * @param event - The key down event object.
     */
    const handleKeywordsKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === "Enter") {
          handleSearch();
        }
      },
      [handleSearch]
    );

    /**
     * Handles the calendar navigation to a new date.
     *
     * @param {Date} newDate - The new date to navigate to.
     */
    const handleCalendarNavigate = useCallback((newDate: Date) => {
      const newMonth = moment(newDate).format("YYYY-MM");
      setCalendarMonth(newMonth);
    }, []);

    /**
     * Handles the close action for the "Show More" feature.
     */
    const handleOrderListClose = useCallback(() => {
      setIsOrderPlanListModalOpen(false);
    }, []);

    /**
     * Handles the click action for opening the new order modal and updating the button state.
     */
    const handleNewOrderFromModalClick = useCallback((date: Date) => {
      setSelectedDate(date);
      setIsNewOrderModalOpen(true);
      setIsOrderPlanListModalOpen(false);
    }, []);

    /**
     * Handles the click action for canceling the new order modal.
     */
    const handleModalCancelClick = useCallback(() => {
      setIsNewOrderModalOpen(false);
    }, []);

    /**
     * Handles the save action for the new order modal.
     * Closes the modal and triggers a data mutation.
     */
    const handleSaveOrderModal = useCallback(() => {
      setIsNewOrderModalOpen(false);
      setIsOrderPlanListModalOpen(true);
      mutateOrderPlansBase();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the close context menu click event.
     *
     * @param {React.MouseEvent<HTMLDivElement, MouseEvent>} event - The click event.
     */
    const handleCloseContextMenuClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // Prevent the default context menu behavior
      event.preventDefault();

      // Clear the anchor point to close the context menu
      setAnchorPoint(undefined);
    }, []);

    /**
     * Handles the click event for creating a new order.
     */
    const handleNewOrderClick = useCallback(() => {
      if (anchorPoint) {
        setSelectedDate(anchorPoint.date);
        setIsNewOrderModalOpen(true);

        // Clear the anchor point to close the context menu
        setAnchorPoint(undefined);
      }
    }, [anchorPoint]);

    /**
     * Opens the order plan list modal for the specified date.
     *
     * @param {Date} date - The date for which to open the order plan list modal.
     */
    const openOrderPlanListModal = useCallback((date: Date) => {
      setSelectedDate(date);
      setIsOrderPlanListModalOpen(true);
    }, []);

    useEffect(() => {
      // Set calendar month from url
      if (searchParams.has("month")) {
        const urlMonth = searchParams.get("month");
        const isValidMonth = moment(urlMonth, "YYYY-MM", true).isValid();
        if (urlMonth && isValidMonth) {
          setCalendarMonth(urlMonth);
        } else {
          setCalendarMonth(moment(new Date()).format("YYYY-MM"));
        }
      }
    }, [searchParams]);

    /**
     * Switch to get data under management or not
     */
    const handleSwitcherChange = useCallback(() => {
      setIsManaged((prev) => !prev);
    }, []);

    /**
     * Handles the opening of the vehicle dispatch modal.
     *
     * @param {string} orderCode - The order code to be set when opening the modal.
     */
    const handleOpenVehicleDispatchModal = useCallback(
      (orderCode: string) => () => {
        setOrderCode(orderCode);
        setIsVehicleDispatchModalOpen(true);
        setIsOrderPlanListModalOpen(false);
      },
      []
    );

    /**
     * Handles the closing of the vehicle dispatch modal.
     */
    const handleCloseVehicleDispatchModal = useCallback(() => {
      setIsVehicleDispatchModalOpen(false);
      setIsOrderPlanListModalOpen(true);
      mutateOrderPlansBase();
      mutate();
    }, [mutate, mutateOrderPlansBase]);

    return (
      <>
        <PageHeader className="!mb-0 !pb-4" title={t("order_plan.title")}>
          <div className="flex justify-between gap-x-4">
            <div className="flex flex-col items-start gap-x-4 gap-y-3">
              <TextField
                name="keywords"
                value={keywords}
                icon={MagnifyingGlassIcon}
                rightAddon={t("order_plan.search")}
                rightAddonClick={handleSearch}
                onKeyDown={handleKeywordsKeyDown}
                onChange={handleKeywordsChange}
                placeholder={t("order_plan.keyword_placeholder")}
                className="[&_input]:rounded-r-none"
              />
              <Switcher
                label={t("order_plan.show_under_management")}
                checked={isManaged}
                onChange={handleSwitcherChange}
              />
            </div>

            <DatePicker
              className="z-20 w-32"
              selected={selectedMonth}
              onChange={handlerMonthSelectedChange}
              showMonthYearPicker
              dateFormat="MM/yyyy"
              mask="99/9999"
            />
          </div>
        </PageHeader>

        <Calendar
          components={{
            toolbar: CalendarToolbar,
            dateCellWrapper: (props) => (
              <CalendarDateCell
                orderPlans={displayOrderPlans}
                loading={isOrderPlansBaseLoading}
                detailLoading={isOrderPlansLoading}
                calendarDate={calendarMonth}
                onOpenMenu={setAnchorPoint}
                onShowMore={openOrderPlanListModal}
                onDateCellClick={openOrderPlanListModal}
                {...props}
              />
            ),
          }}
          date={calendarMonth}
          onNavigate={handleCalendarNavigate}
          culture={locale}
          localizer={localizer}
          messages={calendarMessages}
          selectable={false}
          views={{ month: true }}
          className={clsx(
            "!mt-0 !min-h-[632px] !pt-0 xl:fixed xl:left-80 xl:top-[312px] xl:w-full xl:pb-[328px] xl:pr-[352px]",
            "[&>.rbc-month-view]:overflow-hidden [&>.rbc-month-view]:rounded-md [&>.rbc-month-view]:rounded-t-none [&>.rbc-month-view]:border-t-0",
            "[&_.rbc-header]:max-w-[14.2857%] [&_.rbc-header]:basis-[14.2857%] [&_.rbc-header]:bg-gray-50 [&_.rbc-header]:px-2 [&_.rbc-header]:py-2",
            "[&>.rbc-month-view>.rbc-month-row]:border-gray-200"
          )}
        />

        {/* Context menu */}
        {anchorPoint && canNew() && (
          <>
            <div
              onClick={handleCloseContextMenuClick}
              onContextMenu={handleCloseContextMenuClick}
              className="fixed inset-0 z-50"
            />
            <Menu
              as="div"
              className="absolute z-50 flex justify-center"
              style={{ top: anchorPoint.y, left: anchorPoint.x }}
            >
              <Transition
                as={Fragment}
                show={true}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items
                  style={Number(anchorPoint.x) > window.innerWidth / 2 ? { right: 0 } : { left: 0 }}
                  className="absolute bottom-0 z-10 origin-top-right divide-y rounded-md bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <Menu.Item>
                    {({ active }) => (
                      <Button onClick={handleNewOrderClick} variant="outlined" color={active ? "primary" : "secondary"}>
                        <PlusIcon className="h-5 w-5" aria-hidden="true" />
                        {t("order_plan.new_order")}
                      </Button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </>
        )}

        {/* Order plan list modal */}
        {isOrderPlanListModalOpen && (
          <OrderPlanListModal
            onClose={handleOrderListClose}
            open={isOrderPlanListModalOpen}
            orderDate={selectedDate}
            onNewOrderClick={handleNewOrderFromModalClick}
            mutateOrderInCalendar={mutateOrderPlansBase}
            isDispatcher={isDispatcher}
            openVehicleDispatchModal={handleOpenVehicleDispatchModal}
          />
        )}

        {/* Vehicle dispatch modal */}
        {orderCode && (
          <VehicleDispatchModal
            open={isVehicleDispatchModalOpen}
            orderCode={orderCode}
            handleClose={handleCloseVehicleDispatchModal}
          />
        )}

        {/* New order modal */}
        <NewOrderModal
          open={isNewOrderModalOpen}
          onClose={handleModalCancelClick}
          onDismiss={handleModalCancelClick}
          orderDate={selectedDate}
          onSave={handleSaveOrderModal}
        />
      </>
    );
  },
  {
    resource: "order-plan",
    action: ["find"],
  }
);
