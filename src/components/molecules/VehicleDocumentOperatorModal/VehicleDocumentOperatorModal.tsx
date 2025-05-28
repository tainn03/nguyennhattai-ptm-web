"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useMemo } from "react";

import { Link, ModalContent, ModalHeader } from "@/components/atoms";
import { Authorization, Modal } from "@/components/molecules";
import { useAuth, useIdParam } from "@/hooks";
import { VehicleDocumentOperatorReminderNotification } from "@/types/notification";
import { ensureString } from "@/utils/string";

type VehicleDocumentOperatorModalProps = {
  open: boolean;
  notification: VehicleDocumentOperatorReminderNotification | null;
  onClose?: () => void;
};

const VehicleDocumentOperatorModal = ({ open, notification, onClose }: VehicleDocumentOperatorModalProps) => {
  const { orgLink } = useAuth();
  const { encryptId } = useIdParam();
  const t = useTranslations("components");
  const uniqueId = useId();

  const isInsuranceType = useMemo(
    () => !!notification?.liabilityInsuranceExpirationDate,
    [notification?.liabilityInsuranceExpirationDate]
  );

  return (
    <Modal open={open} onClose={onClose} showCloseButton onDismiss={onClose}>
      <ModalHeader
        title={t("vehicle_document_operator_modal.title", {
          documentType: isInsuranceType
            ? t("vehicle_document_operator_modal.liability_insurance")
            : t("vehicle_document_operator_modal.technical_safety"),
        })}
        subTitle={
          isInsuranceType
            ? ensureString(notification?.liabilityInsuranceExpirationDate)
            : ensureString(notification?.technicalSafetyExpirationDate)
        }
      />
      <ModalContent padding={false}>
        <ul role="list" className="divide-y divide-gray-300 px-4">
          {(notification?.vehicles || []).map((vehicle) => (
            <li key={uniqueId} className="py-4">
              <Authorization
                resource="vehicle"
                action="detail"
                fallbackComponent={
                  <div className="flex justify-between gap-x-4">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="min-w-0 flex-auto">
                        <p className="text-sm font-semibold leading-6 text-gray-600">{vehicle.vehicleNumber}</p>
                        <p className="mt-1 truncate text-xs leading-5 text-gray-400">{vehicle.driverName}</p>
                      </div>
                    </div>
                  </div>
                }
              >
                <Link
                  useDefaultStyle
                  target="_blank"
                  className="flex cursor-pointer justify-between gap-x-4"
                  href={`${orgLink}/vehicles/${encryptId(vehicle.vehicleId)}`}
                >
                  <div className="flex min-w-0 gap-x-4">
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm font-semibold leading-6 text-gray-600">{vehicle.vehicleNumber}</p>
                      <p className="mt-1 truncate text-xs leading-5 text-gray-400">{vehicle.driverName}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                </Link>
              </Authorization>
            </li>
          ))}
        </ul>
      </ModalContent>
    </Modal>
  );
};

export default VehicleDocumentOperatorModal;
