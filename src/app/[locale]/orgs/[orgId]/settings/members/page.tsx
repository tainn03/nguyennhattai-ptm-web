"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { OrganizationRoleType } from "@prisma/client";
import isObject from "lodash/isObject";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiQuestionMark } from "react-icons/ri";
import { TfiAndroid, TfiApple } from "react-icons/tfi";

import {
  Badge,
  DateTimeLabel,
  InfoBox,
  Link,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import {
  Authorization,
  Button,
  EmptyListSection,
  MasterActionTable,
  PageHeader,
  ProfileInfo,
  QuickSearch,
  TableFilterMenu,
} from "@/components/molecules";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useIdParam, useOrganizationMembers, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useOrganizationMembersState } from "@/redux/states";
import {
  ORGANIZATION_MEMBER_UPDATE_SEARCH_CONDITIONS,
  ORGANIZATION_MEMBER_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { getDriversByIds } from "@/services/client/driver";
import { deleteOrganizationMember } from "@/services/client/organizationMember";
import { AnyObject } from "@/types";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { LocaleType } from "@/types/locale";
import { DriverInfo, OrganizationMemberInfo, OrganizationRoleInfo } from "@/types/strapi";
import { getFullName, isOrganizationOwner } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { getDistinctDriverIds } from "@/utils/driver";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ org, orgId, orgLink, user, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { searchConditions } = useOrganizationMembersState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [drivers, setDrivers] = useState<DriverInfo[]>();
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("organization-member");

    const updateRouteRef = useRef(false);
    const selectedOrganizationMemberRef = useRef<OrganizationMemberInfo>();

    const { organizationMembers, isLoading, pagination, mutate } = useOrganizationMembers({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    const memberIds = useMemo(() => getDistinctDriverIds(organizationMembers), [organizationMembers]);
    const fetchDrivers = useCallback(async () => {
      const result = await getDriversByIds(orgId, memberIds);
      setDrivers(result);
    }, [orgId, memberIds]);

    useEffect(() => {
      if ((memberIds || []).length > 0) {
        fetchDrivers();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memberIds]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_member.title"), link: `${orgLink}/settings/members` },
      ]);

      // Get flashing id from storage
      const id = getItemString(SESSION_FLASHING_ID, {
        security: false,
        remove: true,
      });
      id && setFlashingId(Number(id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Updating search params.
     */
    useEffect(() => {
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: ORGANIZATION_MEMBER_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: ORGANIZATION_MEMBER_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions, updateRouteRef.current]);

    const getRoleInfo = useCallback(
      (memberId?: number, role?: Partial<OrganizationRoleInfo>) => {
        if (role?.type === OrganizationRoleType.DRIVER) {
          const driver = drivers?.find((item) => equalId(item.user?.id, memberId));
          return (
            <InfoBox
              label={role?.name}
              subLabel={getFullName(driver?.firstName, driver?.lastName)}
              emptyLabel={t("common.empty")}
            />
          );
        } else {
          return role?.name;
        }
      },
      [drivers, t]
    );

    /**
     * Callback function for opening a dialog with maintenance type data.
     *
     * @param item - The maintenance type data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: OrganizationMemberInfo) => () => {
        selectedOrganizationMemberRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (selectedOrganizationMemberRef.current?.id && userId) {
        const isSuccess = await deleteOrganizationMember(selectedOrganizationMemberRef.current?.id, userId);

        if (!isSuccess) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: `${selectedOrganizationMemberRef.current?.member?.detail?.firstName} ${selectedOrganizationMemberRef.current?.member?.detail?.lastName}`,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: `${selectedOrganizationMemberRef.current?.member?.detail?.firstName} ${selectedOrganizationMemberRef.current?.member?.detail?.lastName}`,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [handleDeleteCancel, mutate, showNotification, t, userId]);

    /**
     * Callback function for handling page changes.
     *
     * @param page - The new page number to be set in the pagination state.
     */
    const handlePageChange = useCallback(
      (page: number) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page,
          },
        }));
      },
      [setFilterOptions]
    );

    /**
     * Callback function for handling changes in the page size.
     *
     * @param pageSize - The new page size to be set in the pagination state.
     */
    const handlePageSizeChange = useCallback(
      (pageSize: number) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page: 1,
            pageSize,
          },
        }));
      },
      [setFilterOptions]
    );

    /**
     * Callback function for applying filters to a specific column and updating filter options.
     *
     * @param columnName - The name or identifier of the column to which the filters should be applied.
     * @param filters - An array of filter properties to apply to the column.
     * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
     */
    const handleFilterApply = useCallback(
      (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => {
          const { pagination, ...values } = prevValue;
          const newValue: FilterOptions = {
            pagination: {
              ...pagination,
              page: 1,
            },
          };
          Object.keys(values).forEach((key) => {
            let value = values[key];
            if (sortType) {
              value.sortType = undefined;
            }
            if (columnName === key) {
              value = {
                ...value,
                filters,
                sortType,
              };
            }
            newValue[key] = value;
          });
          return newValue;
        });
      },
      [setFilterOptions]
    );

    /**
     * Callback function for handling changes in filter options.
     *
     * @param options - The new filter options to set.
     */
    const handleFilterChange = useCallback(
      (options: FilterOptions) => {
        updateRouteRef.current = true;
        setFilterOptions(options);
      },
      [setFilterOptions]
    );

    /**
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, [setFlashingId]);

    /**
     * Generates a user description based on the provided username and email.
     * If both username and email are available, it combines them; otherwise, it uses the available one.
     *
     * @param {string | null | undefined} username - The username of the user.
     * @param {string | null | undefined} email - The email address of the user.
     * @returns {string} - The generated user description.
     */
    const getUserDescription = useCallback((username?: string | null, email?: string | null) => {
      return username === email ? username : username + (email ? ` / ${email}` : "");
    }, []);

    /**
     * Renders the note for the organization member.
     * @param {OrganizationMemberInfo} organizationMember - The organization member data to render the note for.
     */
    const renderNote = useCallback(
      (organizationMember: OrganizationMemberInfo) => {
        const emptyLabel = "-";
        if (organizationMember.role?.type !== OrganizationRoleType.DRIVER) {
          return emptyLabel;
        }

        const lastDevice = ((organizationMember?.member?.setting?.messageTokens as []) || [])
          .filter((item) => isObject(item))
          .pop() as AnyObject | undefined;

        const deviceInfo = [lastDevice?.model, lastDevice?.osVersion].filter(Boolean).join(", ");

        return lastDevice ? (
          <div className="flex flex-row items-center text-left">
            <div className="flex-shrink-0">
              {lastDevice?.platform === "ios" && <TfiApple className="h-6 w-6 text-gray-500" />}
              {lastDevice?.platform === "android" && <TfiAndroid className="h-6 w-6 text-gray-500" />}
              {lastDevice?.platform !== "ios" && lastDevice?.platform !== "android" && (
                <RiQuestionMark className="h-6 w-6 text-gray-500" />
              )}
            </div>
            <div className="ml-3">
              <p className="flex flex-row gap-x-2 whitespace-nowrap text-xs font-medium text-gray-700 group-hover:text-gray-900">
                {lastDevice.appVersion &&
                  t("org_setting_member.app_version_info", {
                    version: lastDevice.appVersion,
                  })}
              </p>
              <div className="text-xs font-medium text-gray-500 group-hover:text-gray-700">{deviceInfo}</div>
            </div>
          </div>
        ) : (
          emptyLabel
        );
      },
      [t]
    );

    return (
      <>
        <PageHeader
          title={t("org_setting_member.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="organization-member" action="new">
              <Button as={Link} href={`${orgLink}/settings/members/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <TableContainer
          fullHeight
          horizontalScroll
          verticalScroll
          allowFullscreen
          stickyHeader
          autoHeight
          footer={
            (pagination?.pageCount ?? 0) > 0 && (
              <Pagination
                className="mt-4"
                showPageSizeOptions
                page={pagination?.page}
                total={pagination?.total}
                pageSize={pagination?.pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("org_setting_member.full_name")}
                    {...filterOptions.fullName}
                    onApply={handleFilterApply("fullName")}
                  />
                </TableCell>
                <TableCell className="w-48">{t("org_setting_member.phone_number")}</TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("org_setting_member.role")}
                    align="left"
                    {...filterOptions.role}
                    onApply={handleFilterApply("role")}
                  />
                </TableCell>
                <TableCell className="w-48">{t("org_setting_member.version_and_device")}</TableCell>
                <TableCell className="w-32">
                  <TableFilterMenu
                    label={t("org_setting_member.status")}
                    align="center"
                    {...filterOptions.isActive}
                    onApply={handleFilterApply("isActive")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("common.updated_info")}
                    actionPlacement="left"
                    {...filterOptions.updatedAt}
                    onApply={handleFilterApply("updatedAt")}
                  />
                </TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && organizationMembers.length === 0 && (
                <SkeletonTableRow rows={10} columns={7} profileColumnIndexes={[5]} />
              )}

              {/* Empty data */}
              {!isLoading && organizationMembers.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={7} className="px-6 lg:px-8">
                    <EmptyListSection actionLink={`${orgLink}/settings/members/new`} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {organizationMembers.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="organization-member"
                      action="detail"
                      fallbackComponent={
                        <ProfileInfo
                          as="p"
                          user={item.member}
                          slot={equalId(item.member.id, userId) && <Badge label={t("org_setting_member.you")} />}
                          description={
                            isOrganizationOwner(org, item.member)
                              ? getUserDescription(item.username, item.email) ||
                                getUserDescription(item.member.username, item.member.email)
                              : getUserDescription(item.username, item.email)
                          }
                        />
                      }
                    >
                      <ProfileInfo
                        user={item.member}
                        slot={equalId(item.member.id, userId) && <Badge label={t("org_setting_member.you")} />}
                        href={`${orgLink}/settings/members/${encryptId(item.id)}`}
                        description={
                          isOrganizationOwner(org, item.member)
                            ? getUserDescription(item.username, item.email) ||
                              getUserDescription(item.member.username, item.member.email)
                            : getUserDescription(item.username, item.email)
                        }
                      />
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    {isOrganizationOwner(org, item.member)
                      ? item.phoneNumber || item.member.phoneNumber || t("common.empty")
                      : item.phoneNumber || t("common.empty")}
                  </TableCell>
                  <TableCell>
                    {isOrganizationOwner(org, item.member)
                      ? t("org_setting_member.owner")
                      : getRoleInfo(item.member?.id, item.role)}
                  </TableCell>
                  <TableCell>{renderNote(item)}</TableCell>
                  <TableCell align="center">
                    <Badge
                      label={
                        item.isActive ? t("org_setting_member.status_active") : t("org_setting_member.status_inactive")
                      }
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>
                    <ProfileInfo
                      user={item.updatedByUser}
                      description={<DateTimeLabel value={item.updatedAt} type="datetime" />}
                    />
                  </TableCell>
                  <TableCell action>
                    <Authorization
                      alwaysAuthorized={
                        canEdit() ||
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        ((canDelete() || (canDeleteOwn() && equalId(item.createdByUser?.id, userId))) &&
                          !equalId(item.member.id, userId) &&
                          !isOrganizationOwner(org, item.member))
                      }
                    >
                      <MasterActionTable
                        onDelete={
                          !equalId(item.member.id, userId) &&
                          !isOrganizationOwner(org, item.member) &&
                          (canDelete() || (canDeleteOwn() && equalId(item.createdByUser?.id, userId)))
                            ? handleDelete(item)
                            : undefined
                        }
                        actionPlacement={
                          organizationMembers.length >= 3 &&
                          (organizationMembers.length - 1 === index || organizationMembers.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/settings/members/${encryptId(item.id)}/edit`
                            : ""
                        }
                      />
                    </Authorization>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", {
            name: getFullName(
              selectedOrganizationMemberRef.current?.member?.detail?.firstName,
              selectedOrganizationMemberRef.current?.member?.detail?.lastName,
              user.setting.locale as LocaleType
            ),
          })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "organization-member",
    action: "find",
  }
);
