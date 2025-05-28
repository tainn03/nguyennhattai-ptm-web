import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { BsUpload } from "react-icons/bs";
import { RiPhoneFindLine } from "react-icons/ri";

import { Spinner } from "@/components/atoms";
import { useAuth, useImportDriversForCustomer } from "@/hooks";
import { UploadInputValue } from "@/types/file";
import { CustomerInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { cn } from "@/utils/twcn";

type CustomerButtonGroupProps = {
  customer: CustomerInfo | undefined;
  file?: UploadInputValue;
  onSelect: (customer: CustomerInfo) => void;
};

export default function CustomerButtonGroup({ customer, file, onSelect }: CustomerButtonGroupProps) {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { customers, isLoading } = useImportDriversForCustomer({ organizationId: Number(orgId) });

  const handleSelect = useCallback(
    (item: CustomerInfo) => () => {
      if (!file) {
        onSelect(item);
      }
    },
    [file, onSelect]
  );

  return (
    <div
      className={cn("mb-4 flex w-full", {
        "flex-row": customers?.length <= 2,
        "flex-col gap-2": customers?.length > 2,
      })}
    >
      {isLoading && customers.length === 0 && (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      )}

      {!isLoading && customers.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-2 text-center">
          {/* icon */}
          <RiPhoneFindLine className="h-10 w-10 text-gray-500" />
          <p className="text-sm text-gray-600">{t("order_group.import_customer_type_empty")}</p>
        </div>
      )}

      {(customers || []).map((item) => (
        <button
          key={`customer-button-${item.id}`}
          onClick={handleSelect(item)}
          className={cn(
            "w-full rounded-md border-gray-300 px-4 py-2 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1",
            {
              "border first:rounded-r-none first:border-r-0 last:rounded-l-none": customers?.length <= 2,
              border: customers?.length > 2,

              "bg-blue-600 text-white": equalId(item.id, customer?.id),
              "bg-white text-gray-700 hover:bg-gray-50 focus:border-blue-500 focus:ring-blue-500": !equalId(
                item.id,
                customer?.id
              ),
            }
          )}
        >
          <div className="flex items-center justify-start gap-4">
            <BsUpload className="h-6 w-6 flex-shrink-0" />
            <span className="flex-1 text-left">
              {t("order_group.import_customer_type", { customerName: item.name })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
