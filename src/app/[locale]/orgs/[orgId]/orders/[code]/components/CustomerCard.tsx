"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CustomerType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useState } from "react";

import { Card, CardContent, CardHeader, DescriptionProperty2, Link } from "@/components/atoms";
import { CustomerInputForm } from "@/forms/customer";

import { EditCustomerModal } from ".";

type CustomerCardProps = {
  customer?: CustomerInputForm;
  loading?: boolean;
  allowEdit: boolean;
};

export const CustomerCard = ({ customer, loading = false, allowEdit }: CustomerCardProps) => {
  const t = useTranslations();
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);

  const handleEditCustomerModalOpen = useCallback(() => {
    setIsEditCustomerModalOpen(true);
  }, []);

  const handleEditCustomerModalClose = useCallback(() => {
    setIsEditCustomerModalOpen(false);
  }, []);

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader
          loading={loading}
          title={t("order.customer_card.customer")}
          actionComponent={
            allowEdit &&
            customer?.type === CustomerType.CASUAL && (
              <div onClick={handleEditCustomerModalOpen} className="cursor-pointer">
                <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            )
          }
        />
        <CardContent>
          <DescriptionProperty2 showEmptyContent={false} loading={loading} label={t("order.customer_card.customer")}>
            {customer?.type === "CASUAL"
              ? customer?.name
              : [customer?.code, customer?.name].filter((item) => !!item).join(" - ")}
          </DescriptionProperty2>
          <DescriptionProperty2
            size="short"
            showEmptyContent={false}
            loading={loading}
            label={t("order.customer_card.tax_code")}
          >
            {customer?.taxCode}
          </DescriptionProperty2>
          <DescriptionProperty2
            size="short"
            showEmptyContent={false}
            loading={loading}
            label={t("order.customer_card.phone")}
          >
            {customer?.phoneNumber && (
              <Link
                useDefaultStyle
                href={`tel:${customer.phoneNumber}`}
                color="secondary"
                className="!font-normal !text-gray-500 hover:underline"
              >
                {customer.phoneNumber}
              </Link>
            )}
          </DescriptionProperty2>
          <DescriptionProperty2 showEmptyContent={false} loading={loading} label={t("order.customer_card.email")}>
            {customer?.email && (
              <Link
                useDefaultStyle
                href={`mailto:${customer.email}`}
                color="secondary"
                className="!font-normal !text-gray-500 hover:underline"
              >
                {customer.email}
              </Link>
            )}
          </DescriptionProperty2>
          <DescriptionProperty2 showEmptyContent={false} loading={loading} label={t("order.customer_card.address")}>
            {customer?.businessAddress}
          </DescriptionProperty2>
          <DescriptionProperty2 showEmptyContent={false} loading={loading} label={t("order.customer_card.note")}>
            {customer?.description}
          </DescriptionProperty2>
          {(customer?.contactName || customer?.contactEmail || customer?.contactPhoneNumber) && (
            <>
              <DescriptionProperty2 loading={loading} label={t("order.customer_card.contact_info")} emptyContent="">
                <Fragment />
              </DescriptionProperty2>
              <div className="pl-4">
                <DescriptionProperty2
                  showEmptyContent={false}
                  loading={loading}
                  label={t("order.customer_card.contact_name")}
                >
                  {customer?.contactName}
                </DescriptionProperty2>
                <DescriptionProperty2
                  showEmptyContent={false}
                  loading={loading}
                  label={t("order.customer_card.contact_email")}
                >
                  {customer?.contactEmail && (
                    <Link
                      useDefaultStyle
                      href={`tel:${customer.contactEmail}`}
                      color="secondary"
                      className="!font-normal !text-gray-500 hover:underline"
                    >
                      {customer.contactEmail}
                    </Link>
                  )}
                </DescriptionProperty2>
                <DescriptionProperty2 showEmptyContent={false} loading={loading} label={t("order.customer_card.phone")}>
                  {customer?.contactPhoneNumber && (
                    <Link
                      useDefaultStyle
                      href={`tel:${customer.contactPhoneNumber}`}
                      color="secondary"
                      className="!font-normal !text-gray-500 hover:underline"
                    >
                      {customer.contactPhoneNumber}
                    </Link>
                  )}
                </DescriptionProperty2>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EditCustomerModal
        customer={{ ...customer }}
        open={isEditCustomerModalOpen}
        onClose={handleEditCustomerModalClose}
      />
    </div>
  );
};

export default CustomerCard;
