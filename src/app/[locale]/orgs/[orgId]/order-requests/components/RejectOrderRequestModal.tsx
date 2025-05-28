import { useTranslations } from "next-intl";
import { memo, useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";

type RejectOrderRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

const RejectOrderRequestModal: React.FC<RejectOrderRequestModalProps> = ({
  open,
  onClose,
}: RejectOrderRequestModalProps) => {
  const t = useTranslations();
  const [reason, setReason] = useState("");

  return (
    <Modal open={open} divider={false} onDismiss={onClose}>
      <ModalHeader title="Từ chối yêu cầu đặt hàng" className="border-b border-gray-200" />
      <ModalContent className="space-y-4">
        <p className="text-sm text-gray-600">
          <strong className="text-red-600">⚠ Lưu ý:</strong> Hành động này không thể hoàn tác và khách hàng sẽ nhận
          được thông báo ngay lập tức.
        </p>
        <p className="text-sm text-gray-600">
          Vui lòng nhập lý do từ chối để hệ thống ghi nhận và phản hồi đến khách hàng.
        </p>

        <TextField
          autoFocus
          multiline
          showCount
          className="my-2 mt-2"
          label="Lý do từ chối"
          name="reason"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ModalContent>
      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button className="flex-1" variant="outlined" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="flex-1" color="error" onClick={onClose} disabled={!reason}>
          Từ chối đơn đặt hàng
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default memo(RejectOrderRequestModal);
