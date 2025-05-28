"use client";

import { AdvanceAdvanceType, AdvanceStatus, AdvanceType } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdvanceGeneralForm, Authorization, Button, InputGroup, PageHeader, TextField } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { advanceFormSchema, AdvanceInputForm } from "@/forms/advance";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useAdvanceState } from "@/redux/states";
import { createAdvance, getAdvance, updateAdvance } from "@/services/client/advance";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { AdvanceInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { startOfMonth } from "@/utils/date";
import { equalId, formatCurrency } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: AdvanceInputForm = {
  type: AdvanceType.DRIVER,
  advanceType: AdvanceAdvanceType.SALARY,
  amount: null,
  driverId: null,
  subcontractorId: null,
  orderId: null,
  orderTripId: null,
  status: AdvanceStatus.PENDING,
  paymentById: null,
  paymentDate: new Date(),
  rejectionDate: null,
  rejectionReason: null,
  description: null,
  monthOfTrip: startOfMonth(new Date()),
};

type AdvanceFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const AdvanceForm = ({ orgId, orgLink, userId, screenMode, id, encryptedId }: AdvanceFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useAdvanceState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AdvanceStatus>();
  const { canEditOwn, canEdit } = usePermission("advance");
  const [awaitFetchData, setAwaitFetchData] = useState(true);

  const advanceRef = useRef<AdvanceInfo>();
  const formikRef = useRef<FormikProps<AdvanceInputForm>>(null);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isRejected = useMemo(() => currentStatus === AdvanceStatus.REJECTED && editMode, [currentStatus, editMode]);

  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("advance.management"), link: orgLink },
      { name: t("advance.title"), link: `${orgLink}/advances${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/advances/new` });
    }

    if (editMode) {
      const currentAdvance = advanceRef.current;
      const currentName =
        currentAdvance?.type === AdvanceType.DRIVER
          ? getFullName(currentAdvance?.driver?.firstName, currentAdvance?.driver?.lastName)
          : currentAdvance?.subcontractor?.name;
      payload.push({
        name: currentName || `${encryptedId}`,
        link: `${orgLink}/advances/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLink, advanceRef.current, searchQueryString]);

  /**
   * Handle the navigation to the previous page.
   * Uses the router object to navigate back.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a advance form using Formik.
   *
   * @param {AdvanceInputForm} values - The form values representing a advance.
   * @param {FormikHelpers<AdvanceInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles advance creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: AdvanceInputForm, formikHelpers: FormikHelpers<AdvanceInputForm>) => {
      const { driverId, subcontractorId, orderTripId, paymentDate, ...otherEntities } = deleteProperties(values, [
        "monthOfTrip",
      ]);
      let result: MutationResult<AdvanceInfo> | undefined;
      // Check if it's a new advance or an update
      if (newMode) {
        result = await createAdvance({
          ...deleteProperties(otherEntities as AdvanceInfo, ["paymentDate"]),
          ...(values.advanceType === AdvanceAdvanceType.COST && { orderTripId }),
          ...(values.type === AdvanceType.DRIVER && { driverId, subcontractorId: null }),
          ...(values.type === AdvanceType.SUBCONTRACTOR && { subcontractorId, driverId: null }),
          ...(values.status === AdvanceStatus.PAYMENT && { paymentById: userId, paymentDate }),
          organizationId: orgId,
          createdById: userId,
        });
      } else {
        if (advanceRef.current?.id && !isRejected) {
          result = await updateAdvance(
            {
              ...(otherEntities as AdvanceInfo),
              ...(values.advanceType === AdvanceAdvanceType.COST && { orderTripId }),
              ...(values.type === AdvanceType.DRIVER && { driverId, subcontractorId: null }),
              ...(values.type === AdvanceType.SUBCONTRACTOR && { subcontractorId, driverId: null }),
              ...(values.status === AdvanceStatus.PAYMENT && { paymentById: userId, paymentDate }),
              id: Number(advanceRef.current.id),
              organizationId: orgId,
              updatedById: userId,
            },
            advanceRef.current?.updatedAt
          );
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.error) {
        // Handle different error types
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive");
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", {
              name: t("advance.display_amount", {
                amount: formatCurrency(Number(values.amount)),
              }),
            });
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        // Show success notification message and redirect to advance page if API call is successful
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: t("advance.display_amount", {
              amount: formatCurrency(Number(values.amount)),
            }),
          }),
        });
        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/advances${searchQueryString}`);
      }
    },
    [isRejected, newMode, orgId, orgLink, router, searchQueryString, showNotification, t, userId]
  );

  /**
   * Fetch advance data from the API.
   */
  const fetchAdvance = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }
    const result = await getAdvance(Number(id), orgId);
    advanceRef.current = result;
    setAwaitFetchData(false);

    if (result) {
      const { driver, subcontractor, orderTrip, paymentDate, ...otherEntities } = deleteProperties(result, [
        "updatedAt",
      ]);
      formikRef.current?.resetForm({
        values: {
          ...initialFormValues,
          ...otherEntities,
          ...(driver?.id && { driverId: driver?.id, subcontractorId: null }),
          ...(subcontractor?.id && { subcontractorId: subcontractor?.id, driverId: null }),
          ...(orderTrip?.id ? { orderTripId: orderTrip?.id } : { orderTripId: null }),
          ...(copyMode && { status: AdvanceStatus.PENDING }),
          ...(orderTrip?.pickupDate && { monthOfTrip: new Date(orderTrip?.pickupDate) }),
          ...(orderTrip?.code && { orderTripCode: orderTrip?.code }),
          ...(paymentDate && { paymentDate: new Date(paymentDate) }),
        },
      });
      setCurrentStatus(copyMode ? AdvanceStatus.PENDING : result.status);
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/advances${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editMode || copyMode) {
      fetchAdvance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (formikRef.current?.dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [t]);

  /**
   * Handle the cancel button click.
   */
  const handleCancelClick = useCallback(() => {
    if (formikRef.current?.dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [router]);

  /**
   * Handle the cancel action.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  const actionComponent = useCallback(
    (isSubmitting: boolean): JSX.Element => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isRejected} loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, t, isRejected]
  );

  return (
    <Authorization
      showAccessDenied
      resource="advance"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(advanceRef.current?.createdByUser.id, userId)
      }
    >
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={advanceFormSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ values, touched, errors, isSubmitting, handleChange, handleSubmit }) => (
          <form method="POST" onSubmit={handleSubmit}>
            <PageHeader
              title={t("advance.advance_info_title")}
              description={t("advance.advance_info_description")}
              actionHorizontal
              actionComponent={actionComponent(isSubmitting)}
            />

            <div className="space-y-12 max-sm:px-4">
              <InputGroup title={t("advance.general_title")} description={t("advance.general_description")}>
                <AdvanceGeneralForm
                  organizationId={orgId}
                  currentStatus={advanceRef.current?.status}
                  screenMode={screenMode}
                />
              </InputGroup>

              <InputGroup title={t("advance.note_info_title")} description={t("advance.note_info_description")}>
                <div className="col-span-full">
                  <TextField
                    label={t("advance.note")}
                    name="description"
                    multiline
                    rows={4}
                    maxLength={500}
                    showCount
                    disabled={isRejected}
                    value={ensureString(values.description)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.description && errors.description)}
                  />
                </div>
              </InputGroup>
            </div>
            <div className="mt-4 max-sm:px-4">{actionComponent(isSubmitting)}</div>
          </form>
        )}
      </Formik>

      {/* Cancel confirmation dialog */}
      <ConfirmModal
        open={isCancelConfirmOpen}
        icon="question"
        title={t("common.confirmation.cancel_title")}
        message={t("common.confirmation.cancel_message")}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={goBack}
      />
    </Authorization>
  );
};

export default AdvanceForm;
