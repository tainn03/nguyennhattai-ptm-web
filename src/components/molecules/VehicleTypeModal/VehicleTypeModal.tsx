"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Combobox, Modal } from "@/components/molecules";
import { useAuth, useVehicleTypeOptions } from "@/hooks";

type VehicleTypeModalProps = {
  open: boolean;
  excludeIds?: number[];
  onConfirm?: (id: number, name: string) => void;
  onClose: () => void;
};

const VehicleTypeModal = ({ open, onClose, onConfirm, excludeIds }: VehicleTypeModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { vehicleTypes: data } = useVehicleTypeOptions({
    organizationId: Number(orgId),
    ...(excludeIds && { excludeIds }),
  });

  const [selectedVehicleType, setSelectedVehicleType] = useState<string>();

  /**
   * Memoize the vehicle type options
   */
  const vehicleTypeOptions = useMemo(
    () =>
      data.map((vehicleType: { id: number; name: string }) => ({
        value: vehicleType.id.toString(),
        label: vehicleType.name,
      })),
    [data]
  );

  /**
   * Handle the confirm action
   */
  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      const selectedVehicle = data.find((vehicleType) => vehicleType.id.toString() === selectedVehicleType);
      if (selectedVehicle) {
        onConfirm(selectedVehicle.id, selectedVehicle.name);
      }
    }
  }, [data, onConfirm, selectedVehicleType]);

  return (
    <Modal open={open} onClose={onClose} showCloseButton allowOverflow>
      <ModalHeader title={t("route_point.select_vehicle_type")} />
      <ModalContent className="space-y-2">
        <Combobox
          label={t("route_point.vehicle_type")}
          items={vehicleTypeOptions}
          placeholder={t("route_point.vehicle_type_placeholder")}
          onChange={(value) => setSelectedVehicleType(value)}
        />
      </ModalContent>
      <ModalActions>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleConfirm}>{t("common.new")}</Button>
      </ModalActions>
    </Modal>
  );
};

export default VehicleTypeModal;
