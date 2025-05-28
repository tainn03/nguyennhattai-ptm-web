"use client";

import { CustomerType, RouteType } from "@prisma/client";
import { useTranslations } from "next-intl";

import {
  DescriptionProperty2,
  Link,
  ModalActions,
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
import { Alert, Authorization, Button, EmptyListSection, Modal } from "@/components/molecules";
import { useAuth, useIdParam, usePermission } from "@/hooks";
import { CustomerInfo, RouteInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";

type ConfirmResetDriverExpenseModalProps = {
  open: boolean;
  routeInfo: Partial<RouteInfo>;
  customerInfo: Partial<CustomerInfo>;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmResetDriverExpenseModal = ({
  open,
  routeInfo,
  customerInfo,
  loading,
  onConfirm,
  onClose,
}: ConfirmResetDriverExpenseModalProps) => {
  const { orgLink, userId } = useAuth();
  const { encryptId } = useIdParam();
  const t = useTranslations();
  const {
    canFind,
    canEdit: canEditCustomerRoute,
    canEditOwn: canEditOwnCustomerRoute,
  } = usePermission("customer-route");

  return (
    <Modal open={open} showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("order.vehicle_dispatch.vehicle_dispatch_reset_trip_driver_expense")} />
      <ModalContent padding={false} className="space-y-2">
        <div className="px-4 pt-4">
          <Alert
            color="warning"
            title={t("order.vehicle_dispatch.vehicle_dispatch_reset_trip_driver_expense_description")}
          />
        </div>
        <div className="px-4 pt-2">
          {routeInfo?.type === RouteType.FIXED ? (
            <>
              {routeInfo?.driverCost ? (
                <div className="text-sm">
                  <Authorization
                    alwaysAuthorized={
                      canFind() &&
                      (canEditCustomerRoute() ||
                        (canEditOwnCustomerRoute() && equalId(customerInfo?.createdByUser?.id, userId)))
                    }
                  >
                    {t.rich("order.vehicle_dispatch.route_driver_cost_info", {
                      route: () =>
                        customerInfo.type === CustomerType.FIXED && customerInfo.id && routeInfo.id ? (
                          <Link
                            useDefaultStyle
                            className="!font-medium"
                            target="_blank"
                            scroll
                            underline
                            href={`${orgLink}/customers/${encryptId(customerInfo.id)}/routes/${encryptId(
                              routeInfo.id
                            )}/edit#cost-information`}
                          >
                            {routeInfo?.code}
                          </Link>
                        ) : (
                          <span className="text-sm !font-medium leading-6">{routeInfo?.code}</span>
                        ),
                    })}
                  </Authorization>
                </div>
              ) : (
                <>
                  <Authorization
                    alwaysAuthorized={
                      canFind() &&
                      (canEditCustomerRoute() ||
                        (canEditOwnCustomerRoute() && equalId(customerInfo?.createdByUser?.id, userId)))
                    }
                    fallbackComponent={
                      <span className="text-sm italic text-gray-500">
                        {t("order.vehicle_dispatch.driver_salary_detail.route_driver_cost_empty_info_cant_not_edit")}
                      </span>
                    }
                  >
                    {t.rich("order.vehicle_dispatch.driver_salary_detail.route_driver_cost_empty_info", {
                      strong: (chunks) => <span className="text-sm italic text-gray-500">{chunks}</span>,
                      link: (chunks) =>
                        customerInfo.type === CustomerType.FIXED && customerInfo.id && routeInfo.id ? (
                          <Link
                            useDefaultStyle
                            className="!font-normal italic"
                            underline
                            target="_blank"
                            scroll
                            href={`${orgLink}/customers/${encryptId(customerInfo.id)}/routes/${encryptId(
                              routeInfo.id
                            )}/edit#cost-information`}
                          >
                            {chunks}
                          </Link>
                        ) : (
                          <span className="text-sm !font-normal italic leading-6">{chunks}</span>
                        ),
                    })}
                  </Authorization>
                </>
              )}
            </>
          ) : (
            <p className="text-sm font-normal italic leading-6 text-gray-900">
              {t("order.vehicle_dispatch.driver_salary_detail.route_not_fixed_driver_cost_info")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 px-4 sm:flex-nowrap">
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_subcontractor_cost")}
          >
            <NumberLabel value={Number(routeInfo.subcontractorCost)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_toll_fees")}
          >
            <NumberLabel value={Number(routeInfo.bridgeToll)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          <DescriptionProperty2
            colons={false}
            className="[&>label]:w-full"
            label={t("order.vehicle_dispatch.vehicle_dispatch_other_costs")}
          >
            <NumberLabel value={Number(routeInfo.otherCost)} type="currency" emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
        </div>

        <label className="whitespace-nowrap px-4 text-sm font-medium leading-6 text-gray-900">
          {t("order.vehicle_dispatch.driver_salary_detail.driver_cost")}
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
              {(routeInfo.driverExpenses || []).length === 0 && (
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
              {(routeInfo.driverExpenses || []).map((item, index) => (
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
                    <NumberLabel value={routeInfo.driverCost} type="currency" emptyLabel="0" />
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>
      <ModalActions align="right">
        <Button disabled={loading} variant="outlined" color="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button loading={loading} onClick={onConfirm}>
          {t("common.save")}
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default ConfirmResetDriverExpenseModal;
