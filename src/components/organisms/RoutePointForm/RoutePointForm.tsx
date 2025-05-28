"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { FormikHelpers, useFormik } from "formik";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRoutePoint, getRoutePoint, updateRoutePoint } from "@/actions/routePoint";
import {
  Badge,
  DescriptionProperty2,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import {
  AddressInformation,
  AdjacentPointsModal,
  Authorization,
  Button,
  Combobox,
  EmptyListSection,
  InputGroup,
  PageHeader,
  RadioGroup,
  TextField,
  VehicleTypeModal,
  WorkTimeModal,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { RoutePointInputForm, routePointInputValidationSchema, RoutePointTimeRange } from "@/forms/routePoint";
import { usePermission, useZoneOptions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { routePointAtom } from "@/states";
import { BreadcrumbItem } from "@/types";
import { ActionResult } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { RoutePointInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { safeParseArray } from "@/utils/object";
import { setItemString } from "@/utils/storage";
import { ensureString, trim } from "@/utils/string";
import { cn } from "@/utils/twcn";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: RoutePointInputForm = {
  code: "",
  name: "",
  notes: "",
  requestedNote: "",
  contactName: "",
  contactEmail: "",
  contactPhoneNumber: "",
  isActive: true,
  address: {
    id: undefined,
    city: {
      id: undefined,
    },
    district: {
      id: undefined,
    },
    ward: {
      id: undefined,
    },
    addressLine1: "",
  },
  zone: {
    id: undefined,
  },
  pickupTimes: [],
  deliveryTimes: [],
  vehicleTypes: [],
  adjacentPoints: [],
};

export type RoutePointFormProps = OrgPageProps & {
  inModal?: boolean;
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
  mutateRoutePointList?: () => void;
  onClose?: () => void;
};

const RoutePointForm = ({
  screenMode,
  id,
  orgId,
  orgLink,
  userId,
  encryptedId,
  inModal,
  mutateRoutePointList,
  onClose,
}: RoutePointFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification, showNotificationBasedOnStatus } = useNotification(t);
  const [{ searchQueryString }] = useAtom(routePointAtom);
  const { canEdit, canEditOwn } = usePermission("route-point");

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isPickupTimeModalOpen, setIsPickupTimeModalOpen] = useState(false);
  const [isDeliveryTimeModalOpen, setIsDeliveryTimeModalOpen] = useState(false);
  const [isVehicleTypeModalOpen, setIsVehicleTypeModalOpen] = useState(false);
  const [isAdjacentPointsModalOpen, setIsAdjacentPointsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [awaitFetchData, setAwaitFetchData] = useState(true);

  const routePointRef = useRef<RoutePointInfo>();
  const selectedRoutePointRef = useRef<RoutePointInputForm>();

  const { zones, isLoading: isZoneOptionsLoading } = useZoneOptions({ organizationId: orgId });

  /**
   * Zone options for the combobox
   */
  const zoneOptions: ComboboxItem[] = useMemo(
    () =>
      zones.map((zone) => ({
        value: ensureString(zone.id),
        label: ensureString(zone.name),
      })),
    [zones]
  );

  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  /**
   * Active options for the radio group
   */
  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("route_point.status_active") },
      { value: "false", label: t("route_point.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("route_point.manage"), link: `${orgLink}/settings` },
      { name: t("route_point.title"), link: `${orgLink}/route-points/${searchQueryString}` },
    ];

    // If the screen mode is new, add the new breadcrumb item
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/route-points/new` });
    }

    // If the screen mode is edit, add the edit breadcrumb item
    if (editMode) {
      payload.push({
        name: routePointRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/route-points/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePointRef.current, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    if (inModal) {
      onClose?.();
    } else {
      router.back();
    }
  }, [inModal, onClose, router]);

  /**
   * Handle the submission of a route point form using Formik.
   *
   * @param {RoutePointInputForm} values - The form values representing a route point.
   * @param {FormikHelpers<RoutePointInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles route point creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: RoutePointInputForm, formikHelpers: FormikHelpers<RoutePointInputForm>) => {
      const {
        id,
        code,
        name,
        isActive,
        zone,
        notes,
        requestedNote,
        contactName,
        contactPhoneNumber,
        contactEmail,
        address,
        pickupTimes,
        deliveryTimes,
        vehicleTypes,
        adjacentPoints,
        updatedAt,
      } = trim(values);
      let result: ActionResult<RoutePointInfo> | undefined;
      if (newMode) {
        result = await createRoutePoint({
          name,
          code,
          zone: { id: zone?.id },
          notes,
          requestedNote,
          contactName,
          contactPhoneNumber,
          contactEmail,
          isActive,
          address,
          pickupTimes,
          deliveryTimes,
          vehicleTypes,
          adjacentPoints,
        });
      } else {
        result = await updateRoutePoint({
          id,
          code,
          name,
          isActive,
          zone,
          notes,
          requestedNote,
          contactName,
          contactPhoneNumber,
          contactEmail,
          address,
          pickupTimes,
          deliveryTimes,
          vehicleTypes,
          adjacentPoints,
          updatedAt,
        });
      }

      showNotificationBasedOnStatus(result.status, values.name, {
        onExisted: () => {
          formikHelpers.setFieldError("code", errorExists("route_point.code"));
          return;
        },
        onOk: () => {
          if (inModal) {
            mutateRoutePointList?.();
            onClose?.();
          } else {
            router.push(`${orgLink}/route-points${searchQueryString}`);
            setItemString(SESSION_FLASHING_ID, ensureString(result?.data?.id), { security: false });
          }
        },
      });

      formikHelpers.setSubmitting(false);
    },
    [inModal, mutateRoutePointList, newMode, onClose, orgLink, router, searchQueryString, showNotificationBasedOnStatus]
  );

  const {
    values,
    touched,
    errors,
    dirty,
    isSubmitting,
    handleChange,
    handleSubmit,
    getFieldMeta,
    setFieldValue,
    resetForm,
  } = useFormik<RoutePointInputForm>({
    initialValues: initialFormValues,
    validationSchema: routePointInputValidationSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Check if the adjacent points are available.
   */
  const hasAdjacentPoints = useMemo(() => (values?.adjacentPoints || []).length > 0, [values?.adjacentPoints]);

  /**
   * Fetching route point data when in edit or copy mode.
   * If the data is found, it sets the initial data of the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the zone settings page.
   */
  const fetchRoutePoint = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }

    const { data } = await getRoutePoint({ id, organizationId: orgId });
    setAwaitFetchData(false);

    if (data) {
      routePointRef.current = data;
      resetForm({ values: { ...(data as RoutePointInputForm) } });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      editMode && router.push(`${orgLink}/route-points${searchQueryString}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching zone data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchRoutePoint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
   * Handle the cancel button click event. If there are unsaved changes (dirty),
   * it opens a confirmation dialog. Otherwise, it navigates back to the previous page.
   */
  const handleCancelClick = useCallback(() => {
    if (dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [dirty, router]);

  /**
   * Handle the cancellation of confirmation dialog.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * Handle the opening of the delete confirmation modal.
   */
  const handleOpenDeleteConfirmModal = useCallback(
    (item: Partial<RoutePointInfo>) => () => {
      selectedRoutePointRef.current = item as RoutePointInputForm;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  /**
   * Handle the closing of the delete confirmation modal.
   */
  const handleCloseDeleteConfirmModal = useCallback(() => {
    selectedRoutePointRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, []);

  /**
   * Handle the removal of an adjacent point.
   */
  const handleRemoveOrderItem = useCallback(() => {
    const newAdjacentPoints = (values.adjacentPoints ?? [])?.filter(
      (point) => !equalId(point.id, selectedRoutePointRef.current?.id)
    );
    setFieldValue("adjacentPoints", newAdjacentPoints);
    selectedRoutePointRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, [setFieldValue, values.adjacentPoints]);

  /**
   * Handle the addition of a pickup time.
   */
  const handleAddPickupTime = useCallback(
    (newTime: RoutePointTimeRange) => {
      setFieldValue("pickupTimes", [...((values.pickupTimes ?? []) as RoutePointTimeRange[]), newTime]);
      setIsPickupTimeModalOpen(false);
    },
    [setFieldValue, values]
  );

  /**
   * Handle the addition of a delivery time.
   */
  const handleAddDeliveryTime = useCallback(
    (newTime: RoutePointTimeRange) => {
      setFieldValue("deliveryTimes", [...((values.deliveryTimes ?? []) as RoutePointTimeRange[]), newTime]);
      setIsDeliveryTimeModalOpen(false);
    },
    [setFieldValue, values]
  );

  /**
   * Handle the removal of a pickup time.
   */
  const handleRemovePickupTime = useCallback(
    (index: number) => () => {
      const newPickupTimes = safeParseArray((values.pickupTimes ?? []) as RoutePointTimeRange[]).filter(
        (_, i) => i !== index
      );
      setFieldValue("pickupTimes", newPickupTimes);
    },
    [setFieldValue, values.pickupTimes]
  );

  /**
   * Handle the removal of a delivery time.
   */
  const handleRemoveDeliveryTime = useCallback(
    (index: number) => () => {
      const newDeliveryTimes = safeParseArray((values.deliveryTimes ?? []) as RoutePointTimeRange[]).filter(
        (_, i) => i !== index
      );
      setFieldValue("deliveryTimes", newDeliveryTimes);
    },
    [setFieldValue, values.deliveryTimes]
  );

  /**
   * Handle the addition of a vehicle type.
   */
  const handleAddVehicleType = useCallback(
    (id: number, name: string) => {
      const newVehicleType = { id, name };
      setFieldValue("vehicleTypes", [...(values.vehicleTypes ?? []), newVehicleType]);
      setIsVehicleTypeModalOpen(false);
    },
    [setFieldValue, values.vehicleTypes]
  );

  /**
   * Handle the removal of a vehicle type.
   */
  const handleRemoveVehicleType = useCallback(
    (id: number) => () => {
      const newVehicleTypes = [...(values.vehicleTypes ?? [])].filter((item) => !equalId(item.id, id));
      setFieldValue("vehicleTypes", newVehicleTypes);
    },
    [setFieldValue, values.vehicleTypes]
  );

  /**
   * Handle the change of the zone combobox.
   */
  const handleZoneChange = useCallback(
    (value: string) => {
      setFieldValue("zone.id", value);
    },
    [setFieldValue]
  );

  /**
   * Handle the opening of the adjacent points modal by link.
   */
  const handleOpenAdjacentPointsModalByLink = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsAdjacentPointsModalOpen(true);
  }, []);

  /**
   * Handle the toggle of the adjacent points modal.
   */
  const handleToggleAdjacentPointsModal = useCallback(() => {
    setIsAdjacentPointsModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the opening of the pickup time modal.
   */
  const handleOpenPickupTimeModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsPickupTimeModalOpen(true);
  }, []);

  /**
   * Handle the toggle of the pickup time modal.
   */
  const handleTogglePickupTimeModal = useCallback(() => {
    setIsPickupTimeModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the opening of the delivery time modal.
   */
  const handleOpenDeliveryTimeModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsDeliveryTimeModalOpen(true);
  }, []);

  /**
   * Handle the toggle of the delivery time modal.
   */
  const handleToggleDeliveryTimeModal = useCallback(() => {
    setIsDeliveryTimeModalOpen((prev) => !prev);
  }, []);

  /**
   * Handle the opening of the vehicle type modal.
   */
  const handleOpenVehicleTypeModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event?.preventDefault();
    setIsVehicleTypeModalOpen(true);
  }, []);

  /**
   * Handle the toggle of the vehicle type modal.
   */
  const handleToggleVehicleTypeModal = useCallback(() => {
    setIsVehicleTypeModalOpen((prev) => !prev);
  }, []);

  /**
   * Handles the confirmation of the adjacent points modal.
   *
   * @param selectedPoints - The selected points.
   */
  const handleConfirmAdjacentPointsModal = useCallback(
    (selectedPoints: Partial<RoutePointInfo>[]) => {
      setFieldValue("adjacentPoints", selectedPoints);
    },
    [setFieldValue]
  );

  /**
   * Handle the action component.
   */
  const actionComponent = useMemo(
    () => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, isSubmitting, t]
  );

  return (
    <Authorization
      showAccessDenied
      resource="route-point"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(routePointRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("route_point.title")}
          description={t("route_point.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />
        <div className="space-y-12">
          <InputGroup
            title={t("route_point.general_info_title")}
            description={t("route_point.general_info_description")}
          >
            <div className="sm:col-span-2">
              <TextField
                label={t("route_point.code")}
                name="code"
                value={values.code ?? ""}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.code && errors.code)}
              />
            </div>
            <div className="sm:col-span-4">
              <TextField
                label={t("route_point.name")}
                name="name"
                value={values.name ?? ""}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>
            <div className="sm:col-span-3">
              <Combobox
                label={t("route_point.zone")}
                loading={isZoneOptionsLoading}
                items={zoneOptions}
                value={ensureString(values.zone?.id)}
                placeholder={t("route_point.zone_placeholder")}
                onChange={handleZoneChange}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("route_point.description_label")}
                name="notes"
                value={values.notes}
                multiline
                rows={4}
                maxLength={500}
                onChange={handleChange}
                showCount
              />
            </div>
            <div className="col-span-full">
              <RadioGroup
                label={t("route_point.status")}
                name="isActive"
                items={isActiveOptions}
                value={String(values.isActive)}
                onChange={(item: RadioItem) => setFieldValue("isActive", item.value === "true")}
              />
            </div>
          </InputGroup>

          {/* Contact Information */}
          <InputGroup
            title={t("route_point.contact_info_title")}
            description={t("route_point.contact_info_description")}
          >
            <div className="sm:col-span-4">
              <TextField
                label={t("route_point.contact_name")}
                name="contactName"
                maxLength={255}
                value={values.contactName}
                onChange={handleChange}
                errorText={formatError(t, touched.contactName && errors.contactName)}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label={t("route_point.contact_phone_number")}
                name="contactPhoneNumber"
                maxLength={20}
                value={ensureString(values.contactPhoneNumber)}
                onChange={handleChange}
                errorText={formatError(t, touched.contactPhoneNumber && errors.contactPhoneNumber)}
              />
            </div>
            <div className="sm:col-span-3">
              <TextField
                label={t("route_point.contact_email")}
                name="contactEmail"
                maxLength={20}
                value={ensureString(values.contactEmail)}
                onChange={handleChange}
                errorText={formatError(t, touched.contactEmail && errors.contactEmail)}
              />
            </div>
          </InputGroup>

          {/* Address Information */}
          <InputGroup
            title={t("route_point.address_info_title")}
            description={t("route_point.address_info_description")}
          >
            <AddressInformation
              parentName="address"
              setFieldValue={setFieldValue}
              getFieldMeta={getFieldMeta}
              address={values.address}
            />
          </InputGroup>

          {/* Adjacent Points */}
          <InputGroup
            title={t("route_point.adjacent_points")}
            description={t("route_point.adjacent_points_description")}
          >
            <div className="col-span-full">
              <label className="block text-sm font-medium leading-6 text-gray-900">
                {t("route_point.nearby_points")}
              </label>
              <TableContainer variant="paper" inside horizontalScroll className="mt-2">
                <Table dense>
                  <TableHead uppercase>
                    <TableRow>
                      <TableCell className="w-10">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                      <TableCell className="w-8 !pl-0">{t("route_point.no")}</TableCell>
                      <TableCell>{t("route_point.title")}</TableCell>
                      <TableCell>{t("route_point.zone")}</TableCell>
                      <TableCell className="w-12">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-gray-200 bg-white">
                    {!hasAdjacentPoints && (
                      <TableRow hover={false}>
                        <TableCell colSpan={5}>
                          <EmptyListSection
                            description={t("route_point.no_adjacent_points")}
                            onClick={handleToggleAdjacentPointsModal}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {values.adjacentPoints?.map((item, index) => (
                      <Disclosure key={item.id} as={Fragment}>
                        {({ open }) => (
                          <Fragment>
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
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.zone?.name || t("common.empty")}</TableCell>
                              <TableCell className="space-x-2 !pr-1">
                                <button
                                  type="button"
                                  title={t("common.delete")}
                                  onClick={handleOpenDeleteConfirmModal(item)}
                                >
                                  <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                                </button>
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Panel as="tr">
                              <TableCell colSpan={5} className="p-4" nowrap={false}>
                                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                                  <div className="group col-span-full overflow-hidden rounded-lg px-4">
                                    <DescriptionProperty2 label={t("route_point.name")}>
                                      {item.name || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("route_point.zone")}>
                                      {item.zone?.name || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("route_point.description_label")}>
                                      {item.notes || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("components.address_information.city")}>
                                      {item.address?.city?.name || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("components.address_information.district")}>
                                      {item.address?.district?.name || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("components.address_information.ward")}>
                                      {item.address?.ward?.name || t("common.empty")}
                                    </DescriptionProperty2>
                                    <DescriptionProperty2 label={t("components.address_information.address_line1")}>
                                      {item.address?.addressLine1 || t("common.empty")}
                                    </DescriptionProperty2>
                                  </div>
                                </div>
                              </TableCell>
                            </Disclosure.Panel>
                          </Fragment>
                        )}
                      </Disclosure>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {hasAdjacentPoints && (
                <div className="mt-2">
                  <Link useDefaultStyle href="" onClick={handleOpenAdjacentPointsModalByLink}>
                    <span aria-hidden="true">+</span> {t("route_point.add_adjacent_points")}
                  </Link>
                </div>
              )}
            </div>
          </InputGroup>

          {/* Requirement Information */}
          <InputGroup
            title={t("route_point.requirement_info_title")}
            description={t("route_point.requirement_info_description")}
          >
            <div className="col-span-full space-y-2">
              <div className="flex flex-col gap-y-2">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  {t("route_point.pickup_time")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {((values.pickupTimes ?? []) as RoutePointTimeRange[])?.map((item, index) => (
                    <Fragment key={index}>
                      <Badge
                        label={`${(item?.start ?? "").slice(0, 5)} - ${(item?.end ?? "").slice(0, 5)}`}
                        rounded
                        onRemove={handleRemovePickupTime(index)}
                      />
                    </Fragment>
                  ))}
                  <Link useDefaultStyle href="" onClick={handleOpenPickupTimeModal}>
                    <span aria-hidden="true">+</span> {t("route_point.add_time")}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-y-2">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  {t("route_point.delivery_time")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {((values.deliveryTimes ?? []) as RoutePointTimeRange[])?.map((item, index) => (
                    <Badge
                      key={index}
                      label={`${(item?.start ?? "").slice(0, 5)} - ${(item?.end ?? "").slice(0, 5)}`}
                      rounded
                      onRemove={handleRemoveDeliveryTime(index)}
                    />
                  ))}
                  <Link useDefaultStyle href="" onClick={handleOpenDeliveryTimeModal}>
                    <span aria-hidden="true">+</span> {t("route_point.add_time")}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-y-2">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  {t("route_point.vehicle_type")}
                </label>
                <div className="flex items-center gap-x-2">
                  {(values.vehicleTypes ?? [])?.map((item) => (
                    <Badge key={item.id} label={item.name ?? ""} rounded onRemove={handleRemoveVehicleType(item.id!)} />
                  ))}
                  <Link useDefaultStyle href="" onClick={handleOpenVehicleTypeModal}>
                    <span aria-hidden="true">+</span> {t("route_point.add_vehicle_type")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <TextField
                label={t("route_point.requested_note")}
                name="requestedNote"
                multiline
                rows={4}
                maxLength={500}
                showCount
                value={values.requestedNote as string}
                onChange={handleChange}
              />
            </div>
          </InputGroup>
        </div>

        <div className="mt-4 max-sm:px-4">{actionComponent}</div>
      </form>

      {/* Adjacent points modal */}
      <AdjacentPointsModal
        open={isAdjacentPointsModalOpen}
        currentPointId={values.id}
        currentPoints={values.adjacentPoints}
        onConfirm={handleConfirmAdjacentPointsModal}
        onClose={handleToggleAdjacentPointsModal}
      />

      {/* Pickup time modal */}
      <WorkTimeModal
        open={isPickupTimeModalOpen}
        onClose={handleTogglePickupTimeModal}
        onConfirm={handleAddPickupTime}
      />

      {/* Delivery time modal */}
      <WorkTimeModal
        open={isDeliveryTimeModalOpen}
        onClose={handleToggleDeliveryTimeModal}
        onConfirm={handleAddDeliveryTime}
      />

      {/* Vehicle type modal */}
      <VehicleTypeModal
        open={isVehicleTypeModalOpen}
        excludeIds={values.vehicleTypes?.map((item) => Number(item.id))}
        onClose={handleToggleVehicleTypeModal}
        onConfirm={handleAddVehicleType}
      />

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

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", {
          name: selectedRoutePointRef.current?.name,
        })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirmModal}
        onCancel={handleCloseDeleteConfirmModal}
        onConfirm={handleRemoveOrderItem}
      />
    </Authorization>
  );
};

export default RoutePointForm;
