"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { convertExcelToJSON, getSheetNames } from "@/actions/dynamicImport";
import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Combobox, Modal, UploadInput } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { CustomerImportType } from "@/constants/organization";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { ImportedOrder } from "@/types/importedOrder";
import { CustomerInfo } from "@/types/strapi";
import { cn } from "@/utils/twcn";

import { CustomerButtonGroup } from ".";

type OrderImportModalProps = {
  open: boolean;
  onUploaded: (data: ImportedOrder[], customer: CustomerInfo) => void;
  onClose: () => void;
};

export default function OrderImportModal({ open, onClose, onUploaded }: OrderImportModalProps) {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { showNotification } = useNotification();

  const [file, setFile] = useState<UploadInputValue>();
  const [importCustomer, setImportCustomer] = useState<CustomerInfo>();
  const [isUploading, setIsUploading] = useState(false);
  const [sheetNames, setSheetNames] = useState<ComboboxItem[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle closing the import modal
   * Resets all state values to their defaults:
   */
  const handleClose = useCallback(() => {
    onClose();
    setFile(undefined);
    setImportCustomer(undefined);
    setSheetNames([]);
    setErrorText(null);
    setSelectedSheetName(null);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Handle change file
   */
  const handleChange = useCallback((value?: UploadInputValue) => {
    setFile(value);
    setIsUploading(false);
  }, []);

  /**
   * Handle select customer type
   */
  const handleSelectCustomerType = useCallback((customer: CustomerInfo) => {
    // Trigger file input to allow user to select a file
    fileInputRef.current?.click();
    // Update customer type state
    setImportCustomer(customer);
  }, []);

  /**
   * Handle getting sheet names from uploaded file
   */
  const handleGetSheetNames = useCallback(async () => {
    if (file && importCustomer) {
      // Show loading state
      setIsUploading(true);

      // Call API to get sheet names
      const { data, status } = await getSheetNames({
        customerType: importCustomer.importDriver as CustomerImportType,
        file,
      });

      if (status === HttpStatusCode.Ok && data) {
        // Map sheet names to combobox items format
        setSheetNames(data.map((sheetName) => ({ label: sheetName, value: sheetName })));
      } else {
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message: t("order_group.import_order_error_message"),
        });

        // Handle error by closing modal
        handleClose();
      }
      setIsUploading(false);
    }
  }, [file, handleClose, importCustomer, showNotification, t]);

  /**
   * Handle importing orders from uploaded file
   *
   * Validates required fields:
   * Makes API call to import orders and handles response:
   */
  const handleImportOrder = useCallback(async () => {
    // Validate sheet name is selected
    if (!selectedSheetName) {
      setErrorText(t("order_group.import_order_sheet_name_error"));
      return;
    }

    // Validate file and customer type are provided
    if (!file || !importCustomer || !orgId) {
      showNotification({
        color: "error",
        title: t("common.message.error_title"),
        message: t("order_group.import_order_error_message"),
      });
      return;
    }

    // Show loading state
    setIsUploading(true);

    // Call import API with selected options
    const { data, status } = await convertExcelToJSON({
      customer: importCustomer,
      organizationId: orgId,
      file,
      sheetName: selectedSheetName,
    });

    // Handle API response
    if (status === HttpStatusCode.Ok && data) {
      // Success - call callback with imported data
      onUploaded(data, importCustomer);
    } else if (status === HttpStatusCode.NotImplemented) {
      // Error - Template not implemented
      setErrorText(t("order_group.import_order_error_not_implemented"));
    } else {
      // Error - show notification
      showNotification({
        color: "error",
        title: t("common.message.error_title"),
        message: t("order_group.import_order_error_message"),
      });
    }

    setIsUploading(false);
  }, [file, importCustomer, onUploaded, orgId, selectedSheetName, showNotification, t]);

  /**
   * Get modal title based on import state
   */
  const title = useMemo(() => {
    if (sheetNames.length > 0 && file) {
      return t("order_group.import_customer_type", { customerName: importCustomer?.name });
    } else {
      return t("order_group.import_order");
    }
  }, [file, importCustomer, sheetNames.length, t]);

  return (
    <>
      <Modal open={open} onClose={handleClose} showCloseButton={!isUploading} allowOverflow size="xl">
        <ModalHeader title={title} />
        <ModalContent>
          <div className="space-y-4">
            <div className="rounded-lg">
              <div className="flex w-full flex-col items-center gap-4">
                {/* Customer button group */}
                {sheetNames.length === 0 && (
                  <>
                    <p className="text-sm text-gray-600">{t("order_group.import_order_customer_type")}</p>
                    <CustomerButtonGroup customer={importCustomer} file={file} onSelect={handleSelectCustomerType} />
                  </>
                )}

                {/* Sheet name combobox */}
                {sheetNames.length > 0 && (
                  <Combobox
                    items={sheetNames}
                    required
                    label={t("order_group.import_order_sheet_name")}
                    placeholder={t("order_group.import_order_sheet_name_placeholder")}
                    value={selectedSheetName ?? undefined}
                    errorText={errorText ?? undefined}
                    onChange={setSelectedSheetName}
                  />
                )}
              </div>
            </div>

            {/* Upload input */}
            <UploadInput
              ref={fileInputRef}
              type="IMPORT_ORDER"
              uploadLabel={t("order_group.import_order_upload_label")}
              previewGrid={false}
              showDeleteButton={!sheetNames.length}
              className={cn("w-full", {
                hidden: !file?.name,
              })}
              name="importFile"
              value={file}
              onChange={handleChange}
              onUploading={setIsUploading}
              disabled={isUploading}
            />
          </div>
        </ModalContent>

        <ModalActions>
          <Button variant="outlined" color="secondary" onClick={handleClose} disabled={isUploading}>
            {t("common.cancel")}
          </Button>

          {sheetNames.length > 0 ? (
            <Button onClick={handleImportOrder} disabled={!file} loading={isUploading}>
              {t("order_group.continue")}
            </Button>
          ) : (
            <Button onClick={handleGetSheetNames} disabled={!file} loading={isUploading}>
              {t("order_group.continue")}
            </Button>
          )}
        </ModalActions>
      </Modal>
    </>
  );
}
