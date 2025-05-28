"use client";

import { RouteType } from "@prisma/client";
import clsx from "clsx";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions } from "@/components/atoms";
import {
  Authorization,
  Button,
  InputGroup,
  NumberField,
  PageHeader,
  RouteCostInfoForm,
  RouteInfoForm,
  RoutePointForm,
} from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { RouteInputForm, routeInputFormSchema } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useAuth, useIdParam, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useRouteState } from "@/redux/states";
import { getCustomerName } from "@/services/client/customers";
import { getDriverExpenses } from "@/services/client/driverExpense";
import { createRoute, getRoute, updateRoute } from "@/services/client/route";
import { getRouteDriverExpenses } from "@/services/client/routeDriverExpense";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { DriverExpenseInfo, RouteDriverExpenseInfo, RouteInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, errorMaxLength, errorMin, errorType, formatError } from "@/utils/yup";

const initialFormValues: RouteInputForm = {
  code: "",
  name: "",
  description: "",
  distance: null,
  price: null,
  subcontractorCost: null,
  driverCost: null,
  bridgeToll: null,
  otherCost: null,
  isActive: true,
};

enum RoutePointKey {
  PickupPoints = "pickupPoints",
  DeliveryPoints = "deliveryPoints",
}

type RouteFormProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId"> & {
  screenMode: ScreenMode;
  inModal?: boolean;
  id?: number | null;
  encryptedId?: string | null;
  modalCustomerId?: number;
  onCreateCustomerRoute?: (id: number) => void;
  onCloseCreateCustomerModal?: () => void;
};

const RouteForm = ({
  orgId,
  orgLink,
  userId,
  screenMode,
  id,
  encryptedId,
  inModal = false,
  modalCustomerId,
  onCreateCustomerRoute,
  onCloseCreateCustomerModal,
}: RouteFormProps) => {
  const router = useRouter();
  const { org } = useAuth();
  const { originId: customerId, encryptedId: encryptedCustomerId, encryptId } = useIdParam({ name: "customerId" });
  const t = useTranslations();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useRouteState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>();
  const [driverExpenses, setDriverExpenses] = useState<DriverExpenseInfo[]>([]);
  const { canEdit, canEditOwn } = usePermission("customer-route");
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const formikRef = useRef<FormikProps<RouteInputForm>>(null);
  const routeDriverExpenseRef = useRef<RouteDriverExpenseInfo[]>([]);
  const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();

  /**
   * Initial values for the form representing driver expenses keyed by expense IDs.
   */
  const initialWithDriverExpensesValues = useMemo(() => {
    const values: RouteInputForm = {};
    driverExpenses.forEach((item) => {
      values[item.key] = null;
    });
    return {
      ...initialFormValues,
      ...values,
    };
  }, [driverExpenses]);

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
   * Yup schema for validating the form values related to driver expenses in the route form.
   */
  const routeWithDriverExpenseInputFormSchema = useMemo(() => {
    // Initialize an empty schema object
    const schema: YubObjectSchema<RouteInputForm> = {};
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
      ...routeInputFormSchema.fields,
      ...schema,
    });
  }, [driverExpenses]);

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const routesUrl = useMemo(() => {
    if (searchQueryString) {
      return `${searchQueryString}&tab=routes`;
    }

    return "?tab=routes";
  }, [searchQueryString]);

  /**
   * Updating the breadcrumb navigation.
   */
  const updateBreadcrumb = useCallback(async () => {
    let customerName;
    if (customerId) {
      customerName = await getCustomerName(orgId, customerId);
    }

    const payload: BreadcrumbItem[] = [
      { name: t("customer.manage"), link: orgLink },
      { name: t("customer.title"), link: `${orgLink}/customers` },
      {
        name: ensureString(customerName) || ensureString(encryptedCustomerId),
        link: `${orgLink}/customers/${encryptedCustomerId}`,
      },
      {
        name: t("customer.route.title"),
        link: `${orgLink}/customers/${encryptedCustomerId}${routesUrl}`,
      },
    ];

    if (newMode) {
      payload.push({
        name: t("common.new"),
        link: `${orgLink}/customers/${encryptedCustomerId}/routes/new`,
      });
    }
    if (editMode) {
      payload.push({
        name: routeInfo?.name || ensureString(encryptedId),
        link: `${orgLink}/customers/${encryptedCustomerId}/routes/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, orgLink, searchQueryString, encryptedCustomerId, routesUrl, routeInfo?.name, encryptedCustomerId]);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    if (!inModal) {
      updateBreadcrumb();
    }
  }, [inModal, updateBreadcrumb]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a route form using Formik.
   *
   * @param {RouteInputForm} values - The form values representing a route.
   * @param {FormikHelpers<RouteInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles route creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: RouteInputForm, formikHelpers: FormikHelpers<RouteInputForm>) => {
      // Prepare trip driver expense entities from the form values
      const routeDriverExpenseEntity: Partial<RouteDriverExpenseInfo>[] = [];
      driverExpenses.forEach((item) => {
        if (item.key !== null) {
          routeDriverExpenseEntity.push({
            driverExpense: {
              id: Number(item.id),
            },
            ...(editMode &&
              routeInfo?.id && {
                id: routeDriverExpenseRef.current.find((r) => r.driverExpense?.key === item.key)?.id,
              }),
            amount: Number(values[item.key]) || 0,
          });
        }
      });

      // Check if it's a new route or an update
      let result: ApiResult<number> | undefined;
      const driverCost = Object.keys(values)
        .filter((key) => driverExpenses.find((item) => item.key === key))
        .reduce((acc, key) => acc + (Number(values[key]) || 0), 0);

      const entities = {
        ...deleteProperties(values, [...driverExpenses.map((item) => item.key), "createdByUser"]),
        distance: values?.distance ? values.distance : null,
        price: values?.price ? values.price : null,
        bridgeToll: values?.bridgeToll ? values.bridgeToll : null,
        driverCost: driverCost ? driverCost : null,
        subcontractorCost: values?.subcontractorCost ? values.subcontractorCost : null,
        otherCost: values?.otherCost ? values.otherCost : null,
        pickupPoints: values.pickupPoints?.map((item) => ({ id: item.id }) as RoutePointInputForm),
        deliveryPoints: values.deliveryPoints?.map((item) => ({ id: item.id }) as RoutePointInputForm),
      };

      const currentCustomerId = inModal && modalCustomerId ? modalCustomerId : Number(customerId);
      const currentEncryptedCustomerId = inModal && modalCustomerId ? encryptId(modalCustomerId) : encryptedCustomerId;

      if (newMode) {
        const { status, code, data, message } = await createRoute(
          {
            organizationCode: ensureString(org?.code),
            encryptedCustomerId: ensureString(currentEncryptedCustomerId),
          },
          {
            ...entities,
            type: RouteType.FIXED,
            customerId: currentCustomerId,
            driverExpenses: routeDriverExpenseEntity,
          }
        );

        result = { status, code, data, message };
      } else {
        if (routeInfo?.id) {
          const { status, code, data, message } = await updateRoute(
            {
              organizationCode: ensureString(org?.code),
              encryptedId: ensureString(encryptedId),
              encryptedCustomerId: ensureString(currentEncryptedCustomerId),
            },
            {
              route: {
                ...entities,
                id: Number(id),
                customerId: Number(customerId),
                driverExpenses: routeDriverExpenseEntity,
              },
              lastUpdatedAt: routeInfo?.updatedAt,
            }
          );

          result = { status, code, data, message };
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.status !== HttpStatusCode.Ok) {
        // Handle different error types
        let message = "";
        switch (result.message) {
          case ErrorType.EXISTED:
            message = errorExists("customer.route.id");
            formikHelpers.setFieldError("code", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.code });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.code });
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
        // Show a success notification and navigate to the merchandise types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.code }),
        });

        if (inModal) {
          onCreateCustomerRoute && result.data && onCreateCustomerRoute(result.data);
        } else {
          setItemString(SESSION_FLASHING_ID, ensureString(result.data), {
            security: false,
          });
          router.push(`${orgLink}/customers/${encryptedCustomerId}${routesUrl}`);
        }
      }
    },
    [
      driverExpenses,
      inModal,
      modalCustomerId,
      customerId,
      encryptId,
      encryptedCustomerId,
      newMode,
      editMode,
      routeInfo?.id,
      routeInfo?.updatedAt,
      org?.code,
      encryptedId,
      id,
      showNotification,
      t,
      onCreateCustomerRoute,
      router,
      orgLink,
      routesUrl,
    ]
  );

  /**
   * Fetching route data when in edit or copy mode.
   * If the data is found, it sets the route initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the routes settings page.
   */
  const fetchRoute = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }

    const [result, routeDriverExpenseData] = await Promise.all([
      getRoute(orgId, userId, Number(id)),
      getRouteDriverExpenses({
        organizationId: orgId,
        route: {
          id: Number(id),
        },
      }),
    ]);

    routeDriverExpenseRef.current = routeDriverExpenseData;
    const driverExpensesSet = new Set(driverExpenses.map((item) => item.key));
    setAwaitFetchData(false);

    if (result) {
      setRouteInfo(result);
      formikRef.current?.resetForm({
        values: {
          ...result,
          ...(routeDriverExpenseData.length > 0 && {
            ...routeDriverExpenseData.reduce((acc, item) => {
              if (item.driverExpense?.key && driverExpensesSet.has(item.driverExpense.key)) {
                acc[item.driverExpense.key] = Number(item.amount);
              }
              return acc;
            }, {} as RouteInputForm),
          }),
        },
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/customers/${encryptedCustomerId}${routesUrl}`);
      }
    }

    if (routeInfo?.type && routeInfo.type !== RouteType.FIXED) {
      router.push(`${orgLink}/customers`);
    }
  }, [
    driverExpenses,
    editMode,
    encryptedCustomerId,
    id,
    orgId,
    orgLink,
    routeInfo?.type,
    router,
    routesUrl,
    showNotification,
    t,
    userId,
  ]);

  /**
   * Fetching route data when in edit or copy mode.
   */
  useEffect(() => {
    if ((editMode || copyMode) && driverExpenses.length > 0) {
      fetchRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverExpenses]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
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
  }, [formikRef.current?.dirty, t]);

  /**
   * Handle the cancel button click event. If there are unsaved changes (dirty),
   * it opens a confirmation dialog. Otherwise, it navigates back to the previous page.
   */
  const handleCancelClick = useCallback(() => {
    if (formikRef.current?.dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [router]);

  /**
   * Handle the cancellation of confirmation dialog.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * Action component of the form.
   *
   * @param {boolean} isSubmitting - Whether the form is submitting.
   * @returns {JSX.Element} The action component.
   */
  const actionComponent = useCallback(
    (isSubmitting: boolean): JSX.Element => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, t]
  );

  /**
   * Handle the close event of the create customer route modal.
   */
  const handleCloseCreateCustomerRouteModal = useCallback(() => {
    onCloseCreateCustomerModal && onCloseCreateCustomerModal();
  }, [onCloseCreateCustomerModal]);

  return (
    <>
      <Formik
        innerRef={formikRef}
        initialValues={initialWithDriverExpensesValues}
        validationSchema={routeWithDriverExpenseInputFormSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ values, isSubmitting, touched, errors, handleChange, handleSubmit }) => (
          <Authorization
            showAccessDenied
            resource="customer-route"
            action={["new", "edit", "edit-own"]}
            type="oneOf"
            isAccessDenied={
              !awaitFetchData &&
              editMode &&
              !canEdit() &&
              canEditOwn() &&
              !equalId(routeInfo?.createdByUser?.id, userId)
            }
          >
            <form method="POST" onSubmit={handleSubmit}>
              {!inModal && (
                <PageHeader
                  title={t("customer.route.title")}
                  description={t("customer.route.route_description")}
                  actionHorizontal
                  actionComponent={actionComponent(isSubmitting)}
                />
              )}

              <div
                className={clsx({
                  "space-y-12": !inModal,
                  "space-y-8 px-4 pb-4 pt-5 sm:p-6": inModal,
                })}
              >
                <InputGroup
                  title={newMode ? t("customer.route.new_route_title") : t("customer.route.route_information")}
                  className={clsx({ "!pb-8": inModal })}
                >
                  <RouteInfoForm inModal={inModal} />
                </InputGroup>
                <InputGroup
                  title={
                    mergeDeliveryAndPickup
                      ? t("customer.route.pickup_delivery_info_title")
                      : t("customer.route.pickup_info_title")
                  }
                  description={
                    mergeDeliveryAndPickup
                      ? t("customer.route.pickup_delivery_info_description")
                      : t("customer.route.pickup_info_description")
                  }
                  className={clsx({ "!pb-8": inModal })}
                >
                  <RoutePointForm routePoint={RoutePointKey.PickupPoints} />
                </InputGroup>

                {!mergeDeliveryAndPickup && (
                  <InputGroup
                    title={t("customer.route.delivery_info_title")}
                    description={t("customer.route.delivery_info_description")}
                    showBorderBottom={!inModal}
                    className={clsx({ "!pb-2": inModal })}
                  >
                    <RoutePointForm routePoint={RoutePointKey.DeliveryPoints} />
                  </InputGroup>
                )}

                {!inModal && (
                  <>
                    <InputGroup
                      title={t("customer.route.distance_information")}
                      description={t("customer.route.distance_info_description")}
                      showBorderBottom={!inModal}
                    >
                      <div className="sm:col-span-2">
                        <NumberField
                          label={t("customer.route.distance")}
                          name="distance"
                          suffixText="KM"
                          value={values?.distance}
                          onChange={handleChange}
                          errorText={formatError(t, touched.distance && errors.distance)}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <NumberField
                          label={t("customer.route.min_bol_submit_days")}
                          name="minBOLSubmitDays"
                          suffixText={t("customer.route.days")}
                          value={values?.minBOLSubmitDays}
                          onChange={handleChange}
                          errorText={formatError(t, touched.minBOLSubmitDays && errors.minBOLSubmitDays)}
                        />
                      </div>
                    </InputGroup>

                    {/* <InputGroup
                      title="Thông tin chi phí khung xe"
                      description="Thông tin chi phí khung xe liên quan đến tuyến xe này"
                      showBorderBottom={!inModal}
                    >
                      {vehicleUnitPriceFormDisplayed ? (
                        <VehicleUnitPriceForm />
                      ) : (
                        <button
                          type="button"
                          className="col-span-full text-left text-sm font-semibold text-blue-600 hover:text-blue-700"
                          onClick={handleVehicleUnitPriceFormDisplayed}
                        >
                          + Thêm chi phí khung xe
                        </button>
                      )}
                    </InputGroup> */}

                    <InputGroup
                      id="cost-information"
                      title={t("customer.route.cost_info")}
                      description={t("customer.route.cost_info_description")}
                    >
                      <RouteCostInfoForm driverExpenses={driverExpenses} />
                    </InputGroup>
                  </>
                )}
              </div>

              {inModal ? (
                <ModalActions>
                  <Button
                    type="button"
                    variant="outlined"
                    color="secondary"
                    disabled={isSubmitting}
                    onClick={handleCloseCreateCustomerRouteModal}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {t("common.save")}
                  </Button>
                </ModalActions>
              ) : (
                <div className="mt-4 max-sm:px-4">{actionComponent(isSubmitting)}</div>
              )}
            </form>
          </Authorization>
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
    </>
  );
};

export default RouteForm;
