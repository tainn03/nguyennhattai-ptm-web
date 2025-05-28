"use client";

import { DriverContractType, Gender } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import {
  Button,
  DriverContactForm,
  DriverLicenseForm,
  DriverPersonalInfoForm,
  InputGroup,
  Modal,
} from "@/components/molecules";
import { driverCreateModalFormSchema, DriverInputForm } from "@/forms/driver";
import { useNotification } from "@/redux/actions";
import { createDriver } from "@/services/client/driver";
import { ErrorType } from "@/types";
import { OrgPageProps } from "@/utils/client";

export type NewDriverModalProps = Pick<OrgPageProps, "orgId" | "orgLink"> & {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const initialFormValues: DriverInputForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  gender: Gender.UNKNOWN,
  idNumber: null,
  idIssueDate: null,
  idIssuedBy: null,
  email: null,
  phoneNumber: null,
  addressInformationId: null,
  licenseTypeId: null,
  licenseNumber: null,
  licenseIssueDate: null,
  licenseExpiryDate: null,
  licenseFrontImageId: null,
  licenseBackImageId: null,
  experienceYears: null,
  basicSalary: null,
  contractType: DriverContractType.FIXED_TERM,
  contractDocumentIds: null,
  bankAccountId: null,
  description: null,
  isActive: true,
  userId: null,
  createdById: null,
  updatedById: null,
  publishedAt: null,
  bankAccount: {
    accountNumber: "",
    holderName: "",
    bankName: "",
    bankBranch: "",
  },
  address: {
    addressLine1: "",
  },
  isDeleteLicenseFrontImage: false,
  isDeleteLicenseBackImage: false,
  isDeleteContractDocuments: false,
};

const NewDriverModal = ({ open, orgId, orgLink, onClose, onSubmit }: NewDriverModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();

  const formikRef = useRef<FormikProps<DriverInputForm>>(null);

  const handleSubmitFormik = useCallback(
    async (values: DriverInputForm, formikHelpers: FormikHelpers<DriverInputForm>) => {
      // Check if it's a new driver or an update
      const { data, status, code } = await createDriver(orgLink, values);

      formikHelpers.setSubmitting(false);
      if (status !== HttpStatusCode.Ok) {
        // Handle different error types
        let message = "";
        if (code === ErrorType.UNKNOWN) {
          message = t("common.message.save_error_unknown", {
            name: t("vehicle.display_full_name", {
              lastname: values.lastName ?? "",
              firstname: values.firstName ?? "",
            }),
          });
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        // Show a success notification and navigate to the drivers page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: t("vehicle.display_full_name", {
              lastname: values.lastName ?? "",
              firstname: values.firstName ?? "",
            }),
          }),
        });

        formikHelpers.resetForm({ values: initialFormValues });
        data && onSubmit && onSubmit(data);
      }
    },
    [orgLink, showNotification, t, onSubmit]
  );

  const handleCancelClick = useCallback(() => {
    formikRef.current?.resetForm({ values: formikRef.current?.values, touched: formikRef.current?.touched });
    onClose && onClose();
  }, [onClose]);

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

  return (
    <Modal open={open} size="5xl" showCloseButton onClose={handleCancelClick} allowOverflow>
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={driverCreateModalFormSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ isSubmitting, handleSubmit }) => (
          <form method="POST" onSubmit={handleSubmit}>
            <ModalHeader title={t("vehicle.new_driver_modal.title")} />
            <ModalContent className="space-y-12">
              <InputGroup
                title={t("vehicle.new_driver_modal.general_title")}
                description={t("vehicle.new_driver_modal.general_description")}
                className="!pb-10"
              >
                <DriverPersonalInfoForm inModal />
              </InputGroup>

              <InputGroup
                title={t("vehicle.new_driver_modal.contact_info_title")}
                description={t("vehicle.new_driver_modal.contact_info_description")}
                className="!pb-10"
              >
                <DriverContactForm inModal />
              </InputGroup>

              <InputGroup
                title={t("vehicle.new_driver_modal.license_info_title")}
                description={t("vehicle.new_driver_modal.license_info_description")}
                showBorderBottom={false}
                className="!py-4"
              >
                <DriverLicenseForm organizationId={Number(orgId)} mode="NEW" inModal />
              </InputGroup>
            </ModalContent>
            <ModalActions>
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                disabled={isSubmitting}
                onClick={handleCancelClick}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {t("common.save")}
              </Button>
            </ModalActions>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

export default NewDriverModal;
