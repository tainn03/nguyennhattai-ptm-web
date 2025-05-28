"use client";

import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";
import { mutate } from "swr";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import { routeNameModalInputSchema } from "@/forms/order";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { updateRouteName } from "@/services/client/route";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { RouteInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: Partial<RouteInfo> = {
  name: "",
};

type RouteNameModalProps = {
  open: boolean;
  onClose: () => void;
};

export const RouteNameModal = ({ open, onClose }: RouteNameModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgId, userId } = useAuth();
  const { order } = useOrderState();

  /**
   * Handle submitting the formik form.
   * @param {Partial<RouteInfo>} values The form values.
   * @param {FormikHelpers<Partial<RouteInfo>>} formikHelpers The formik helpers.
   */
  const handleSubmitFormik = useCallback(
    async (values: Partial<RouteInfo>, formikHelpers: FormikHelpers<Partial<RouteInfo>>) => {
      let result: MutationResult<RouteInfo>;
      if (orgId) {
        result = await updateRouteName(
          { organizationId: orgId, id: values.id, name: values.name, updatedById: userId } as RouteInfo,
          ensureString(values?.updatedAt)
        );

        formikHelpers.setSubmitting(false);

        if (result.error) {
          let message = "";
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("route_point.save_error_exclusive");
              break;
            case ErrorType.UNKNOWN:
              message = t("route_point.save_error_unknown");
              break;
            default:
              break;
          }

          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message,
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("customer.route.name"),
          });
          mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
          onClose();
        }
      }
    },
    [onClose, order?.code, orgId, showNotification, t, userId]
  );

  const { values, touched, errors, setValues, handleSubmit, handleChange } = useFormik({
    initialValues: initialFormValues,
    validationSchema: routeNameModalInputSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    if (order?.route) {
      setValues(order?.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <Modal open={open} showCloseButton onClose={onClose} onDismiss={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={t("order.route_card.edit_route_name")} />
        <ModalContent>
          <TextField
            label={t("customer.route.name")}
            name="name"
            value={values.name}
            maxLength={30}
            onChange={handleChange}
            errorText={formatError(t, getIn(touched, "name") && getIn(errors, "name"))}
          />
        </ModalContent>
        <ModalActions align="right">
          <Button type="button" variant="outlined" color="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit"> {t("common.save")}</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
export default RouteNameModal;
