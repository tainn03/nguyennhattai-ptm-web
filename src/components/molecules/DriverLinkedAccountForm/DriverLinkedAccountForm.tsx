"use client";

import { useFormikContext } from "formik";
import { useCallback, useMemo } from "react";

import { Combobox } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { DriverInputForm } from "@/forms/driver";
import { useOrganizationMemberOptions } from "@/hooks";
import { ScreenMode } from "@/types/form";
import { OrganizationMemberInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

export type DriverLinkedAccountFormProps = {
  organizationId: number;
  linkedUserId?: number;
  mode: ScreenMode;
};

const DriverLinkedAccountForm = ({ organizationId, linkedUserId, mode }: DriverLinkedAccountFormProps) => {
  const { values, setFieldValue } = useFormikContext<DriverInputForm>();
  const { organizationMembers, isLoading } = useOrganizationMemberOptions({
    organization: { id: organizationId },
    member: { id: linkedUserId && mode === "EDIT" ? linkedUserId : undefined },
  });

  const organizationMemberOptions: ComboboxItem[] = useMemo(
    () =>
      organizationMembers.map((item: OrganizationMemberInfo) => ({
        label: item.member?.username ?? "",
        value: ensureString(item.member?.id),
        imageSrc: item.member?.detail?.avatar?.url,
      })),
    [organizationMembers]
  );

  const handleOrgMembersChange = useCallback(
    (value: string) => setFieldValue("user.id", Number(value)),
    [setFieldValue]
  );

  return (
    <div className="col-span-3">
      <Combobox
        label="Tài khoản"
        showAvatar
        placeholder={isLoading ? "Đang tải..." : "Chọn tài khoản"}
        items={organizationMemberOptions}
        value={ensureString(values.user?.id)}
        onChange={handleOrgMembersChange}
      />
    </div>
  );
};

export default DriverLinkedAccountForm;
