"use client";

import { MaintenanceTypeType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { MaintenanceTypeInputForm, maintenanceTypeInputFormSchema } from "@/forms/maintenanceType";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { createMaintenanceType } from "@/services/client/maintenanceType";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { MaintenanceTypeInfo } from "@/types/strapi";
import { formatError } from "@/utils/yup";

export type NewMaintenanceTypeModalProps = {
  type?: MaintenanceTypeType | null;
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const initialFormValues: MaintenanceTypeInputForm = {
  type: "VEHICLE",
  name: "",
  description: "",
  isActive: true,
};

const NewMaintenanceTypeModal = ({ open, type, onClose, onSubmit }: NewMaintenanceTypeModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(
    async (values: MaintenanceTypeInputForm, formikHelpers: FormikHelpers<MaintenanceTypeInputForm>) => {
      if (!orgId || !userId) {
        return;
      }

      // Check if it's a new maintenance type or an update
      const { data, error }: MutationResult<MaintenanceTypeInfo> = await createMaintenanceType({
        ...(values as MaintenanceTypeInfo),
        organizationId: orgId,
        createdById: userId,
      });

      formikHelpers.setSubmitting(false);
      if (error) {
        // Handle different error types
        let message = "";
        switch (error) {
          case ErrorType.EXISTED:
            message = `Tên [${values.name}] đã tồn tại.`;
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.UNKNOWN:
            message = `Phát sinh lỗi trong quá trình lưu loại bảo trì [${values.name}]. Vui lòng thử lại hoặc liên hệ với quản trị viên`;
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: "Phát sinh lỗi",
          message,
        });
      } else {
        // Show a success notification and navigate to the maintenance types page
        showNotification({
          color: "success",
          title: "Lưu thành công",
          message: `Loại bảo trì [${values.name}] đã được lưu thành công.`,
        });
        formikHelpers.resetForm({ values: initialFormValues });
        data && onSubmit && onSubmit(data.id);
      }
    },
    [orgId, userId, onSubmit, showNotification]
  );

  const { touched, values, errors, dirty, resetForm, handleChange, handleSubmit, setFieldValue, isSubmitting } =
    useFormik({
      initialValues: initialFormValues,
      validationSchema: maintenanceTypeInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  const handleCancelClick = useCallback(() => {
    resetForm({ values, touched });
    onClose && onClose();
  }, [onClose, resetForm, touched, values]);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "Dữ liệu đang chỉnh sửa chưa được lưu, bạn có chắc muốn hủy và rời khỏi trang?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  useEffect(() => {
    if (type) {
      setFieldValue("type", type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <Modal open={open}>
      <form method="POST" onSubmit={handleSubmit}>
        <ModalHeader title={`Thêm loại bảo trì (${values.type === "VEHICLE" ? "Xe" : "Rơ moóc"})`} />
        <ModalContent className="space-y-6">
          <TextField
            label="Tên"
            name="name"
            value={values.name}
            required
            maxLength={255}
            onChange={handleChange}
            errorText={formatError(t, touched.name && errors.name)}
          />

          <TextField
            label="Mô tả"
            name="description"
            value={values.description ?? ""}
            multiline
            rows={4}
            maxLength={500}
            showCount
            onChange={handleChange}
            errorText={touched.description && errors.description}
          />
        </ModalContent>
        <ModalActions>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            disabled={isSubmitting}
            onClick={handleCancelClick}
          >
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Lưu
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default NewMaintenanceTypeModal;
