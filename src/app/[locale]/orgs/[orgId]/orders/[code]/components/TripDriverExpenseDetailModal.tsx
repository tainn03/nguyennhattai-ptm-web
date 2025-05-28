import { useTranslations } from "next-intl";

import {
  ModalContent,
  ModalHeader,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { EmptyListSection, Modal } from "@/components/molecules";
import { TripDriverExpenseInfo } from "@/types/strapi";

type TripDriverExpenseDetailModalProps = {
  open: boolean;
  tripCode: string;
  driverCost: number;
  tripDriverExpense: Partial<TripDriverExpenseInfo>[];
  onClose: () => void;
};

const TripDriverExpenseDetailModal = ({
  open,
  tripCode,
  driverCost,
  tripDriverExpense,
  onClose,
}: TripDriverExpenseDetailModalProps) => {
  const t = useTranslations();

  return (
    <Modal open={open} onClose={onClose} onDismiss={onClose} showCloseButton>
      <ModalHeader title={t("order.vehicle_dispatch.trip_driver_expense.title", { tripCode })} />
      <ModalContent padding={false}>
        <TableContainer inside variant="paper">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableCell className="w-5" align="left">
                  {t("order.vehicle_dispatch.driver_salary_detail.cost_index")}
                </TableCell>
                <TableCell>{t("order.vehicle_dispatch.driver_salary_detail.cost_name")}</TableCell>
                <TableCell align="right" className="w-56 !pr-3">
                  {t("order.vehicle_dispatch.driver_salary_detail.cost_amount")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Empty data */}
              {(tripDriverExpense || []).length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={3} className="px-6 lg:px-8">
                    <EmptyListSection
                      title={t("order.vehicle_dispatch.driver_salary_detail.no_driver_expense_title")}
                      description={t("order.vehicle_dispatch.driver_salary_detail.no_driver_expense_description")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {(tripDriverExpense || []).map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell align="left">{index + 1}</TableCell>
                  <TableCell>{item.driverExpense?.name}</TableCell>
                  <TableCell align="right" className="!pr-3 font-medium !text-gray-900">
                    <NumberLabel value={Number(item.amount)} type="currency" emptyLabel={t("common.empty")} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="space-x-4" colSpan={3} align="right">
                  <span className="text-base font-medium leading-6 text-gray-900">
                    {t("order.vehicle_dispatch.driver_salary_detail.total")}
                  </span>
                  <span className="text-base font-medium leading-6 text-blue-700 hover:text-blue-600">
                    <NumberLabel value={driverCost} type="currency" emptyLabel="0" />
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>
    </Modal>
  );
};

export default TripDriverExpenseDetailModal;
