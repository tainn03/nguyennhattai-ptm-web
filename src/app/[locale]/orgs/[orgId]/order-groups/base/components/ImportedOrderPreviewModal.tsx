"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { importOrders } from "@/actions/orders";
import {
  ModalActions,
  ModalContent,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import {
  Autocomplete,
  Button,
  Combobox,
  DatePicker,
  EmptyListSection,
  Modal,
  NumberField,
  TextField,
} from "@/components/molecules";
import { AutocompleteItem } from "@/components/molecules/Autocomplete/Autocomplete";
import { __DEV__ } from "@/configs/environment";
import { importedOrderInputFormSchema, ImportedOrderPreviewForm } from "@/forms/import";
import { useAuth, useRoutePointOptions, useUnitOfMeasureOptions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { HttpStatusCode } from "@/types/api";
import { ImportedOrder } from "@/types/importedOrder";
import { CustomerInfo } from "@/types/strapi";
import { getClientTimezone } from "@/utils/date";
import { equalId } from "@/utils/number";
import { ensureString, getDetailAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

type ImportedOrderPreviewModalProps = {
  open: boolean;
  orders: ImportedOrder[];
  customer?: CustomerInfo;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ImportedOrderPreviewModal({
  open,
  orders,
  customer,
  onClose,
  onConfirm,
}: ImportedOrderPreviewModalProps) {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { showNotification } = useNotification();
  const { routePoints } = useRoutePointOptions({ organizationId: Number(orgId) });
  const { unitOfMeasures } = useUnitOfMeasureOptions({ organizationId: Number(orgId) });

  const [pickupDate, setPickupDate] = useState(new Date());
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState(customer);

  const routePointOptions = useMemo(
    () =>
      routePoints.map((item) => ({
        value: item.id,
        label: item.code,
      })),
    [routePoints]
  );

  const unitOfMeasureOptions = useMemo(
    () =>
      unitOfMeasures.map((item) => ({
        value: ensureString(item.id),
        label: item.name,
      })),
    [unitOfMeasures]
  );

  /**
   * Initialize orders with the imported orders.
   */
  const initialOrders = useMemo(
    () =>
      orders.map((item) => ({
        route: {
          id: item.route?.id ?? null,
        },
        pickupPoint: {
          id: item.pickupPoint?.id ?? null,
          code: item.pickupPoint?.code || null,
          name: item.pickupPoint?.name || null,
          addressLine1: getDetailAddress(item.pickupPoint?.address) || null,
        },
        deliveryPoint: {
          id: item.deliveryPoint?.id ?? null,
          code: item.deliveryPoint?.code || item.rawPointCode || null,
          name: item.deliveryPoint?.name || item.rawPointName || null,
          addressLine1: getDetailAddress(item.deliveryPoint?.address) || item.rawPointAddress || null,
        },
        weight: item.quantity ?? null,
        cbm: item.cbm ?? null,
        unitOfMeasure: {
          id: item.unitOfMeasure?.id ?? null,
        },
        zoneLv1: {
          id: item.zoneLv1?.id ?? null,
          name: item.zoneLv1?.name || item.rawZoneLv1 || null,
        },
        zoneLv2: {
          id: item.zoneLv2?.id ?? null,
          name: item.zoneLv2?.name || item.rawZoneLv2 || null,
        },
        notes: item.notes ?? "",
        pickupTimeNotes: item.pickupTimeNotes ?? "",
        deliveryTimeNotes: item.deliveryTimeNotes ?? "",
        items: (item.products ?? []).map((product) => ({
          name: product.name,
          quantity: product.quantity,
        })),
      })),
    [orders]
  );

  useEffect(() => {
    if (customer) {
      // Updates the selected customer whenever the customer prop changes
      setSelectedCustomer(customer);
    }
  }, [open, customer]);

  const handleSubmitFormik = useCallback(
    async (values: ImportedOrderPreviewForm, formikHelpers: FormikHelpers<ImportedOrderPreviewForm>) => {
      if (values.orders && values.orders.length > 0) {
        const submitOrders = values.orders.map((order) => ({
          ...(order.route?.id
            ? { route: { id: order.route.id } }
            : {
                pickupPoint: {
                  ...(order.pickupPoint?.id
                    ? { id: order.pickupPoint.id }
                    : {
                        code: order.pickupPoint?.code,
                        name: order.pickupPoint?.name,
                        addressLine1: order.pickupPoint?.addressLine1,
                      }),
                },
                deliveryPoint: {
                  ...(order.deliveryPoint?.id
                    ? { id: order.deliveryPoint.id, code: order.deliveryPoint?.code, name: order.deliveryPoint?.name }
                    : {
                        code: order.deliveryPoint?.code,
                        name: order.deliveryPoint?.name,
                        addressLine1: order.deliveryPoint?.addressLine1,
                        zone: {
                          ...(order.zoneLv2?.id
                            ? { id: order.zoneLv2.id }
                            : {
                                name: order.zoneLv2?.name,
                                parent: {
                                  ...(order.zoneLv1?.id
                                    ? { id: order.zoneLv1.id }
                                    : {
                                        name: order.zoneLv1?.name,
                                      }),
                                },
                              }),
                        },
                      }),
                },
              }),
          weight: order.weight,
          cbm: order.cbm ?? 0,
          unitOfMeasure: {
            id: order.unitOfMeasure?.id ?? null,
          },
          notes: order.notes,
          pickupTimeNotes: order.pickupTimeNotes,
          deliveryTimeNotes: order.deliveryTimeNotes,
          items: order.items,
        }));

        __DEV__ && console.log(submitOrders);

        const { data, status } = await importOrders({
          orders: submitOrders,
          organizationId: Number(orgId),
          clientTimezone: getClientTimezone(),
          customer: { id: Number(selectedCustomer?.id) },
          orderDate: pickupDate.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          currentDate: new Date().toISOString(),
        });

        if (status === HttpStatusCode.Ok && data) {
          onConfirm();
        } else {
          showNotification({
            color: "error",
            title: t("common.message.error_title"),
            message: t("order_group.import_order_error_message"),
          });
        }
        formikHelpers.setSubmitting(false);
      }
    },
    [deliveryDate, onConfirm, orgId, pickupDate, selectedCustomer?.id, showNotification, t]
  );

  const { handleSubmit, values, touched, errors, isSubmitting, handleChange, setFieldValue, resetForm } =
    useFormik<ImportedOrderPreviewForm>({
      initialValues: { orders: initialOrders },
      validationSchema: importedOrderInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Handles closing the modal and resetting form state
   */
  const handleClose = useCallback(() => {
    // Resets pickup date to current date
    setPickupDate(new Date());
    // Resets delivery date to current date
    setDeliveryDate(new Date());
    // Clears selected customer
    setSelectedCustomer(undefined);
    // Resets form values to initial state
    resetForm({});
    // Calls parent onClose handler
    onClose();
  }, [onClose, resetForm]);

  /**
   * Handles changing the route point
   */
  const handleRoutePointChange = useCallback(
    (index: number, field: "pickupPoint" | "deliveryPoint") => (value: string) => {
      const routePoint = routePoints.find((item) => ensureString(item.code) === value);
      if (routePoint) {
        setFieldValue(`orders.${index}.${field}`, {
          id: routePoint.id,
          code: routePoint.code,
          name: routePoint.name,
        });
      } else {
        setFieldValue(`orders.${index}.${field}`, {
          id: null,
          code: value,
          name: "",
          addressLine1: "",
        });
      }

      // Resets the route id
      setFieldValue(`orders.${index}.route.id`, null);
    },
    [routePoints, setFieldValue]
  );

  /**
   * Handles selecting a route point
   */
  const handleSelectRoutePoint = useCallback(
    (index: number) => (point: AutocompleteItem) => {
      const routePoint = routePoints.find((item) => equalId(item.id, point.value));
      setFieldValue(`orders.${index}.deliveryPoint`, {
        id: point.value,
        code: point.label,
        name: routePoint?.name ?? "",
        addressLine1: getDetailAddress(routePoint?.address) ?? "",
      });
      // Resets the route id
      setFieldValue(`orders.${index}.route.id`, null);
    },
    [routePoints, setFieldValue]
  );

  /**
   * Handles removing an order
   */
  const handleRemoveOrder = useCallback(
    (index: number) => {
      const newOrders = values.orders.filter((_, i) => i !== index);
      setFieldValue("orders", newOrders);
    },
    [setFieldValue, values.orders]
  );

  /**
   * Checks if the item is the last three items
   */
  const isLastThreeItems = useCallback(
    (index: number) => {
      if (values.orders.length <= 6) {
        return index >= values.orders.length - 1;
      } else {
        return index >= values.orders.length - 7;
      }
    },
    [values.orders]
  );

  /**
   * Handles submitting the form
   */
  const handleSubmitClick = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  if (!selectedCustomer) return null;

  return (
    <form onSubmit={handleSubmit}>
      <Modal open={open} onClose={handleClose} size="full" allowOverflow showCloseButton>
        <ModalHeader title={t("order_group.import_order_preview_title", { customerName: selectedCustomer.name })} />

        <ModalContent padding={false} className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden">
          <div className="flex gap-2 px-4 py-6">
            <DatePicker
              label={t("order_group.pickup_date")}
              selected={pickupDate}
              onChange={(selected) => setPickupDate(selected ?? new Date())}
            />
            <DatePicker
              label={t("order_group.delivery_date")}
              selected={deliveryDate}
              onChange={(selected) => setDeliveryDate(selected ?? new Date())}
            />
          </div>

          <TableContainer
            variant="paper"
            inside
            fullHeight
            horizontalScroll
            className="border-b-0 border-t border-gray-200 [&>div]:overflow-visible"
          >
            <Table className="border-spacing-y-0 [&_td]:!p-0">
              <TableHead>
                <TableRow className="divide-x divide-gray-200">
                  <TableCell action className="w-16" rowSpan={2}>
                    {t("order_group.index")}
                  </TableCell>
                  <TableCell className="!py-1 text-center" colSpan={3}>
                    {t("order_group.delivery_point")}
                  </TableCell>
                  <TableCell className="w-36 !py-1" rowSpan={2}>
                    {t("order_group.delivery_time")}
                  </TableCell>
                  <TableCell className="w-24 !py-1" rowSpan={2}>
                    {t("order_group.quantity")}
                  </TableCell>
                  <TableCell className="w-32 !py-1" rowSpan={2}>
                    {t("order_group.unit")}
                  </TableCell>
                  <TableCell className="w-32 !py-1" rowSpan={2}>
                    {t("order_group.cbm")}
                  </TableCell>
                  <TableCell className="!py-1" rowSpan={2}>
                    {t("order_group.note")}
                  </TableCell>
                  <TableCell className="!py-1" rowSpan={2} action>
                    <span className="sr-only">{t("order_group.action")}</span>
                  </TableCell>
                </TableRow>
                <TableRow className="divide-x divide-gray-200 border-t border-gray-200">
                  <TableCell className="w-40 border-l border-gray-200 !py-1.5">{t("order_group.code")}</TableCell>
                  <TableCell className="!py-1.5">{t("order_group.name")}</TableCell>
                  <TableCell className="!py-1.5">{t("order_group.address")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Empty data */}
                {values.orders.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={10} className="px-6 lg:px-8">
                      <EmptyListSection
                        title={t("order_group.import_empty_title")}
                        description={t("order_group.import_empty_description")}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {(values.orders ?? []).map((item, index) => (
                  <TableRow key={index} className="divide-x divide-gray-200">
                    <TableCell>
                      <div className="text-nowrap px-2 text-right text-gray-900">{index + 1}</div>
                    </TableCell>
                    <TableCell className="p-0">
                      <Autocomplete
                        placement={isLastThreeItems(index) ? "top" : "bottom"}
                        items={routePointOptions}
                        placeholder={t("order_group.import_empty_placeholder")}
                        className={cn("[&_input]:!rounded-none [&_input]:!shadow-none", {
                          "[&_input]:border-0":
                            !getIn(errors, `orders.${index}.deliveryPoint.code`) ||
                            !getIn(touched, `orders.${index}.deliveryPoint.code`),
                          "[&_input]:py-1.5 [&_input]:ring-2 [&_input]:ring-red-500":
                            getIn(touched, `orders.${index}.deliveryPoint.code`) &&
                            getIn(errors, `orders.${index}.deliveryPoint.code`),
                        })}
                        showArrow={false}
                        value={values.orders?.[index]?.deliveryPoint?.code ?? undefined}
                        onChange={handleRoutePointChange(index, "deliveryPoint")}
                        onSelect={handleSelectRoutePoint(index)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <TextField
                        disabled={!!item.deliveryPoint?.id}
                        placeholder={t("order_group.import_empty_placeholder")}
                        className={cn(
                          "[&>:last-child]:shadow-none [&_input]:!rounded-none [&_input]:!text-gray-900 [&_input]:ring-0",
                          {
                            "[&_input]:bg-gray-200": !!item.deliveryPoint?.id,
                          }
                        )}
                        value={item.deliveryPoint?.name ?? ""}
                        onChange={handleChange(`orders.${index}.deliveryPoint.name`)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <TextField
                        disabled={!!item.deliveryPoint?.id}
                        placeholder={t("order_group.import_empty_placeholder")}
                        className={cn(
                          "[&>:last-child]:shadow-none [&_input]:!rounded-none [&_input]:!text-gray-900 [&_input]:ring-0",
                          {
                            "[&_input]:bg-gray-200": !!item.deliveryPoint?.id,
                          }
                        )}
                        value={item.deliveryPoint?.addressLine1 ?? ""}
                        onChange={handleChange(`orders.${index}.deliveryPoint.addressLine1`)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <TextField
                        placeholder={t("order_group.import_empty_placeholder")}
                        className="[&>:last-child]:shadow-none [&_input]:!rounded-none [&_input]:!text-gray-900 [&_input]:ring-0"
                        value={item.deliveryTimeNotes ?? ""}
                        onChange={handleChange(`orders.${index}.deliveryTimeNotes`)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <NumberField
                        placeholder={t("order_group.import_empty_placeholder")}
                        className={cn("[&>:last-child]:shadow-none [&_input]:!rounded-none", {
                          "[&_input]:ring-0": !getIn(errors, `orders.${index}.weight`),
                          "[&_input]:ring-2 [&_input]:ring-red-500":
                            getIn(touched, `orders.${index}.weight`) && getIn(errors, `orders.${index}.weight`),
                        })}
                        value={item.weight}
                        onChange={handleChange(`orders.${index}.weight`)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <Combobox
                        placeholder={t("order_group.import_empty_placeholder")}
                        className={cn("[&_input]:rounded-none [&_input]:shadow-none ", {
                          "[&_input]:ring-0": !getIn(errors, `orders.${index}.unitOfMeasure.id`),
                          "[&_input]:ring-2 [&_input]:ring-red-500":
                            getIn(touched, `orders.${index}.unitOfMeasure.id`) &&
                            getIn(errors, `orders.${index}.unitOfMeasure.id`),
                        })}
                        items={unitOfMeasureOptions}
                        value={item.unitOfMeasure?.id ? ensureString(item.unitOfMeasure.id) : undefined}
                        onChange={(value) => setFieldValue(`orders.${index}.unitOfMeasure.id`, Number(value))}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <NumberField
                        placeholder={t("order_group.import_empty_placeholder")}
                        className="[&>:last-child]:shadow-none [&_input]:!rounded-none [&_input]:ring-0"
                        value={item.cbm ?? 0}
                        onChange={handleChange(`orders.${index}.cbm`)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <TextField
                        placeholder={t("order_group.import_empty_placeholder")}
                        className="[&>:last-child]:shadow-none [&_input]:!rounded-none [&_input]:ring-0"
                        value={item.notes ?? ""}
                        onChange={handleChange(`orders.${index}.notes`)}
                      />
                    </TableCell>
                    <TableCell className="flex">
                      <Button shape="circle" variant="text" color="error" onClick={() => handleRemoveOrder(index)}>
                        <TrashIcon className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>

        <ModalActions className="p-4">
          {values.orders.length > 0 && (
            <div className="flex flex-1 items-center">
              {t("order_group.import_summary", { total: values.orders.length })}
            </div>
          )}
          <Button variant="outlined" color="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmitClick} loading={isSubmitting}>
            {t("order_group.confirm")}
          </Button>
        </ModalActions>
      </Modal>
    </form>
  );
}
