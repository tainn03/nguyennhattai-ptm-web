"use client";
import { useState } from "react";

import {
  Checkbox,
  DescriptionProperty2,
  InfoBox,
  ModalActions,
  ModalContent,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { ModalHeader } from "@/components/atoms";
import { AddressInformation, Button, DatePicker, Modal, Select } from "@/components/molecules";

import baseOrder from "./baseOrder.json";

const vehicles = [
  {
    label: "66B1-12345",
    value: "1",
  },
  {
    label: "66B1-12346",
    value: "2",
  },
  {
    label: "66B1-12347",
    value: "3",
  },
  {
    label: "66B1-12348",
    value: "4",
  },
];

const drivers = [
  {
    label: "Nguyễn Văn A",
    value: "1",
  },
  {
    label: "Nguyễn Văn B",
    value: "2",
  },
  {
    label: "Nguyễn Văn C",
    value: "3",
  },
  {
    label: "Nguyễn Văn D",
    value: "4",
  },
];

type TransshipmentModalProps = {
  open: boolean;
  selectedCount: number;
  selectedVehicle: string;
  selectedDriver: string;
  onTransshipment: () => void;
  onSelectVehicleAndDriver: () => void;
  onClose: () => void;
};

export default function TransshipmentModal({
  open,
  selectedCount,
  selectedVehicle,
  selectedDriver,
  onSelectVehicleAndDriver,
  onTransshipment,
  onClose,
}: TransshipmentModalProps) {
  const [pickupDateSource, setPickupDateSource] = useState<Date | null>(new Date());
  const [deliveryDateSource, setDeliveryDateSource] = useState<Date | null>(new Date());

  const [pickupDateDestination, setPickupDateDestination] = useState<Date | null>(new Date());
  const [deliveryDateDestination, setDeliveryDateDestination] = useState<Date | null>(new Date());

  return (
    <Modal open={open} onClose={onClose} size="5xl" showCloseButton allowOverflow>
      <ModalHeader title="Tạo thông tin trung chuyển" />
      <ModalContent padding={false} className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden">
        <DescriptionProperty2 label="Số lượng" className="px-4 pb-4 pt-6">
          <NumberLabel value={selectedCount} unit="thùng" />
        </DescriptionProperty2>

        <TableContainer variant="paper" inside className="border-t border-gray-200">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn hàng</TableCell>
                <TableCell>Khách hàng</TableCell>
                <TableCell>Điểm nhận hàng</TableCell>
                <TableCell>Ngày đặt hàng</TableCell>
                <TableCell>Số lượng</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {baseOrder
                .filter((_, index) => index < 3)
                .map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <span className="pl-4 font-semibold">{order.orderCode}</span>
                    </TableCell>
                    <TableCell>
                      <InfoBox label={order.customer.name} subLabel={order.customer.description} />
                    </TableCell>
                    <TableCell>
                      <InfoBox label={order.route.code} subLabel={order.route.name} />
                    </TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell>
                      <NumberLabel value={order.quantity} unit="thùng" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 p-4 pb-6 sm:grid-cols-6">
          <label className="col-span-full text-base font-semibold text-gray-900">Xe nhận hàng</label>

          <div className="sm:col-span-2">
            <DatePicker
              label="Ngày lấy hàng"
              selected={pickupDateSource}
              onChange={(date) => setPickupDateSource(date)}
            />
          </div>

          <div className="sm:col-span-2">
            <DatePicker
              label="Ngày giao hàng"
              selected={deliveryDateSource}
              onChange={(date) => setDeliveryDateSource(date)}
            />
          </div>

          <div className="sm:col-span-2 sm:col-start-1">
            <Select label="Xe" items={vehicles} placeholder="Chọn xe" value={selectedVehicle} />
          </div>

          <div className="flex items-end sm:col-span-1">
            <Button className="w-full" variant="outlined" onClick={onSelectVehicleAndDriver}>
              Chọn xe
            </Button>
          </div>

          <div className="sm:col-span-2">
            <Select label="Tài xế" items={drivers} placeholder="Chọn tài xế" value={selectedDriver} />
          </div>

          <div className="col-span-full pt-2">
            <Checkbox label="Gửi thông báo cho tài xế" defaultChecked />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 p-4 pb-6 sm:grid-cols-6">
          <label className="col-span-full text-base font-semibold text-gray-900">Điểm tập kết</label>
          <AddressInformation
            setFieldValue={() => {}}
            getFieldMeta={() => ({ value: {}, error: "", touched: false, initialTouched: false })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 p-4 pb-6 sm:grid-cols-6">
          <label className="col-span-full text-base font-semibold text-gray-900">Xe giao hàng</label>

          <div className="sm:col-span-2">
            <DatePicker
              label="Ngày lấy hàng"
              selected={pickupDateDestination}
              onChange={(date) => setPickupDateDestination(date)}
            />
          </div>

          <div className="sm:col-span-2">
            <DatePicker
              label="Ngày giao hàng"
              selected={deliveryDateDestination}
              onChange={(date) => setDeliveryDateDestination(date)}
            />
          </div>

          <div className="sm:col-span-2 sm:col-start-1">
            <Select label="Xe" items={vehicles} placeholder="Chọn xe" value={selectedVehicle} />
          </div>

          <div className="flex items-end sm:col-span-1">
            <Button className="w-full" variant="outlined" onClick={onSelectVehicleAndDriver}>
              Chọn xe
            </Button>
          </div>

          <div className="sm:col-span-2">
            <Select label="Tài xế" items={drivers} placeholder="Chọn tài xế" value={selectedDriver} />
          </div>

          <div className="col-span-full pt-2">
            <Checkbox label="Gửi thông báo cho tài xế" defaultChecked />
          </div>
        </div>
      </ModalContent>

      <ModalActions align="right">
        <Button variant="outlined" color="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={onTransshipment}>Tạo đơn trung chuyển kho</Button>
      </ModalActions>
    </Modal>
  );
}
