import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { Fragment, memo, MouseEvent, useCallback, useMemo, useRef, useState } from "react";

import {
  Badge,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  Link,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, Combobox, EmptyListSection, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { ConfirmModal, NewMerchandiseTypeModal, NewOrderItemModal } from "@/components/organisms";
import { OrderInputForm } from "@/forms/order";
import { OrderItemInputForm } from "@/forms/orderItem";
import { useAuth, useMerchandiseTypeOptions } from "@/hooks";
import { getMerchandiseType } from "@/services/client/merchandiseType";
import { MerchandiseTypeInfo, OrderItemInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const MerchandisePanel = () => {
  const t = useTranslations();
  const { orgId, orgLink } = useAuth();
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<OrderInputForm>();

  const [isNewMerchandiseTypeModalOpen, setIsNewMerchandiseTypeModalOpen] = useState(false);
  const [isNewOrderItemModalOpen, setIsNewOrderItemModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedMerchandiseType, setSelectedMerchandiseType] = useState<Partial<MerchandiseTypeInfo>>();
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItemInputForm>();
  const [showMerchandiseDetail, setShowMerchandiseDetail] = useState(false);
  const selectedOrderItemRef = useRef<OrderItemInputForm>();

  const hasMerchandiseDetail = useMemo(() => (values?.items || []).length > 0, [values?.items]);

  const { merchandiseTypes, isLoading, mutate } = useMerchandiseTypeOptions({ organizationId: orgId });
  const merchandiseTypeOptions: ComboboxItem[] = useMemo(
    () =>
      merchandiseTypes
        ?.filter((item) => !values?.merchandiseTypes?.some((merchandiseType) => merchandiseType.id === item.id))
        ?.map((item) => ({
          value: ensureString(item.id),
          label: item.name,
        })) || [],
    [merchandiseTypes, values?.merchandiseTypes]
  );

  const handleMerchandiseTypeFieldChange = useCallback(
    (value: string) =>
      setSelectedMerchandiseType((merchandiseTypes ?? []).find((item) => ensureString(item.id) === value)),
    [merchandiseTypes]
  );

  const handleToggleMerchandiseTypeModal = useCallback(
    () => setIsNewMerchandiseTypeModalOpen((prevValue) => !prevValue),
    []
  );

  const handleNewMerchandiseTypeModalSubmit = useCallback(
    async (id?: number) => {
      setIsNewMerchandiseTypeModalOpen(false);
      if (id) {
        mutate();
        const result = await getMerchandiseType(Number(orgId), id);
        if (result) {
          setSelectedMerchandiseType(result);
        }
      }
    },
    [mutate, orgId]
  );

  const handleAddMerchandiseType = useCallback(() => {
    if (selectedMerchandiseType?.id) {
      setFieldValue("merchandiseTypes", [...(values.merchandiseTypes ?? []), selectedMerchandiseType]);
      setSelectedMerchandiseType(undefined);
    }
  }, [selectedMerchandiseType, setFieldValue, values.merchandiseTypes]);

  const handleRemoveMerchandiseType = useCallback(
    (id?: number) => () => {
      setFieldValue(
        "merchandiseTypes",
        (values.merchandiseTypes ?? []).filter((item) => ensureString(item.id) !== ensureString(id))
      );
    },
    [setFieldValue, values.merchandiseTypes]
  );

  const handleManageMerchandiseType = useCallback(
    () => window.open(`${orgLink}/settings/merchandise-types`, "_blank"),
    [orgLink]
  );

  const handleOpenOrderItemModalByLink = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsNewOrderItemModalOpen(true);
  }, []);

  const handleOpenOrderItemModalByButton = useCallback(() => {
    setIsNewOrderItemModalOpen(true);
  }, []);

  const handleCloseOrderItemModal = useCallback(() => {
    setIsNewOrderItemModalOpen(false);
    setSelectedOrderItem(undefined);
  }, []);

  const handleSaveOrderItem = useCallback(
    (orderItem: OrderItemInputForm, isEdit?: boolean) => {
      const id = Number(selectedOrderItem?.id);
      if (isEdit && id) {
        setFieldValue(
          "items",
          (values.items ?? []).map((item) => {
            if (Number(item.id) === id) {
              return orderItem;
            }
            return item;
          })
        );
      } else {
        setFieldValue("items", [...(values.items ?? []), orderItem]);
      }
      setSelectedOrderItem(undefined);
      setIsNewOrderItemModalOpen(false);
    },
    [selectedOrderItem?.id, setFieldValue, values.items]
  );

  const handleEditOrderItem = useCallback(
    (orderItem: OrderItemInputForm) => () => {
      setSelectedOrderItem(orderItem);
      setIsNewOrderItemModalOpen(true);
    },
    []
  );

  const handleExpandOrderItem = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setShowMerchandiseDetail(true);
  }, []);

  const getMerchandiseTypeName = useCallback(
    (id: number) => {
      const item = (merchandiseTypes ?? []).find((item) => ensureString(item.id) === ensureString(id));
      return item?.name ?? t("common.empty");
    },
    [merchandiseTypes, t]
  );

  const handleOpenDeleteConfirmModal = useCallback(
    (item: Partial<OrderItemInfo>) => () => {
      selectedOrderItemRef.current = item;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  const handleCloseDeleteConfirmModal = useCallback(() => {
    selectedOrderItemRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, []);

  const handleRemoveOrderItem = useCallback(() => {
    const id = Number(selectedOrderItemRef.current?.id);
    if (id) {
      setFieldValue(
        "items",
        (values.items ?? []).filter((item) => Number(item.id) !== id)
      );
    }
    selectedOrderItemRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, [setFieldValue, values.items]);

  return (
    <>
      <CardHeader title={t("order_new.merchandise_panel.title")} />
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
        <div className="col-span-full">
          <label htmlFor="merchandiseType" className="block text-sm font-medium leading-6 text-gray-900">
            {t("order_new.merchandise_panel.type")}
          </label>
          <div>
            <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 py-4">
              {(values.merchandiseTypes ?? []).map((item: Partial<MerchandiseTypeInfo>) => (
                <Badge
                  key={item?.id}
                  label={ensureString(item.name)}
                  onRemove={handleRemoveMerchandiseType(item?.id)}
                />
              ))}
            </div>
            <div className="grid max-w-2xl grid-cols-1 xl:grid-cols-6">
              <div className="xl:col-span-3">
                <div className="flex gap-x-4">
                  <div className="flex-1">
                    <Combobox
                      items={merchandiseTypeOptions}
                      loading={isLoading}
                      placeholder={t("order_new.merchandise_panel.placeholder")}
                      onChange={handleMerchandiseTypeFieldChange}
                      newButtonText={t("order_new.merchandise_panel.new")}
                      value={ensureString(selectedMerchandiseType?.id)}
                      onNewButtonClick={handleToggleMerchandiseTypeModal}
                      manageButtonText={t("order_new.merchandise_panel.manage")}
                      onManageButtonClick={handleManageMerchandiseType}
                      placement="top"
                    />
                  </div>
                  <Button variant="outlined" type="button" color="secondary" onClick={handleAddMerchandiseType}>
                    {t("order_new.merchandise_panel.add")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Note */}
        <div className="col-span-full">
          <TextField
            label={t("order_new.merchandise_panel.note")}
            name="merchandiseNote"
            value={ensureString(values.merchandiseNote)}
            onChange={handleChange}
            multiline
            errorText={formatError(t, touched.merchandiseNote && errors.merchandiseNote)}
          />
          {!showMerchandiseDetail && !hasMerchandiseDetail && (
            <div className="mt-2">
              <Link useDefaultStyle href="" onClick={handleExpandOrderItem}>
                <span aria-hidden="true">+</span> {t("order_new.merchandise_panel.new_details")}
              </Link>
            </div>
          )}
        </div>

        {/* Merchandise Details */}
        {(showMerchandiseDetail || hasMerchandiseDetail) && (
          <div className="col-span-full">
            <label htmlFor="merchandiseType" className="block text-sm font-medium leading-6 text-gray-900">
              {t("order_new.merchandise_panel.details")}
            </label>
            <TableContainer horizontalScroll verticalScroll className="-mx-4 !mt-2 sm:-mx-6" variant="paper" inside>
              <Table dense>
                <TableHead uppercase>
                  <TableRow>
                    <TableCell className="w-10">
                      <span className="sr-only">Arrow</span>
                    </TableCell>
                    <TableCell className="w-10 !pl-0">{t("order_new.merchandise_panel.index")}</TableCell>
                    <TableCell>{t("order_new.merchandise_panel.name")}</TableCell>
                    <TableCell>{t("order_new.merchandise_panel.type")}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="inline-flex flex-col items-center">
                        {t("order_new.merchandise_panel.package_method")}
                        <span className="block text-[10px] font-normal normal-case text-gray-400">
                          {t("order_new.merchandise_panel.dimensions")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">{t("order_new.merchandise_panel.weight")}</TableCell>
                    <TableCell className="hidden 2xl:table-cell">{t("order_new.merchandise_panel.amount")}</TableCell>
                    <TableCell action>
                      <span className="sr-only">{t("common.actions")}</span>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {!hasMerchandiseDetail && (
                    <TableRow hover={false}>
                      <TableCell colSpan={8}>
                        <EmptyListSection
                          onClick={handleOpenOrderItemModalByButton}
                          description={
                            <>
                              {t.rich("order_new.merchandise_panel.empty_list_message", {
                                strong: (chunks) => <strong>{chunks}</strong>,
                              })}
                            </>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {values?.items?.map((item, index) => (
                    <Disclosure key={item.id} as={Fragment}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            as="tr"
                            className={clsx({
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
                            <TableCell>{getMerchandiseTypeName(Number(item.merchandiseType?.id))}</TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {item.packageLength || item.packageWidth || item.packageHeight ? (
                                <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                                  <span>
                                    <NumberLabel
                                      value={Number(item.packageLength)}
                                      emptyLabel="--"
                                      unit={t("common.unit.centimeter").toLowerCase()}
                                      useSpace={false}
                                    />
                                  </span>
                                  <span>
                                    <NumberLabel
                                      value={Number(item.packageWidth)}
                                      emptyLabel="--"
                                      unit={t("common.unit.centimeter").toLowerCase()}
                                      useSpace={false}
                                    />
                                  </span>
                                  <span>
                                    <NumberLabel
                                      value={Number(item.packageHeight)}
                                      emptyLabel="--"
                                      unit={t("common.unit.centimeter").toLowerCase()}
                                      useSpace={false}
                                    />
                                  </span>
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="hidden 2xl:table-cell">
                              <NumberLabel
                                value={Number(item.packageWeight)}
                                emptyLabel={t("common.empty")}
                                unit={t("common.unit.kilogram").toLowerCase()}
                              />
                            </TableCell>
                            <TableCell className="hidden 2xl:table-cell">
                              <NumberLabel value={Number(item.quantity)} emptyLabel={t("common.empty")} />
                              {item.unit && ` ${item.unit}`}
                            </TableCell>
                            <TableCell action className="flex flex-col items-start justify-start gap-y-2">
                              <button type="button" title={t("common.edit")} onClick={handleEditOrderItem(item)}>
                                <PencilSquareIcon
                                  aria-hidden="true"
                                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                                />
                              </button>
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
                            <TableCell colSpan={8} className="py-4" nowrap={false}>
                              <DescriptionProperty2
                                className="block xl:hidden"
                                label={t("order_new.merchandise_panel.package_method")}
                              >
                                {(item.packageLength || item.packageWidth || item.packageHeight) && (
                                  <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                                    <span>
                                      <NumberLabel
                                        value={Number(item.packageLength)}
                                        emptyLabel="--"
                                        unit={t("common.unit.centimeter").toLowerCase()}
                                        useSpace={false}
                                      />
                                    </span>
                                    <span>
                                      <NumberLabel
                                        value={Number(item.packageWidth)}
                                        emptyLabel="--"
                                        unit={t("common.unit.centimeter").toLowerCase()}
                                        useSpace={false}
                                      />
                                    </span>
                                    <span>
                                      <NumberLabel
                                        value={Number(item.packageHeight)}
                                        emptyLabel="--"
                                        unit={t("common.unit.centimeter").toLowerCase()}
                                        useSpace={false}
                                      />
                                    </span>
                                  </span>
                                )}
                              </DescriptionProperty2>
                              <DescriptionProperty2
                                className="block 2xl:hidden"
                                label={t("order_new.merchandise_panel.weight")}
                              >
                                {item.packageWeight && (
                                  <NumberLabel
                                    value={Number(item.packageWeight)}
                                    unit={t("common.unit.kilogram").toLowerCase()}
                                  />
                                )}
                              </DescriptionProperty2>
                              <DescriptionProperty2
                                className="block 2xl:hidden"
                                label={t("order_new.merchandise_panel.amount")}
                              >
                                {item.quantity && <NumberLabel value={Number(item.quantity)} />}
                                {item.unit && ` ${item.unit}`}
                              </DescriptionProperty2>
                              <DescriptionProperty2
                                className="break-all"
                                label={t("order_new.merchandise_panel.short_note")}
                              >
                                {item.notes}
                              </DescriptionProperty2>
                            </TableCell>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {hasMerchandiseDetail && (
              <div className="mt-2">
                <Link useDefaultStyle href="" onClick={handleOpenOrderItemModalByLink}>
                  <span aria-hidden="true">+</span> {t("order_new.merchandise_panel.create")}
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* New Merchandise Modal */}
      <NewOrderItemModal
        open={isNewOrderItemModalOpen}
        editOrderItem={selectedOrderItem}
        onClose={handleCloseOrderItemModal}
        onSave={handleSaveOrderItem}
      />

      {/* New Merchandise Type Modal */}
      <NewMerchandiseTypeModal
        open={isNewMerchandiseTypeModalOpen}
        onClose={handleToggleMerchandiseTypeModal}
        onSubmit={handleNewMerchandiseTypeModalSubmit}
      />

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", {
          name: selectedOrderItemRef.current?.name,
        })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirmModal}
        onCancel={handleCloseDeleteConfirmModal}
        onConfirm={handleRemoveOrderItem}
      />
    </>
  );
};

export default memo(MerchandisePanel);
