"use client";

import { CustomerType } from "@prisma/client";
import { getIn, useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CardContent, CardHeader, TabPanel } from "@/components/atoms";
import { Combobox, Tabs, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { NewCustomerModal } from "@/components/organisms";
import { OrderInputForm } from "@/forms/order";
import { useCustomerOptions, usePermission } from "@/hooks";
import { CustomerInfo } from "@/types/strapi";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

export type CustomerTabProps = Pick<OrgPageProps, "orgId" | "orgLink"> & {
  onFixedCustomerChange?: (customer: CustomerInfo | undefined) => void;
};

export const CustomerTab = ({ orgId, orgLink, onFixedCustomerChange }: CustomerTabProps) => {
  const t = useTranslations();
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<OrderInputForm>();
  const { canNew, canFind } = usePermission("customer");

  const customerTypes: TabItem[] = [
    { label: t("order_new.customer_tab.fixed"), value: CustomerType.FIXED },
    { label: t("order_new.customer_tab.casual"), value: CustomerType.CASUAL },
  ];

  const [selectedCustomerTypeTab, setSelectedCustomerTypeTab] = useState(customerTypes[0].value);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const { customers, isLoading, mutate } = useCustomerOptions({ organizationId: orgId });

  const customerOptions: ComboboxItem[] = useMemo(
    () =>
      customers.map((item: CustomerInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })),
    [customers]
  );

  useEffect(() => {
    if (values.customer?.type) {
      setSelectedCustomerTypeTab(values.customer.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.customer?.type]);

  const handleFixedCustomerChange = useCallback(
    (value: string) => {
      if (onFixedCustomerChange) {
        const customer = customers.find((item) => equalId(item.id, value));
        onFixedCustomerChange(customer);
      }
    },
    [customers, onFixedCustomerChange]
  );

  const handleNewCustomerModalOpen = useCallback(() => {
    setIsNewCustomerModalOpen(true);
  }, []);

  const handleNewCustomerModalClose = useCallback(() => {
    setIsNewCustomerModalOpen(false);
  }, []);

  const handleNewCustomerModalSubmit = useCallback(
    (id?: number) => {
      setIsNewCustomerModalOpen(false);
      if (id) {
        setFieldValue("customerId", id);
        mutate();
      }
    },
    [mutate, setFieldValue]
  );

  const handleManageCustomer = useCallback(() => {
    window.open(`${orgLink}/customers`, "_blank");
  }, [orgLink]);

  const handleChangeTab = useCallback(
    (tab: string) => {
      setSelectedCustomerTypeTab(tab);
      setFieldValue("customer.type", tab);
    },
    [setFieldValue]
  );

  return (
    <>
      <CardHeader title={t("order_new.customer_tab.info")} className="rounded-t-md border-t-0" />
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
        <Tabs
          items={customerTypes}
          selectedTab={selectedCustomerTypeTab}
          onTabChange={handleChangeTab}
          className="col-span-full"
        />
        <TabPanel item={customerTypes[0]} selectedTab={selectedCustomerTypeTab}>
          <Combobox
            label={t("order_new.customer_tab.customer")}
            required
            items={customerOptions}
            value={ensureString(values.customerId)}
            onChange={handleFixedCustomerChange}
            loading={isLoading}
            placeholder={t("order_new.customer_tab.placeholder")}
            newButtonText={canNew() ? t("order_new.customer_tab.new") : undefined}
            onNewButtonClick={canNew() ? handleNewCustomerModalOpen : undefined}
            manageButtonText={canFind() ? t("order_new.customer_tab.manage") : undefined}
            onManageButtonClick={canFind() ? handleManageCustomer : undefined}
            className="col-span-full"
            errorText={formatError(t, getIn(touched, "customerId") && getIn(errors, "customerId"))}
          />
        </TabPanel>

        <TabPanel item={customerTypes[1]} selectedTab={selectedCustomerTypeTab}>
          <div className="sm:col-span-3 2xl:col-span-4">
            <TextField
              label={t("order_new.customer_tab.name")}
              required
              name="customer.name"
              value={ensureString(values.customer?.name)}
              onChange={handleChange}
              helperText={t("order_new.customer_tab.name_helper_text")}
              errorText={formatError(t, getIn(touched, "customer.name") && getIn(errors, "customer.name"))}
            />
          </div>
          {/* <div className="sm:col-span-3 2xl:col-span-2">
            <TextField
              label="Mã khách hàng"
              name="customer.code"
              value={ensureString(values.customer?.code)}
              onChange={handleChange}
              errorText={getIn(touched, "customer.code") && getIn(errors, "customer.code")}
            />
          </div> */}
          <div className="sm:col-span-3 2xl:col-span-2">
            <TextField
              label={t("order_new.customer_tab.tax_code")}
              name="customer.taxCode"
              value={ensureString(values.customer?.taxCode)}
              onChange={handleChange}
              errorText={formatError(t, getIn(touched, "customer.taxCode") && getIn(errors, "customer.taxCode"))}
            />
          </div>
          <div className="sm:col-span-3">
            <TextField
              label={t("order_new.customer_tab.email")}
              name="customer.email"
              value={ensureString(values.customer?.email)}
              onChange={handleChange}
              errorText={formatError(t, getIn(touched, "customer.email") && getIn(errors, "customer.email"))}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label={t("order_new.customer_tab.phone")}
              name="customer.phoneNumber"
              value={ensureString(values.customer?.phoneNumber)}
              onChange={handleChange}
              errorText={formatError(
                t,
                getIn(touched, "customer.phoneNumber") && getIn(errors, "customer.phoneNumber")
              )}
            />
          </div>
          <div className="col-span-full">
            <TextField
              label={t("order_new.customer_tab.address")}
              name="customer.businessAddress"
              value={ensureString(values.customer?.businessAddress)}
              onChange={handleChange}
              errorText={formatError(
                t,
                getIn(touched, "customer.businessAddress") && getIn(errors, "customer.businessAddress")
              )}
            />
          </div>
          <div className="col-span-full">
            <TextField
              label={t("order_new.customer_tab.description")}
              name="customer.description"
              value={ensureString(values.customer?.description)}
              multiline
              onChange={handleChange}
              errorText={formatError(
                t,
                getIn(touched, "customer.description") && getIn(errors, "customer.description")
              )}
            />
          </div>
        </TabPanel>
      </CardContent>

      {/* New Customer Modal */}
      <NewCustomerModal
        open={isNewCustomerModalOpen}
        onClose={handleNewCustomerModalClose}
        onSubmit={handleNewCustomerModalSubmit}
      />
    </>
  );
};

export default CustomerTab;
