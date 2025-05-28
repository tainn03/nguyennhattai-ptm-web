"use client";

import { Disclosure } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { FormikHelpers, getIn, useFormik } from "formik";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createZone, getZone, updateZone } from "@/actions/zone";
import { Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import {
  AdjacentZonesModal,
  Authorization,
  Button,
  Combobox,
  EmptyListSection,
  InputGroup,
  PageHeader,
  RadioGroup,
  TextField,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { zoneFormSchema, ZoneInputForm } from "@/forms/zone";
import { usePermission, useZoneOptions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { zoneAtom } from "@/states";
import { BreadcrumbItem } from "@/types";
import { ActionResult } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { ZoneInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString, isTrue, trim } from "@/utils/string";
import { cn } from "@/utils/twcn";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: ZoneInputForm = {
  name: "",
  description: "",
  isActive: true,
  parent: {
    id: undefined,
  },
  adjacentZones: [],
};

export type ZoneFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const ZoneForm = ({ screenMode, id, orgId, orgLink, userId, encryptedId }: ZoneFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification, showNotificationBasedOnStatus } = useNotification(t);
  const [{ searchQueryString }] = useAtom(zoneAtom);
  const { canEdit, canEditOwn } = usePermission("zone");

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isAdjacentZonesModalOpen, setIsAdjacentZonesModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [awaitFetchData, setAwaitFetchData] = useState(true);

  const zoneRef = useRef<ZoneInfo>();
  const selectedZoneRef = useRef<ZoneInputForm>();

  const { zones, isLoading: isLoadingZoneOptions } = useZoneOptions({ organizationId: orgId, excludeId: id });

  /**
   * Zone options for the combobox
   */
  const zoneOptions: ComboboxItem[] = useMemo(
    () =>
      zones.map((item: ZoneInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.name),
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
      { value: "true", label: t("zone.status_active") },
      { value: "false", label: t("zone.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("zone.manage"), link: `${orgLink}` },
      { name: t("zone.name"), link: `${orgLink}/zones${searchQueryString}` },
    ];

    // If the screen mode is new, add the new breadcrumb item
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/zones/new` });
    }

    // If the screen mode is edit, add the edit breadcrumb item
    if (editMode) {
      payload.push({
        name: zoneRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/zones/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneRef.current, orgLink, searchQueryString]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a zone form using Formik.
   *
   * @param {ZoneInputForm} values - The form values representing a zone.
   * @param {FormikHelpers<ZoneInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles zone creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: ZoneInputForm, formikHelpers: FormikHelpers<ZoneInputForm>) => {
      const { id, name, description, isActive, parent, children, adjacentZones, updatedAt } = trim(values);
      let result: ActionResult<ZoneInfo> | undefined;

      if (newMode) {
        result = await createZone({ name, description, isActive, parent, children, adjacentZones });
      } else {
        result = await updateZone({ id, name, description, isActive, parent, children, adjacentZones, updatedAt });
      }

      showNotificationBasedOnStatus(result.status, values.name, {
        onExisted: () => {
          formikHelpers.setFieldError("name", errorExists("zone.name"));
          return;
        },
        onOk: () => {
          router.push(`${orgLink}/zones${searchQueryString}`);
          setItemString(SESSION_FLASHING_ID, ensureString(result?.data?.id), { security: false });
        },
      });

      formikHelpers.setSubmitting(false);
    },
    [newMode, showNotificationBasedOnStatus, router, orgLink, searchQueryString]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik<ZoneInputForm>({
      initialValues: initialFormValues,
      validationSchema: zoneFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Fetching zone data when in edit or copy mode.
   * If the data is found, it sets the initial data of the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the zone settings page.
   */
  const fetchZone = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }

    const { data } = await getZone({ id, organizationId: orgId });
    setAwaitFetchData(false);

    if (data) {
      zoneRef.current = data;
      resetForm({ values: data });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      editMode && router.push(`${orgLink}/zones${searchQueryString}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching zone data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchZone();
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
   * Callback function for handling changes in the radio group.
   *
   * @param name - The name of the radio group.
   * @param item - The radio item that is selected.
   * @returns A callback function that handles the change event of the radio group.
   */
  const handleRadioChange = useCallback(
    (item: RadioItem) => setFieldValue("isActive", isTrue(item.value)),
    [setFieldValue]
  );

  /**
   * Handle changes to select inputs in a form.
   *
   * @param {string} name - The name of the select input.
   * @param {string} value - The selected value.
   */
  const handleParentZoneChange = useCallback(
    (value: string) => {
      setFieldValue("parent.id", value ?? null);
    },
    [setFieldValue]
  );

  /**
   * Handles the toggle of the adjacent zones modal.
   */
  const handleToggleAdjacentZonesModal = useCallback(() => {
    setIsAdjacentZonesModalOpen((prev) => !prev);
  }, []);

  /**
   * Handles the confirmation of the adjacent zones modal.
   *
   * @param selectedZones - The selected zones.
   */
  const handleConfirmAdjacentZonesModal = useCallback(
    (selectedZones: Partial<ZoneInfo>[]) => {
      setFieldValue("adjacentZones", selectedZones);
    },
    [setFieldValue]
  );

  /**
   * Handles the opening of the adjacent zones modal by link.
   *
   * @param event - The mouse event.
   */
  const handleOpenAdjacentZonesModalByLink = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsAdjacentZonesModalOpen(true);
  }, []);

  /**
   * Handles the opening of the delete confirmation modal.
   *
   * @param item - The item to be deleted.
   */
  const handleOpenDeleteConfirmModal = useCallback(
    (item: Partial<ZoneInputForm>) => () => {
      selectedZoneRef.current = item;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  /**
   * Handles the closing of the delete confirmation modal.
   */
  const handleCloseDeleteConfirmModal = useCallback(() => {
    selectedZoneRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, []);

  /**
   * Handles the removal of a zone.
   */
  const handleRemoveZone = useCallback(() => {
    if (selectedZoneRef.current) {
      const updatedAdjacentZones = (values.adjacentZones || []).filter(
        (zone) => zone.id !== selectedZoneRef.current?.id
      );
      setFieldValue("adjacentZones", updatedAdjacentZones);
    }
    selectedZoneRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, [values.adjacentZones, setFieldValue]);

  /**
   * Checks if there are adjacent zones.
   */
  const hasAdjacentZones = useMemo(() => (values?.adjacentZones || []).length > 0, [values?.adjacentZones]);

  /**
   * Action component.
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
      resource="zone"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(zoneRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("zone.name")}
          description={t("zone.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup title={t("zone.general_title")} description={t("zone.general_description")}>
            {/* Name */}
            <div className="sm:col-span-3">
              <TextField
                label={t("zone.name")}
                name="name"
                value={values.name ?? ""}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>

            {/* Parent */}
            <div className="sm:col-span-3">
              <Combobox
                label={t("zone.parent")}
                items={zoneOptions}
                loading={isLoadingZoneOptions}
                value={ensureString(values.parent?.id)}
                placeholder={t("zone.zone_parent_placeholder")}
                onChange={handleParentZoneChange}
                errorText={formatError(t, getIn(touched, "parent.id") && getIn(errors, "parent.id"))}
              />
            </div>

            {/* Description */}
            <div className="col-span-full">
              <TextField
                label={t("zone.description")}
                name="description"
                value={ensureString(values.description)}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>

            {/* Status */}
            <div className="col-span-full">
              <RadioGroup
                label={t("zone.status")}
                name="isActive"
                items={isActiveOptions}
                value={ensureString(values.isActive)}
                onChange={handleRadioChange}
              />
            </div>
          </InputGroup>

          <InputGroup title={t("zone.adjacent_title")} description={t("zone.adjacent_description")}>
            <div className="col-span-full">
              <label className="block text-sm font-medium leading-6 text-gray-900">{t("zone.adjacent_zones")}</label>
              <TableContainer variant="paper" inside horizontalScroll className="mt-2">
                <Table dense>
                  <TableHead uppercase>
                    <TableRow>
                      <TableCell className="w-10">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                      <TableCell className="w-8 !pl-0">{t("zone.index")}</TableCell>
                      <TableCell>{t("zone.name")}</TableCell>
                      <TableCell>{t("zone.parent")}</TableCell>
                      <TableCell className="w-12">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-gray-200 bg-white">
                    {!hasAdjacentZones && (
                      <TableRow hover={false}>
                        <TableCell colSpan={5}>
                          <EmptyListSection
                            onClick={handleToggleAdjacentZonesModal}
                            description={t("zone.empty_list")}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    {values.adjacentZones?.map((item, index) => (
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
                              <TableCell className="px-3 py-3.5" />
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.name || t("common.empty")}</TableCell>
                              <TableCell>{item.parent?.name || t("common.empty")}</TableCell>
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
                          </Fragment>
                        )}
                      </Disclosure>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {hasAdjacentZones && (
                <div className="mt-2">
                  <Link useDefaultStyle href="" onClick={handleOpenAdjacentZonesModalByLink}>
                    <span aria-hidden="true">+</span> {t("zone.add")}
                  </Link>
                </div>
              )}
            </div>
          </InputGroup>
        </div>

        <div className="mt-4 max-sm:px-4">{actionComponent}</div>
      </form>

      {/* Adjacent zones modal */}
      <AdjacentZonesModal
        open={isAdjacentZonesModalOpen}
        currentZoneId={values.id}
        currentZones={values.adjacentZones}
        onClose={handleToggleAdjacentZonesModal}
        onConfirm={handleConfirmAdjacentZonesModal}
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
          name: selectedZoneRef.current?.name,
        })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirmModal}
        onCancel={handleCloseDeleteConfirmModal}
        onConfirm={handleRemoveZone}
      />
    </Authorization>
  );
};

export default ZoneForm;
