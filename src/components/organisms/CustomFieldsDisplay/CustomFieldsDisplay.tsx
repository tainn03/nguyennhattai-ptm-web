"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CustomFieldDataType, CustomFieldType } from "@prisma/client";
import isObject from "lodash/isObject";
import isString from "lodash/isString";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { mutate } from "swr";
import { AnyObject } from "yup";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionProperty2,
  Link,
  NumberLabel,
  Visible,
} from "@/components/atoms";
import { CustomFieldOrderModal, UploadInput } from "@/components/molecules";
import { useAuth, useCustomFieldByType, useOrgSettingExtendedStorage } from "@/hooks";
import { useOrderState } from "@/redux/states";
import { CustomFieldFile } from "@/types/customField";
import { CustomFieldInfo } from "@/types/strapi";
import { isValidDate } from "@/utils/date";
import { isNumeric } from "@/utils/number";
import { ensureString, isTrue, randomString, randomUUID, stringToColor } from "@/utils/string";
import { cn } from "@/utils/twcn";

type CustomFieldsDisplayProps = {
  type: CustomFieldType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
  loading?: boolean;
  allowEdit?: boolean;
};

export const CustomFieldsDisplay = ({ meta, loading, allowEdit, type }: CustomFieldsDisplayProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { order } = useOrderState();
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();
  const { customFields } = useCustomFieldByType({ organizationId: orgId, type });

  const customFieldData = useMemo(() => meta?.customFields || [], [meta]);

  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);

  /**
   * Handle open modal edit data of custom field
   */
  const handleToggleCustomFieldModal = useCallback(() => {
    setIsCustomFieldModalOpen(!isCustomFieldModalOpen);
  }, [isCustomFieldModalOpen]);

  /**
   * Handle render label of custom fields
   */
  const renderCustomFieldProperties = useMemo(
    () =>
      (customFields || []).map((field: CustomFieldInfo) => {
        const key = ensureString(field.id);
        const data = customFieldData.find((item: AnyObject) => item.id === field.id);
        const emptyLabel = "-";
        const customFieldType = field.dataType === data?.dataType;

        switch (field.dataType) {
          case CustomFieldDataType.TEXT:
          case CustomFieldDataType.EMAIL: {
            const value = isString(data?.value) && customFieldType ? ensureString(data?.value) : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>*]:break-all [&>label]:!whitespace-pre-wrap"
                label={field.name}
                loading={loading}
              >
                {field.dataType === CustomFieldDataType.EMAIL && value ? (
                  <Link useDefaultStyle underline href={`mailto:${value}`}>
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.NUMBER: {
            const value = isNumeric(data?.value) && customFieldType ? Number(data?.value) : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                label={field.name}
                loading={loading}
              >
                <NumberLabel value={value} emptyLabel={emptyLabel} />
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.DATE: {
            const value = isValidDate(data?.value as Date) && customFieldType ? (data?.value as Date) : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                label={field.name}
                loading={loading}
              >
                <DateTimeLabel type="date" value={value} emptyLabel={emptyLabel} />
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.DATETIME: {
            const value = isValidDate(data?.value as Date) && customFieldType ? (data?.value as Date) : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                label={field.name}
                loading={loading}
              >
                <DateTimeLabel type="datetime_no_second" value={value} emptyLabel={emptyLabel} />
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.BOOLEAN: {
            const value = typeof data?.value === "boolean" && customFieldType ? data?.value : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                loading={loading}
                label={field.name}
              >
                <Badge
                  label={value ? t("custom_field.boolean.checked") : t("custom_field.boolean.un_checked")}
                  color={value ? "success" : "error"}
                />
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.CHOICE: {
            const value = data?.value || null;
            let color = null;
            if (field?.value && value) {
              const listValues = field.value!.split("\n");
              color =
                listValues
                  .find((val) => {
                    const valueLabel = val.split(",")[0];
                    return valueLabel.toLowerCase() === value.toLowerCase();
                  })
                  ?.split(",")[1] || null;
              if (!color) {
                const rdStr = randomString(randomUUID().length);
                color = stringToColor(rdStr);
              }
            }

            return (
              <DescriptionProperty2
                key={field.id}
                size="short"
                className="[&>label]:!whitespace-pre-wrap [&>label]:break-all"
                loading={loading}
                label={field.name}
              >
                {value && <Badge label={value} customColor={color} />}
              </DescriptionProperty2>
            );
          }
          case CustomFieldDataType.FILE: {
            const files = isObject(data?.value) && customFieldType ? (data?.value as CustomFieldFile[]) : null;
            return (
              <DescriptionProperty2
                key={field.id}
                size="long"
                className={cn("[&>label]:!whitespace-pre-wrap [&>label]:break-all", {
                  "place-content-center [&>label]:w-full": files && files.length > 0,
                })}
                label={field.name}
                loading={loading}
              >
                {files && files.length > 0 && (
                  <div className="col-span-full" key={field.id}>
                    <div className="grid grid-cols-6 gap-4">
                      {files.map((file, index) => (
                        <div key={index} className="col-span-2 sm:col-span-1">
                          <UploadInput
                            key={index}
                            value={{
                              name: file.name ?? "",
                              url: file.url ?? "",
                            }}
                            type="CUSTOM_FIELD"
                            name={key}
                            previewGrid={false}
                            showDeleteButton={false}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DescriptionProperty2>
            );
          }

          default:
            break;
        }
      }),
    [customFields, customFieldData, loading, t]
  );

  /**
   * Handle save data custom fields
   */
  const handleSaveDataCustomFields = useCallback(() => {
    handleToggleCustomFieldModal();
    mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
  }, [handleToggleCustomFieldModal, order?.code, orgId]);

  /**
   * Render custom field content
   */
  const content = useMemo(
    () => (
      <ul role="list" className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-7 xl:gap-x-8">
        <li className="group col-span-full overflow-hidden rounded-lg">{renderCustomFieldProperties}</li>
      </ul>
    ),
    [renderCustomFieldProperties]
  );

  return (
    customFieldData &&
    customFields &&
    customFields.length > 0 && (
      <>
        {type === CustomFieldType.ORDER_TRIP ? (
          content
        ) : (
          <Card className="col-span-full">
            <CardHeader
              loading={loading}
              title={t("custom_field.input_group_title")}
              actionComponent={
                <Visible when={!!allowEdit} except={isTrue(orderConsolidationEnabled)}>
                  <button onClick={handleToggleCustomFieldModal}>
                    <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </Visible>
              }
            />
            <CardContent>{content}</CardContent>
          </Card>
        )}

        {/* Custom field detail modal */}
        {type === CustomFieldType.ORDER && (
          <CustomFieldOrderModal
            open={isCustomFieldModalOpen}
            onSave={handleSaveDataCustomFields}
            onClose={handleToggleCustomFieldModal}
          />
        )}
      </>
    )
  );
};

export default CustomFieldsDisplay;
