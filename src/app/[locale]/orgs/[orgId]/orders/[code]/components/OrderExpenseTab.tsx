"use client";

import { PencilSquareIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { FormikHelpers, useFormik } from "formik";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { TfiSave as TfiSaveIcon } from "react-icons/tfi";

import { upsertOrderTripExpense } from "@/actions/orderTripExpense";
import {
  InfoBox,
  NumberLabel,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Visible,
} from "@/components/atoms";
import { Authorization, EmptyListSection, NumberField } from "@/components/molecules";
import { OrderTripExpenseInputForm } from "@/forms/orderTripExpense";
import { useAuth, useExpenseTypeOptions, useOrderTripsWithExpenses, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { HttpStatusCode } from "@/types/api";
import { OrderTripExpenseInfo, OrderTripInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { CustomerExpensePreviewModal, LoadingSkeletonTable } from ".";

const initialFormValues: OrderTripExpenseInputForm = {
  orderTripExpenses: [],
};

const OrderExpenseTab = () => {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const { orgId, orgLink, userId } = useAuth();
  const { canEdit, canEditOwn } = usePermission("order-trip-expense");
  const { canNew } = usePermission("expense-type");
  const { showNotification } = useNotification();
  const { code } = useParams();
  const t = useTranslations();
  const selectedOrderTripRef = useRef("");
  const [selectedOrderTripExpense, setSelectedOrderTripExpense] = useState<Partial<OrderTripExpenseInfo>>();

  const { expenseTypes, isLoading: expenseTypesLoading } = useExpenseTypeOptions({ organizationId: orgId });
  const {
    orderTrips,
    isLoading: orderTripsLoading,
    mutate,
  } = useOrderTripsWithExpenses({
    organizationId: orgId,
    code: ensureString(code),
  });
  const dataLoading = orderTripsLoading || expenseTypesLoading;

  /**
   * Handles form submission for upserting order trip expenses.
   * - Calls the upsert API.
   * - Displays success or error notification based on result.
   * - Triggers data revalidation if successful.
   *
   * @param values - Form values containing order trip expenses.
   * @param formikHelpers - Formik helpers to control form state.
   */
  const handleSubmitFormik = useCallback(
    async (values: OrderTripExpenseInputForm, formikHelpers: FormikHelpers<OrderTripExpenseInputForm>) => {
      const { status } = await upsertOrderTripExpense(values);

      if (status !== HttpStatusCode.Ok) {
        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
        });
      } else {
        // Show a success notification
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("components.order_trip_expense.save_expense_success_message", {
            code: selectedOrderTripRef.current,
            expenseType: selectedOrderTripExpense?.expenseType?.name?.toLowerCase(),
          }),
        });
        mutate();
      }

      formikHelpers.resetForm();
      formikHelpers.setSubmitting(false);
      setEditIndex(null);
    },
    [mutate, selectedOrderTripExpense?.expenseType?.name, showNotification, t]
  );

  const { values, dirty, handleChange, handleSubmit, setValues, isSubmitting } = useFormik({
    initialValues: initialFormValues,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Handles saving the preview modal.
   * - Calls the mutate function to refresh data.
   * - Closes the modal.
   */
  const onSavePreviewModal = useCallback(() => {
    mutate();
    setOpen(false);
  }, [mutate]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, t]);

  /**
   * Opens the edit form for a specific order trip.
   * - Sets the editing index.
   * - Prepares and sets form values based on existing expenses.
   *
   * @param index - Index of the order trip being edited.
   * @param orderTrip - The selected order trip data.
   */
  const handleOpenForm = useCallback(
    (index: number, orderTrip: OrderTripInfo) => () => {
      setEditIndex(index);
      selectedOrderTripRef.current = orderTrip.code ?? "";
      const orderTripExpenses = expenseTypes.map((expenseType) => {
        const matchedExpense = orderTrip.expenses?.find((e) => e.expenseType?.id === expenseType.id);

        return {
          id: matchedExpense?.id,
          amount: matchedExpense?.amount ?? 0,
          expenseTypeId: expenseType.id,
          orderTripId: orderTrip.id,
        };
      });

      setValues({
        orderTripExpenses,
      });
    },
    [expenseTypes, setValues]
  );

  /**
   * Opens the preview modal for a specific order trip expense.
   *
   * @param orderTripExpense - The expense data to preview.
   */
  const handleOpenPreviewModal = useCallback(
    (orderTripExpense: Partial<OrderTripExpenseInfo> | undefined) => () => {
      setSelectedOrderTripExpense(orderTripExpense);
      selectedOrderTripRef.current = orderTripExpense?.trip?.code ?? "";
      setOpen(true);
    },
    []
  );

  /**
   * Closes the preview modal and clears the selected expense data.
   */
  const handleClosePreviewModal = useCallback(() => {
    setOpen(false);
  }, []);

  /**
   * Handles saving the form by submitting data and resetting the edit state.
   */
  const handleSave = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  // Check if the order trip contains an expense with the given expense type ID
  const hasExpenseType = useCallback((orderTrip: OrderTripInfo, expenseTypeId: number) => {
    return orderTrip.expenses?.some((exp) => exp.expenseType?.id === expenseTypeId) ?? false;
  }, []);

  if (dataLoading) {
    return <LoadingSkeletonTable />;
  }

  if (!dataLoading && expenseTypes.length === 0)
    return (
      <EmptyListSection
        actionLink={canNew() ? `${orgLink}/settings/expense-types/new` : undefined}
        description={
          canNew()
            ? t("components.order_trip_expense.empty_expense_type_message")
            : t("components.order_trip_expense.no_expense_type_found")
        }
      />
    );

  return (
    <>
      <form method="POST" onSubmit={handleSubmit}>
        <TableContainer className="!mt-0" horizontalScroll verticalScroll allowFullscreen inside stickyHeader>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2} className="sticky left-0 z-50 !bg-blue-50">
                  {t("components.order_trip_expense.title")}
                </TableCell>
                {expenseTypes.map((expenseType) => (
                  <TableCell key={expenseType.id} align="right" className="!bg-blue-50">
                    {expenseType.name}
                  </TableCell>
                ))}
                <TableCell align="right" className="!bg-blue-50">
                  {t("components.order_trip_expense.total")}
                </TableCell>
                <TableCell className="!bg-blue-50" action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {orderTrips.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={expenseTypes.length + 3} className="px-6 lg:px-8">
                    <EmptyListSection description={t("components.order_trip_expense.empty_trip_message")} />
                  </TableCell>
                </TableRow>
              )}

              {orderTrips.map((orderTrip, index) => (
                <TableRow key={orderTrip.id} className="hover:!bg-gray-50">
                  <TableCell className="sticky left-0 border-b border-gray-200">
                    <InfoBox
                      className="px-2"
                      label={orderTrip.code}
                      subLabel2={`${orderTrip.driver?.lastName} ${orderTrip.driver?.firstName}`}
                    />
                  </TableCell>
                  {expenseTypes.map((expenseType, expenseTypeIndex) => (
                    <TableCell key={expenseType.id} align="right">
                      {editIndex === index ? (
                        <NumberField
                          allowNegative={false}
                          maxLength={11}
                          value={values.orderTripExpenses[expenseTypeIndex]?.amount}
                          name={`orderTripExpenses[${expenseTypeIndex}].amount`}
                          onChange={handleChange}
                          className="[&_input]:text-end"
                        />
                      ) : (
                        <div className="flex flex-nowrap items-center justify-end gap-x-2">
                          <NumberLabel
                            value={
                              orderTrip.expenses?.find((exp) => exp.expenseType?.id === expenseType.id)?.amount ?? 0
                            }
                            type="currency"
                          />
                          {hasExpenseType(orderTrip, expenseType.id) && (
                            <Visible
                              when={canEdit() || (canEditOwn() && equalId(orderTrip?.createdByUser?.id, userId))}
                            >
                              <PhotoIcon
                                onClick={handleOpenPreviewModal(
                                  orderTrip.expenses?.find((exp) => exp.expenseType?.id === expenseType.id)
                                )}
                                className="h-4 w-4 cursor-pointer select-none text-blue-500"
                                aria-hidden="true"
                              />
                            </Visible>
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}

                  <TableCell align="right" className="font-semibold !text-gray-900">
                    <NumberLabel
                      value={orderTrip?.expenses?.reduce((sum, exp) => sum + (exp.amount ?? 0), 0)}
                      type="currency"
                    />
                  </TableCell>
                  <TableCell className="!pl-4" align="right">
                    {isSubmitting && editIndex === index ? (
                      <Spinner />
                    ) : editIndex === index ? (
                      <TfiSaveIcon
                        role="button"
                        onClick={handleSave}
                        className="h-4 w-4 cursor-pointer select-none text-blue-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Authorization
                        resource="order-trip-expense"
                        action="edit"
                        alwaysAuthorized={canEditOwn() && equalId(orderTrip?.createdByUser?.id, userId)}
                      >
                        <PencilSquareIcon
                          onClick={!isSubmitting ? handleOpenForm(index, orderTrip) : undefined}
                          className={`h-5 w-5 ${
                            isSubmitting ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-blue-500"
                          } select-none`}
                          aria-hidden="true"
                        />
                      </Authorization>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="sticky bottom-0 z-10">
                <TableCell className="sticky left-0 z-10 !bg-blue-100">
                  <span className="px-2 font-semibold !text-gray-900">{t("components.order_trip_expense.total")}</span>
                </TableCell>
                {expenseTypes.map((expenseType) => (
                  <TableCell
                    key={expenseType.id}
                    align="right"
                    className="!bg-blue-100 !pl-2 font-semibold !text-gray-900"
                  >
                    <NumberLabel
                      value={orderTrips.reduce(
                        (sum, orderTrip) =>
                          sum +
                            ((orderTrip?.expenses ?? []).find((exp) => exp?.expenseType?.id === expenseType?.id)
                              ?.amount ?? 0) || 0,
                        0
                      )}
                      type="currency"
                    />
                  </TableCell>
                ))}
                <TableCell align="right" className="!bg-blue-100 font-semibold !text-gray-900">
                  <NumberLabel
                    value={orderTrips.reduce(
                      (sum, orderTrip) =>
                        sum + (orderTrip?.expenses?.reduce((sumExp, exp) => sumExp + (exp.amount ?? 0), 0) ?? 0),
                      0
                    )}
                    type="currency"
                  />
                </TableCell>
                <TableCell className="!bg-blue-100" action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </form>

      <CustomerExpensePreviewModal
        open={open}
        onClose={handleClosePreviewModal}
        orderTripExpense={selectedOrderTripExpense}
        orderTripCode={selectedOrderTripRef.current}
        onSave={onSavePreviewModal}
      />
    </>
  );
};

export default OrderExpenseTab;
