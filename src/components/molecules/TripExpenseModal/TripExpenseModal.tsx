"use client";

import { Disclosure } from "@headlessui/react";
import { ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { CustomerType, DriverExpenseType, RouteType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import {
  DescriptionProperty2,
  Link,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Alert, Authorization, Button, EmptyListSection, Modal, NumberField, TextField } from "@/components/molecules";
import { DriverExpenseInputForm } from "@/forms/tripDriverExpense";
import { useAuth, useIdParam, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { getDriverExpenses } from "@/services/client/driverExpense";
import { getTripDriverExpenses } from "@/services/client/orderTrip";
import { updateTripDriverExpenses } from "@/services/client/tripDriverExpense";
import { YubObjectSchema } from "@/types";
import { ApiResult } from "@/types/api";
import { DriverExpenseInfo, OrderTripInfo, TripDriverExpenseInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { equalId, formatCurrency } from "@/utils/number";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";
import { errorMax, errorMaxLength, errorMin, errorType, formatError } from "@/utils/yup";

const customerExpenses = [
  {
    id: 1,
    key: "customerExpense1",
    name: "LOLO",
  },
  {
    id: 2,
    key: "customerExpense2",
    name: "Cược công",
  },
  {
    id: 3,
    key: "customerExpense3",
    name: "Chi phí khác",
  },
];

type UpdateBillOfLadingModalProps = {
  open: boolean;
  id: number;
  onSave?: () => void;
  onClose?: () => void;
};

const TripExpenseModal = ({ open, id, onClose, onSave }: UpdateBillOfLadingModalProps) => {
  const t = useTranslations();
  const {
    canFind,
    canEdit: canEditCustomerRoute,
    canEditOwn: canEditOwnCustomerRoute,
  } = usePermission("customer-route");
  const { canEdit: canEditDriverExpense } = usePermission("trip-driver-expense");
  const { orgLink, orgId, org, userId } = useAuth();
  const { encryptId } = useIdParam();
  const orderTripRef = useRef<OrderTripInfo | null>(null);

  const { unitCode } = getGeneralDispatchVehicleInfo({ ...orderTripRef.current?.order });
  const { showNotification } = useNotification();

  const [driverExpenses, setDriverExpenses] = useState<DriverExpenseInfo[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const [driverCost, setDriverCost] = useState(0);

  /**
   * Initial values for the form representing driver expenses keyed by expense IDs.
   */
  const initialValues = useMemo(() => {
    const values: DriverExpenseInputForm = {};
    driverExpenses.forEach((item) => {
      values[item.key] = null;
    });
    return values;
  }, [driverExpenses]);

  /**
   * Yup schema for validating the form values related to driver expenses in the driver salary detail form.
   */
  const driverSalaryDetailSchema = useMemo(() => {
    // Initialize an empty schema object
    const schema: YubObjectSchema<DriverExpenseInputForm> = {};
    // Iterate through each driver expense item and define validation rules
    driverExpenses.forEach((item) => {
      schema[item.key] = yup
        .number()
        .min(0, errorMin(0))
        .typeError(errorType("number"))
        .max(99999999.99, errorMaxLength(99999999.99))
        .nullable();
    });

    // Return the final schema object
    return yup.object({
      ...schema,
      subcontractorCost: yup
        .number()
        .nullable()
        .typeError(errorType("number"))
        .min(0, errorMin(0))
        .max(99999999.99, errorMax(99999999.99)),
      bridgeToll: yup
        .number()
        .nullable()
        .typeError(errorType("number"))
        .min(0, errorMin(0))
        .max(99999999.99, errorMax(99999999.99)),
      otherCost: yup
        .number()
        .nullable()
        .typeError(errorType("number"))
        .min(0, errorMin(0))
        .max(99999999.99, errorMax(99999999.99)),
      notes: yup.string().trim().nullable().max(255, errorMaxLength(255)),
    });
  }, [driverExpenses]);

  const reRender = useCallback(() => {
    setRenderKey((prev) => prev + 1);
  }, []);

  /**
   * Handles the form submission for trip driver expenses, creating or updating the expenses associated with an order trip.
   *
   * @param {DriverExpenseInputForm} values - The form values representing driver expenses keyed by expense IDs.
   * @param {FormikHelpers<DriverExpenseInputForm>} formikHelpers - Formik helper functions.
   * @returns {Promise<void>} A promise that resolves once the form submission is complete.
   */
  const handleSubmitFormik = useCallback(
    async (values: DriverExpenseInputForm, formikHelpers: FormikHelpers<DriverExpenseInputForm>) => {
      // Prepare trip driver expense entities from the form values
      const tripDriverExpenseEntity: Partial<TripDriverExpenseInfo>[] = [];
      driverExpenses.forEach((item) => {
        if (item.key !== null) {
          tripDriverExpenseEntity.push({
            driverExpense: {
              id: Number(item.id),
            },
            trip: {
              id,
            },
            amount: Number(values[item.key]) || 0,
          });
        }
      });

      let result: ApiResult | undefined;
      // Check if necessary information is available for the API call
      if (orgId && orderTripRef.current?.order?.code && orderTripRef.current?.code) {
        result = await updateTripDriverExpenses(
          {
            organizationCode: ensureString(org?.code),
            orderCode: ensureString(orderTripRef.current?.order?.code),
            tripCode: ensureString(orderTripRef.current?.code),
          },
          tripDriverExpenseEntity,
          {
            subcontractorCost: values.subcontractorCost || null,
            bridgeToll: values.bridgeToll || null,
            otherCost: values.otherCost || null,
            notes: values.notes || null,
          }
        );
      }

      formikHelpers.setSubmitting(false);
      // Show appropriate notification based on the API response
      if (result?.data) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: t("order.vehicle_dispatch.driver_salary_detail.title", { tripCode: orderTripRef.current?.code }),
          }),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
        });
      }
      formikHelpers.resetForm({ values: initialValues });
      onSave && onSave();
    },
    [driverExpenses, id, initialValues, onSave, org?.code, orgId, showNotification, t]
  );

  const { values, touched, errors, isSubmitting, handleChange, handleSubmit, resetForm } = useFormik({
    initialValues: initialValues,
    onSubmit: handleSubmitFormik,
    enableReinitialize: true,
    validationSchema: driverSalaryDetailSchema,
  });

  const driverExpenseTotal = useMemo(() => {
    return Object.keys(values)
      .filter((key) => driverExpenses.find((item) => item.key === key))
      .reduce((acc, key) => acc + (Number(values[key]) || 0), 0);
  }, [driverExpenses, values]);

  const renderDriverExpenses = useMemo(() => {
    const trip = orderTripRef.current;
    return driverExpenses.map((item, index) => {
      const amount = values[item.key];
      let helperText = "";

      if (item.type === DriverExpenseType.DRIVER_COST) {
        const driverExpenseRate = trip?.vehicle?.type?.driverExpenseRate || 100;
        const driverExpenseSalary = trip?.order.route?.driverExpenses?.find((de) => de.driverExpense?.key === item.key)
          ?.amount;
        const calcSalary = (Number(driverExpenseSalary) * driverExpenseRate) / 100;
        const checkDriverExpenseRate = driverExpenseRate !== 100 && calcSalary === amount;

        if (checkDriverExpenseRate) {
          const vehicleType = trip?.vehicle?.type?.name;
          const driverExpenseName = item.name;
          helperText = t("order.vehicle_dispatch_modal.driver_expense_rate_helper_text", {
            vehicleType,
            driverExpenseRate,
            driverExpenseName,
            driverExpenseSalary: formatCurrency(Number(driverExpenseSalary)),
          });
        }
      }

      return (
        <TableRow key={item.id}>
          <TableCell align="left">{index + 1}</TableCell>
          <TableCell>{item.name}</TableCell>
          <TableCell>
            <NumberField
              className="whitespace-break-spaces"
              name={item.key}
              value={amount}
              suffixText={t("common.unit.currency")}
              onChange={handleChange}
              helperText={helperText}
              errorText={formatError(t, touched[item.key] && errors[item.key])}
              disabled={!canEditDriverExpense()}
            />
          </TableCell>
        </TableRow>
      );
    });
  }, [canEditDriverExpense, driverExpenses, errors, handleChange, t, touched, values]);

  /**
   * Fetches the driver expenses structure from the API.
   */
  const fetchDriverExpenses = useCallback(async () => {
    const driverExpenseData = await getDriverExpenses({ organizationId: orgId });
    setDriverExpenses(driverExpenseData);
  }, [orgId]);

  useEffect(() => {
    fetchDriverExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles resetting the form values for expenses.
   * It resets the form values to their initial values, including subcontractor cost,
   * bridge toll, other cost, and driver expenses.
   *
   * @param {boolean} isResetExpense - When resetting the form values for expenses
   */
  const handleResetForm = useCallback(
    (isResetExpense: boolean) => {
      const trip = orderTripRef.current;
      const subcontractorCost = isResetExpense ? trip?.order.route?.subcontractorCost : trip?.subcontractorCost;
      const bridgeToll = isResetExpense ? trip?.order.route?.bridgeToll : trip?.bridgeToll;
      const otherCost = isResetExpense ? trip?.order.route?.otherCost : trip?.otherCost;
      const notes = trip?.notes ?? null;

      const tripDriverExpenses = isResetExpense ? [] : trip?.driverExpenses || [];
      const routeDriverExpenses = trip?.order.route?.driverExpenses || [];
      const driverExpenseRate = trip?.vehicle?.type?.driverExpenseRate || 100;
      let driverCost = 0;

      routeDriverExpenses.forEach((item) => {
        if (item.driverExpense?.key) {
          if (item.driverExpense.type === DriverExpenseType.DRIVER_COST) {
            driverCost += (Number(item.amount) * driverExpenseRate) / 100;
          } else {
            driverCost += Number(item.amount);
          }
        }
      });

      setDriverCost(driverCost);

      const driverExpenses = (
        tripDriverExpenses.length > 0 && !isResetExpense ? tripDriverExpenses : routeDriverExpenses
      )?.reduce((acc, item) => {
        if (item.driverExpense?.key) {
          if (item.driverExpense.type === DriverExpenseType.DRIVER_COST && tripDriverExpenses.length === 0) {
            acc[item.driverExpense.key] = (Number(item.amount) * driverExpenseRate) / 100;
          } else {
            acc[item.driverExpense.key] = Number(item.amount);
          }
        }
        return acc;
      }, {} as DriverExpenseInputForm);
      resetForm({
        values: {
          ...driverExpenses,
          subcontractorCost: subcontractorCost ?? 0,
          bridgeToll: bridgeToll ?? 0,
          otherCost: otherCost ?? 0,
          notes,
        },
      });
    },
    [resetForm]
  );

  /**
   * Fetches the trip driver expenses from the API and sets the form values to the fetched data.
   */
  const fetchTrip = useCallback(async () => {
    if (id) {
      const trip = await getTripDriverExpenses({ trip: { id } });

      orderTripRef.current = trip;
      handleResetForm(!trip?.driverExpenses?.length);
    }
    reRender();
  }, [handleResetForm, id, reRender]);

  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * It resets the form to its initial values and then calls the onClose function if it exists.
   */
  const handleClose = useCallback(() => {
    resetForm({ values: initialValues });
    onClose && onClose();
  }, [initialValues, onClose, resetForm]);

  /**
   * Handles resetting the form values for expenses.
   * It resets the form values to their initial values, including subcontractor cost,
   * bridge toll, other cost, and driver expenses.
   */
  const handleResetExpense = useCallback(() => {
    handleResetForm(true);
  }, [handleResetForm]);

  return (
    <Modal key={renderKey} open={open} size="2xl" showCloseButton onClose={handleClose} onDismiss={handleClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={t("order.vehicle_dispatch.driver_salary_detail.title", { tripCode: orderTripRef.current?.code })}
        />
        <ModalContent padding={false} className="divide-y divide-gray-200">
          <div className="grid grid-cols-1 gap-x-3 px-4 py-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("order.vehicle_dispatch.driver_salary_detail.driver")}>
                {orderTripRef.current?.driver?.firstName || orderTripRef.current?.driver?.lastName ? (
                  <>
                    {getFullName(orderTripRef.current?.driver?.firstName, orderTripRef.current?.driver?.lastName)}
                    {(orderTripRef.current?.driver?.phoneNumber || orderTripRef.current?.driver?.email) &&
                      ` (${orderTripRef.current?.driver?.phoneNumber || orderTripRef.current?.driver?.email})`}
                  </>
                ) : (
                  t("common.empty")
                )}
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("order.vehicle_dispatch.driver_salary_detail.vehicle")}>
                {orderTripRef.current?.vehicle?.vehicleNumber}
                {orderTripRef.current?.vehicle?.idNumber && ` (${orderTripRef.current?.vehicle?.idNumber})`}
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("order.vehicle_dispatch.driver_salary_detail.route")}>
                {orderTripRef.current?.order?.route?.type === RouteType.FIXED ? (
                  <>
                    {orderTripRef.current?.order?.route?.code}
                    {orderTripRef.current?.order?.route?.name && ` (${orderTripRef.current?.order?.route?.name})`}
                  </>
                ) : (
                  t("order.vehicle_dispatch.driver_salary_detail.vehicle_not_fixed")
                )}
              </DescriptionProperty2>
            </div>
            <div className="sm:col-span-3">
              <DescriptionProperty2 label={t("order.vehicle_dispatch.driver_salary_detail.weight")}>
                <NumberLabel
                  value={orderTripRef.current?.weight}
                  unit={unitCode}
                  emptyLabel={t("common.empty")}
                  showUnitWhenEmpty={false}
                />
              </DescriptionProperty2>
            </div>
            <div className="col-span-full">
              {orderTripRef.current?.order?.route?.type === RouteType.FIXED ? (
                <DescriptionProperty2 label={t("order.vehicle_dispatch.driver_salary_detail.driver_cost")}>
                  {orderTripRef.current?.order?.route?.driverCost ? (
                    <Authorization
                      resource="customer-route"
                      action={["find", "edit"]}
                      fallbackComponent={
                        <NumberLabel
                          value={orderTripRef.current?.order?.route?.driverCost}
                          type="currency"
                          emptyLabel={t("common.empty")}
                          showUnitWhenEmpty={false}
                        />
                      }
                    >
                      {t.rich("order.vehicle_dispatch.driver_salary_detail.route_driver_cost_info", {
                        cost: () => (
                          <NumberLabel
                            value={orderTripRef.current?.order?.route?.driverCost}
                            type="currency"
                            emptyLabel={t("common.empty")}
                            showUnitWhenEmpty={false}
                          />
                        ),
                        route: () =>
                          orderTripRef.current?.order?.customer?.type === CustomerType.FIXED &&
                          orderTripRef.current?.order?.customer?.id &&
                          orderTripRef.current?.order?.route?.id ? (
                            <Link
                              useDefaultStyle
                              className="!font-medium"
                              target="_blank"
                              scroll
                              underline
                              href={`${orgLink}/customers/${encryptId(
                                orderTripRef.current?.order.customer.id
                              )}/routes/${encryptId(orderTripRef.current?.order.route.id)}/edit#cost-information`}
                            >
                              {orderTripRef.current?.order?.route?.code}
                            </Link>
                          ) : (
                            <span className="text-sm !font-medium leading-6">
                              {orderTripRef.current?.order?.route?.code}
                            </span>
                          ),
                      })}
                    </Authorization>
                  ) : (
                    <Authorization
                      alwaysAuthorized={
                        canFind() &&
                        (canEditCustomerRoute() ||
                          (canEditOwnCustomerRoute() &&
                            equalId(orderTripRef.current?.order?.customer?.createdByUser?.id, userId)))
                      }
                      fallbackComponent={
                        <span className="text-sm italic text-gray-500">
                          {t("order.vehicle_dispatch.driver_salary_detail.route_driver_cost_empty_info_cant_not_edit")}
                        </span>
                      }
                    >
                      {t.rich("order.vehicle_dispatch.driver_salary_detail.route_driver_cost_empty_info", {
                        strong: (chunks) => <span className="text-sm italic text-gray-500">{chunks}</span>,
                        link: (chunks) =>
                          orderTripRef.current?.order?.customer?.type === CustomerType.FIXED &&
                          orderTripRef.current?.order?.customer?.id &&
                          orderTripRef.current?.order?.route?.id ? (
                            <Link
                              useDefaultStyle
                              className="!font-normal italic"
                              underline
                              target="_blank"
                              scroll
                              href={`${orgLink}/customers/${encryptId(
                                orderTripRef.current?.order.customer.id
                              )}/routes/${encryptId(orderTripRef.current?.order.route.id)}/edit#cost-information`}
                            >
                              {chunks}
                            </Link>
                          ) : (
                            <span className="text-sm !font-normal italic leading-6">{chunks}</span>
                          ),
                      })}
                    </Authorization>
                  )}
                </DescriptionProperty2>
              ) : (
                <p className="text-sm font-normal italic leading-6 text-gray-900">
                  {t("order.vehicle_dispatch.driver_salary_detail.route_not_fixed_driver_cost_info")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-3 px-4 pb-4 pt-3 sm:grid-cols-6">
            <div className="sm:col-span-2 sm:col-start-1">
              <NumberField
                label={t("order.vehicle_dispatch_modal.subcontractor_cost")}
                name="subcontractorCost"
                onChange={handleChange}
                value={values.subcontractorCost}
                suffixText={t("common.unit.currency")}
                errorText={formatError(t, touched.subcontractorCost && errors.subcontractorCost)}
                disabled={!canEditDriverExpense()}
              />
            </div>
            <div className="sm:col-span-2">
              <NumberField
                label={t("order.vehicle_dispatch_modal.bridge_toll")}
                name="bridgeToll"
                onChange={handleChange}
                value={values.bridgeToll}
                suffixText={t("common.unit.currency")}
                errorText={formatError(t, touched.bridgeToll && errors.bridgeToll)}
                disabled={!canEditDriverExpense()}
              />
            </div>
            <div className="sm:col-span-2">
              <NumberField
                label={t("order.vehicle_dispatch_modal.other_cost")}
                name="otherCost"
                onChange={handleChange}
                value={values.otherCost}
                suffixText={t("common.unit.currency")}
                errorText={formatError(t, touched.otherCost && errors.otherCost)}
                disabled={!canEditDriverExpense()}
              />
            </div>
          </div>
          <div>
            {!!driverCost && !!driverExpenseTotal && Math.abs(driverCost - (driverExpenseTotal || 0)) !== 0 && (
              <div className="mt-3 px-3">
                <Alert
                  color="warning"
                  title={t.rich("order.vehicle_dispatch.driver_salary_detail.driver_cost_diff_info", {
                    driverCost: () => <NumberLabel value={driverCost || 0} type="currency" />,
                    driverExpense: () => <NumberLabel value={driverExpenseTotal} type="currency" />,
                    costDiff: () => (
                      <NumberLabel value={Math.abs(driverCost - (driverExpenseTotal || 0))} type="currency" />
                    ),
                  })}
                />
              </div>
            )}

            <div className="mt-3">
              <label className="whitespace-nowrap px-4 text-sm font-medium leading-6 text-gray-900">
                {t("order.vehicle_dispatch.driver_salary_detail.driver_cost")}
              </label>
              <TableContainer horizontalScroll verticalScroll className="!mt-2" inside variant="paper">
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableCell className="w-5" align="left">
                        {t("order.vehicle_dispatch.driver_salary_detail.cost_index")}
                      </TableCell>
                      <TableCell>{t("order.vehicle_dispatch.driver_salary_detail.cost_name")}</TableCell>
                      <TableCell className="w-56">
                        {t("order.vehicle_dispatch.driver_salary_detail.cost_amount")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Empty data */}
                    {driverExpenses.length === 0 && (
                      <TableRow hover={false} className="mx-auto max-w-lg">
                        <TableCell colSpan={3} className="px-6 lg:px-8">
                          <EmptyListSection
                            title={t("order.vehicle_dispatch.driver_salary_detail.no_driver_expense_title")}
                            description={t("order.vehicle_dispatch.driver_salary_detail.no_driver_expense_description")}
                          />
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Data */}
                    {renderDriverExpenses}
                    <TableRow>
                      <TableCell className="space-x-4" colSpan={3} align="right">
                        <span className="text-base font-medium leading-6 text-gray-900">
                          {t("order.vehicle_dispatch.driver_salary_detail.total")}
                        </span>
                        <span className="text-base font-medium leading-6 text-blue-700 hover:text-blue-600">
                          <NumberLabel value={driverExpenseTotal} type="currency" emptyLabel="0" />
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
            <Disclosure as={Fragment} defaultOpen>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    as="div"
                    className={cn("flex cursor-pointer flex-nowrap justify-between", {
                      "bg-gray-100 py-4": !open,
                      "bg-white pt-4": open,
                    })}
                  >
                    <span className="whitespace-nowrap px-4 text-sm font-medium leading-6 text-gray-900">
                      {t("order.vehicle_dispatch.driver_salary_detail.driver_cost")}
                    </span>

                    {open ? (
                      <ChevronUpIcon className="mr-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="mr-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel as={Fragment}>
                    <TableContainer className="!mt-0" inside variant="paper">
                      <Table dense>
                        <TableHead>
                          <TableRow>
                            <TableCell className="w-5" align="left">
                              {t("order.vehicle_dispatch.driver_salary_detail.cost_index")}
                            </TableCell>
                            <TableCell>{t("order.vehicle_dispatch.driver_salary_detail.cost_name")}</TableCell>
                            <TableCell className="w-56">
                              {t("order.vehicle_dispatch.driver_salary_detail.cost_amount")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Empty data */}
                          {driverExpenses.length === 0 && (
                            <TableRow hover={false} className="mx-auto max-w-lg">
                              <TableCell colSpan={3} className="px-6 lg:px-8">
                                <EmptyListSection
                                  title={t("order.vehicle_dispatch.driver_salary_detail.no_driver_expense_title")}
                                  description={t(
                                    "order.vehicle_dispatch.driver_salary_detail.no_driver_expense_description"
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          )}

                          {/* Data */}
                          {renderDriverExpenses}
                          <TableRow>
                            <TableCell className="space-x-4" colSpan={3} align="right">
                              <span className="text-base font-medium leading-6 text-gray-900">
                                {t("order.vehicle_dispatch.driver_salary_detail.total")}
                              </span>
                              <span className="text-base font-medium leading-6 text-blue-700 hover:text-blue-600">
                                <NumberLabel value={driverExpenseTotal} type="currency" emptyLabel="0" />
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          {/* Customer expenses */}
          <div className="mt-3">
            <Disclosure as={Fragment}>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    as="div"
                    className={cn("flex cursor-pointer flex-nowrap justify-between", {
                      "bg-gray-100 py-4": !open,
                      "bg-white pt-4": open,
                    })}
                  >
                    <span className="whitespace-nowrap px-4 text-sm font-medium leading-6 text-gray-900">
                      Chi phí chuyến
                    </span>

                    {open ? (
                      <ChevronUpIcon className="mr-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="mr-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel as={Fragment}>
                    <TableContainer className="!mt-0" inside variant="paper">
                      <Table dense>
                        <TableHead>
                          <TableRow>
                            <TableCell className="w-5" align="left">
                              {t("order.vehicle_dispatch.driver_salary_detail.cost_index")}
                            </TableCell>
                            <TableCell>{t("order.vehicle_dispatch.driver_salary_detail.cost_name")}</TableCell>
                            <TableCell className="w-56">
                              {t("order.vehicle_dispatch.driver_salary_detail.cost_amount")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Data */}
                          {customerExpenses.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell align="left">{index + 1}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>
                                <NumberField
                                  className="whitespace-break-spaces"
                                  name={item.key}
                                  suffixText={t("common.unit.currency")}
                                  onChange={handleChange}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="space-x-4" colSpan={3} align="right">
                              <span className="text-base font-medium leading-6 text-gray-900">
                                {t("order.vehicle_dispatch.driver_salary_detail.total")}
                              </span>
                              <span className="text-base font-medium leading-6 text-blue-700 hover:text-blue-600">
                                <NumberLabel value={driverExpenseTotal} type="currency" emptyLabel="0" />
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>

          <div className="grid grid-cols-1 gap-x-3 px-4 pb-4 pt-3 sm:grid-cols-6">
            <div className="col-span-full">
              <TextField
                label={t("order.vehicle_dispatch_modal.notes")}
                name="notes"
                maxLength={255}
                onChange={handleChange}
                value={ensureString(values.notes)}
                multiline
                errorText={formatError(t, touched.notes && errors.notes)}
                disabled={!canEditDriverExpense()}
              />
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <Button type="button" variant="outlined" disabled={isSubmitting} onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Authorization resource="trip-driver-expense" action="edit">
            {orderTripRef.current?.order?.route?.type === RouteType.FIXED && (
              <Button
                type="button"
                variant="outlined"
                icon={ArrowPathIcon}
                disabled={isSubmitting}
                onClick={handleResetExpense}
              >
                {t("order.vehicle_dispatch.vehicle_dispatch_reset_trip_driver_expense_button")}
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </Authorization>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default memo(TripExpenseModal);
