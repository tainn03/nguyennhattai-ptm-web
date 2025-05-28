"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { Link, ModalContent, ModalHeader } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { OrderTab } from "@/constants/order";
import { useAuth } from "@/hooks";
import { BillOfLadingAccountantReminderNotification } from "@/types/notification";

type BillOfLadingAccountantModalProps = {
  open: boolean;
  notification: BillOfLadingAccountantReminderNotification | null;
  onClose?: () => void;
};

const BillOfLadingAccountantModal = ({ open, notification, onClose }: BillOfLadingAccountantModalProps) => {
  const { orgLink } = useAuth();
  const t = useTranslations("components");
  const uniqueId = useId();

  return (
    <Modal open={open} onClose={onClose} showCloseButton onDismiss={onClose}>
      <ModalHeader title={t("bill_of_lading_accountant_modal.title")} subTitle={notification?.billOfLadingSubmitDate} />
      <ModalContent padding={false}>
        <ul role="list" className="divide-y divide-gray-300 px-4">
          {(notification?.orderTrips || []).map((trip) => (
            <li key={uniqueId} className="py-4">
              <Link
                useDefaultStyle
                target="_blank"
                className="flex cursor-pointer justify-between gap-x-4"
                href={`${orgLink}/orders/${trip.orderCode}?tab=${OrderTab.DISPATCH_VEHICLE}`}
              >
                <div className="flex min-w-0 gap-x-4">
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-600">{trip.tripCode}</p>
                    <p className="mt-1 truncate text-xs leading-5 text-gray-400">{trip.driverName}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </ModalContent>
    </Modal>
  );
};

export default BillOfLadingAccountantModal;
