"use client";

import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { NumberLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection, NumberField } from "@/components/molecules";
import { RouteInputForm } from "@/forms/route";
import { DriverExpenseInfo } from "@/types/strapi";
import { formatError } from "@/utils/yup";

type RouteCostInfoFormProps = {
  driverExpenses: DriverExpenseInfo[];
};

const RouteCostInfoForm = ({ driverExpenses }: RouteCostInfoFormProps) => {
  const t = useTranslations();
  const { values, touched, errors, handleChange } = useFormikContext<RouteInputForm>();

  const driverExpenseTotal = useMemo(
    () =>
      driverExpenses.reduce((acc, item) => {
        const value = values[item.key] ? Number(values[item.key]) : 0;
        return acc + value;
      }, 0),
    [driverExpenses, values]
  );

  return (
    <>
      <div className="sm:col-span-2 sm:col-start-1">
        <NumberField
          suffixText={t("common.unit.currency")}
          label={t("customer.route.route_cost")}
          name="price"
          value={values?.price}
          onChange={handleChange}
          errorText={formatError(t, touched.price && errors.price)}
        />
      </div>
      <div className="sm:col-span-2">
        <NumberField
          suffixText={t("common.unit.currency")}
          label={t("customer.route.subcontractor_cost")}
          name="subcontractorCost"
          value={values?.subcontractorCost}
          onChange={handleChange}
          errorText={formatError(t, touched.subcontractorCost && errors.subcontractorCost)}
        />
      </div>

      <div className="sm:col-span-2">
        <NumberField
          suffixText={t("common.unit.currency")}
          label={t("customer.route.bridge_toll")}
          name="bridgeToll"
          value={values?.bridgeToll}
          onChange={handleChange}
          errorText={formatError(t, touched.bridgeToll && errors.bridgeToll)}
        />
      </div>
      <div className="sm:col-span-2">
        <NumberField
          suffixText={t("common.unit.currency")}
          label={t("customer.route.other_cost")}
          name="otherCost"
          value={values?.otherCost}
          onChange={handleChange}
          errorText={formatError(t, touched.otherCost && errors.otherCost)}
        />
      </div>
      <div className="col-span-full">
        <label className="whitespace-nowrap text-sm font-medium leading-6 text-gray-900">
          {t("customer.route.driver_cost")}
        </label>
        <TableContainer className="!mt-2" inside horizontalScroll variant="paper">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableCell className="w-5" align="left">
                  {t("customer.route.cost_index")}
                </TableCell>
                <TableCell>{t("customer.route.cost_name")}</TableCell>
                <TableCell className="w-56">{t("customer.route.cost_amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Empty data */}
              {driverExpenses.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={3} className="px-6 lg:px-8">
                    <EmptyListSection
                      title={t("customer.route.no_driver_expense_title")}
                      description={t("customer.route.no_driver_expense_description")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {driverExpenses.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell align="left">{index + 1}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <NumberField
                      name={item.key}
                      value={values[item.key] ? Number(values[item.key]) : null}
                      suffixText={t("common.unit.currency")}
                      onChange={handleChange}
                      errorText={formatError(t, touched[item.key] && errors[item.key])}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="space-x-4" colSpan={3} align="right">
                  <span className="text-base font-medium leading-6 text-gray-900">{t("customer.route.total")}</span>
                  <span className="text-base font-medium leading-6 text-blue-700 hover:text-blue-600">
                    <NumberLabel value={driverExpenseTotal} type="currency" emptyLabel="0" />
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
};

export default RouteCostInfoForm;
