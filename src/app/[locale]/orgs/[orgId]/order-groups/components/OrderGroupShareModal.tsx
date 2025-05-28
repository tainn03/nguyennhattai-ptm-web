"use client";

import { Dialog } from "@headlessui/react";
import { ShareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { Checkbox, DescriptionProperty2, ModalActions, ModalContent } from "@/components/atoms";
import { Button, CopyToClipboard, DatePicker, Modal } from "@/components/molecules";

type OrderGroupShareModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function OrderGroupShareModal({ open, onClose }: OrderGroupShareModalProps) {
  const [expireDate, setExpireDate] = useState<Date | null>(new Date());
  const [isShareMap, setIsShareMap] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = () => {
    setShareUrl("https://autotms.com/share/order-groups/abc123");
  };

  return (
    <Modal open={open} divider={false} className="sm:!max-w-lg" onDismiss={onClose}>
      <ModalContent className="pb-0 pt-0 text-center">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShareIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>

          <div className="mt-3 text-center sm:mt-5">
            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
              Chia sẻ nhóm đơn hàng
            </Dialog.Title>
          </div>

          {!shareUrl && (
            <>
              <div className="mt-2">
                <p className="text-sm tracking-tight text-gray-500">Bạn có muốn chia sẻ nhóm đơn hàng này không?</p>
              </div>

              <div className="mt-6">
                <div className="mt-2 flex items-center justify-center">
                  <label className="mr-3 block text-sm font-medium leading-6 text-gray-900">Ngày hết hạn</label>
                  <DatePicker
                    className="w-36"
                    selected={expireDate}
                    minDate={new Date()}
                    onChange={(date) => setExpireDate(date)}
                  />
                </div>
                <label className="block text-xs italic leading-6 text-gray-500">
                  (Xóa thời gian hết hạn nếu bạn không muốn thiết lập)
                </label>
                <div className="mt-2 flex w-full items-center justify-center">
                  <Checkbox
                    label="Chia sẻ vị trí xe trong quá trình giao hàng"
                    checked={isShareMap}
                    onChange={(e) => setIsShareMap(e.target.checked)}
                  />
                </div>
              </div>
            </>
          )}

          {shareUrl && (
            <>
              <div className="mt-2 flex flex-row">
                <a href={shareUrl} target="_blank" className="flex-1 truncate text-blue-600 hover:underline">
                  {shareUrl}
                </a>
                <CopyToClipboard value={shareUrl} className="ml-2 h-5 min-w-[5.5rem]" isLink />
              </div>
              {expireDate && (
                <div className="mt-2 flex items-center justify-center">
                  <DescriptionProperty2 label="Ngày hết hạn">{expireDate.toLocaleDateString()}</DescriptionProperty2>
                </div>
              )}
            </>
          )}
        </div>
      </ModalContent>

      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button variant="outlined" color="secondary" className="min-w-[120px] flex-1" onClick={onClose}>
          {shareUrl ? "Đóng" : "Hủy"}
        </Button>
        {!shareUrl && (
          <Button color="primary" className="min-w-[120px] flex-1" onClick={handleShare}>
            Chia sẻ
          </Button>
        )}
        {shareUrl && (
          <Button color="error" className="min-w-[120px] flex-1" onClick={() => setShareUrl(null)}>
            Hủy chia sẻ
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
