import { CustomFieldType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { ModalContent, ModalHeader } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { CustomFieldsDisplay } from "@/components/organisms";
import { OrderTripInfo } from "@/types/strapi";

type OrderTripCustomFieldDisplayModalProps = {
  open: boolean;
  orderTrip: Partial<OrderTripInfo>;
  onClose: () => void;
};

const OrderTripCustomFieldDisplayModal = ({ open, orderTrip, onClose }: OrderTripCustomFieldDisplayModalProps) => {
  const t = useTranslations();
  return (
    <Modal open={open} showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("custom_field.input_group_title")} />
      <ModalContent>
        <CustomFieldsDisplay type={CustomFieldType.ORDER_TRIP} meta={orderTrip?.meta} />
      </ModalContent>
    </Modal>
  );
};

export default OrderTripCustomFieldDisplayModal;
