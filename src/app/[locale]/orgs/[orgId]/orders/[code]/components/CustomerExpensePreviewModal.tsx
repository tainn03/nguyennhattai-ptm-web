import { UploadFile } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { uploadDocumentImages } from "@/actions/orderTripExpense";
import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Authorization, Button, Modal, UploadInput } from "@/components/molecules";
import { useNotification } from "@/redux/actions";
import { HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { OrderTripExpenseInfo } from "@/types/strapi";

type CustomerExpensePreviewModalProps = {
  open: boolean;
  onClose?: () => void;
  onSave?: () => void;
  orderTripExpense: Partial<OrderTripExpenseInfo> | undefined;
  orderTripCode: string;
};

const CustomerExpensePreviewModal = ({
  open,
  onClose,
  onSave,
  orderTripCode,
  orderTripExpense,
}: CustomerExpensePreviewModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();

  const [documentImages, setDocumentImages] = useState<UploadInputValue[]>([]);
  const [deleteImage, setDeleteImage] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const previousDocumentImages = useRef<Partial<UploadFile>[]>([]);
  /**
   * Initialize document images from orderTripExpense if available.
   * Set current images and store previous images for change detection.
   */
  useEffect(() => {
    if (orderTripExpense?.documents && Array.isArray(orderTripExpense.documents)) {
      const mapped = orderTripExpense.documents.map((doc) => ({
        id: doc.id,
        name: doc.name ?? "",
        url: doc.url ?? "",
      }));

      previousDocumentImages.current = orderTripExpense.documents;
      setDocumentImages(mapped);
    }
  }, [orderTripExpense?.documents]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const isChanged =
        documentImages.length !== previousDocumentImages.current.length ||
        documentImages.some((img, index) => {
          const prev = previousDocumentImages.current[index];
          return img.id !== prev?.id || img.url !== prev?.url;
        });
      if (isChanged) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [t, documentImages, onClose]);

  /**
   * Reset the state when the modal is closed.
   */
  useEffect(() => {
    if (!open) {
      setIsUploading(false);
      setIsSubmitting(false);
      setDeleteImage([]);
      setDocumentImages([]);
    }
  }, [open]);

  /**
   * Handles the form submission:
   * - Uploads current document images.
   * - Shows success or error notification based on result.
   * - Calls `onSave` callback if upload is successful.
   */
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const { status } = await uploadDocumentImages({
      orderTripExpenseId: Number(orderTripExpense?.id),
      previousDocuments: previousDocumentImages.current,
      currentDocuments: documentImages,
    });

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
        message: t("components.order_trip_expense.save_bill_success_message", {
          expenseType: orderTripExpense?.expenseType?.name?.toLowerCase(),
          code: orderTripCode,
        }),
      });
      onSave && onSave();
    }
    setIsSubmitting(false);
  }, [
    documentImages,
    onSave,
    orderTripCode,
    orderTripExpense?.expenseType?.name,
    orderTripExpense?.id,
    showNotification,
    t,
  ]);

  /**
   * Handles adding or removing a document image:
   * - If a file is provided, add it to the documentImages state.
   * - If no file is provided, remove the file at the specified index.
   *   If the removed file has an ID, track it in deleteImage for deletion.
   */
  const handleMultiFileChange = useCallback(
    (index?: number) => (file?: UploadInputValue) => {
      if (file) {
        setDocumentImages((prevFileImages) => [...prevFileImages, file]);
      } else {
        const updatedFileImages = [...documentImages];
        const removedItem = updatedFileImages.splice(Number(index), 1)[0];

        if (removedItem && removedItem.id) {
          setDeleteImage([...deleteImage, Number(removedItem.id)]);
        }

        setDocumentImages(updatedFileImages);
      }
    },
    [documentImages, deleteImage]
  );

  /**
   * Memoized component to render multiple uploaded document previews.
   * - Displays a grid of `UploadInput` components for each document image.
   * - If there are no images, returns `null`.
   */
  const viewMultipleFile = useMemo(() => {
    if (documentImages.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-4 gap-4">
        {documentImages.map((item, index) => (
          <div key={index} className="col-span-2 sm:col-span-1">
            <UploadInput
              key={index}
              value={{
                name: item.name ?? "",
                url: item.url ?? "",
              }}
              type="ORDER_TRIP_EXPENSE_DOCUMENT"
              name="image"
              previewGrid={false}
              onChange={handleMultiFileChange(index)}
            />
          </div>
        ))}
      </div>
    );
  }, [documentImages, handleMultiFileChange]);

  const handleUploading = useCallback((isUploading: boolean) => {
    setIsUploading(isUploading);
  }, []);

  return (
    <Modal open={open} size="2xl" showCloseButton onClose={onClose} onDismiss={onClose}>
      <form method="POST">
        <ModalHeader
          title={t("components.order_trip_expense.preview_modal_title", {
            code: orderTripCode,
            expenseType: orderTripExpense?.expenseType?.name?.toLowerCase(),
          })}
        />
        <ModalContent>
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2 lg:col-span-3">
            <div className="col-span-full">
              {viewMultipleFile}
              <UploadInput
                className="mt-5"
                label={t("order.trip.update_bill_of_lading_modal.bill_of_lading_image")}
                name="documentImages"
                multiple
                showPreview={false}
                type="ORDER_TRIP_EXPENSE_DOCUMENT"
                value={undefined}
                onChange={handleMultiFileChange(undefined)}
                onUploading={handleUploading}
                helperText={t("order.trip.update_bill_of_lading_modal.bill_of_lading_image_helper")}
              />
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
          >
            {t("common.cancel")}
          </Button>
          <Authorization resource="bill-of-lading" action="edit">
            <Button type="button" onClick={handleSubmit} disabled={isUploading} loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </Authorization>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default CustomerExpensePreviewModal;
