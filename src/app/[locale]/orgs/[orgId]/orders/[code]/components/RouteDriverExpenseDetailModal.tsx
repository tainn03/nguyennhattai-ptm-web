import { DriverExpenseType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  DescriptionProperty2,
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
import { RouteInfo, VehicleTypeInfo } from "@/types/strapi";
import { formatCurrency } from "@/utils/number";

type RouteDriverExpenseDetailModalProps = {
  open: boolean;
  route: Partial<RouteInfo>;
  vehicleType?: Partial<VehicleTypeInfo>;
  onClose: () => void;
};

const RouteDriverExpenseDetailModal = ({ open, route, vehicleType, onClose }: RouteDriverExpenseDetailModalProps) => {
  const t = useTranslations();
  const [driverCost, setDriverCost] = useState(0);

  const driverExpenseTableRows = useMemo(() => {
    let total = 0;
    const driverExpenses = (route.driverExpenses || []).map((item, index) => {
      let amount = Number(item.amount);
      let helperText = "";
      if (item.driverExpense?.type === DriverExpenseType.DRIVER_COST) {
        const driverExpenseSalary = amount;
        const driverExpenseRate = Number(vehicleType?.driverExpenseRate);
        const driverExpenseName = item.driverExpense.name;
        amount = (driverExpenseSalary * driverExpenseRate) / 100;
        helperText = t("order.vehicle_dispatch_modal.driver_expense_rate_helper_text", {
          vehicleType: vehicleType?.name,
          driverExpenseRate,
          driverExpenseName,
          driverExpenseSalary: formatCurrency(Number(driverExpenseSalary)),
        });
      }
      total += amount;

      return (
        <TableRow key={item.id}>
          <TableCell align="left">{index + 1}</TableCell>
          <TableCell>{item.driverExpense?.name}</TableCell>
          <TableCell align="right" className="w-1/2 !pr-3">
            <div className="font-medium !text-gray-900">
              <NumberLabel value={amount} type="currency" emptyLabel="-" />
            </div>
            <div className="whitespace-break-spaces text-xs">{helperText}</div>
          </TableCell>
        </TableRow>
      );
    });
    setDriverCost(total);
    return driverExpenses;
  }, [route.driverExpenses, t, vehicleType?.driverExpenseRate, vehicleType?.name]);

  return (
    <Modal open={open} onClose={onClose} onDismiss={onClose} showCloseButton>
      <ModalHeader title={t("order.vehicle_dispatch.route_driver_expense.title", { routeCode: route.code })} />
      <ModalContent padding={false}>
        <div className="flex flex-wrap justify-between gap-x-3 p-4 sm:flex-nowrap">
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_subcontractor_cost")}
          >
            <NumberLabel value={Number(route.subcontractorCost)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_toll_fees")}
          >
            <NumberLabel value={Number(route.bridgeToll)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_other_costs")}
          >
            <NumberLabel value={Number(route.otherCost)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
        </div>

        <label className="whitespace-nowrap px-4 text-sm font-medium leading-6 text-gray-900">
          {t("order.vehicle_dispatch.route_driver_expense.driver_salary_detail")}
        </label>
        <TableContainer className="mt-2" inside variant="paper">
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
              {(route.driverExpenses || []).length === 0 && (
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
              {driverExpenseTableRows}
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

export default RouteDriverExpenseDetailModal;
