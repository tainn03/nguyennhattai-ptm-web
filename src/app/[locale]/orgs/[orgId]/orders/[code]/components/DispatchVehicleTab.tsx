"use client";

import { OrderParticipantRole } from "@prisma/client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";

import { Alert } from "@/components/molecules";
import { OrderTab } from "@/constants/order";
import { useAuth, useOrderDispatchVehicleInfo, usePermission } from "@/hooks";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION, ORDER_UPDATE_ORDER_DETAIL } from "@/redux/types";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { ensureString } from "@/utils/string";

import { GeneralDispatchVehicleInfo, OrderTripTable } from ".";

type DispatchVehicleTabProps = {
  selectedTab: string;
  code?: string;
  isRerender?: boolean;
};

const DispatchVehicleTab = ({ selectedTab, code, isRerender }: DispatchVehicleTabProps) => {
  const t = useTranslations();
  const { code: codeInParam } = useParams();
  const { orgId, orgLink, userId } = useAuth();
  const router = useRouter();
  const dispatch = useDispatch();
  const { canFind } = usePermission("order-trip");
  const { haveNewNotification } = useNotificationState();

  const { order, isLoading, mutate } = useOrderDispatchVehicleInfo({
    organizationId: orgId,
    code: selectedTab === OrderTab.DISPATCH_VEHICLE ? (code ? code : ensureString(codeInParam)) : "",
  });

  useEffect(() => {
    if (order && selectedTab === OrderTab.DISPATCH_VEHICLE) {
      dispatch({
        type: ORDER_UPDATE_ORDER_DETAIL,
        payload: {
          ...order,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, selectedTab]);

  useEffect(() => {
    mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRerender]);

  useEffect(() => {
    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  const { remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo({ ...order }), [order]);

  const participant = useMemo(
    () => order?.participants?.find((item) => equalId(item.user?.id, userId)),
    [order, userId]
  );

  const isEditor = useMemo(
    () =>
      Boolean(
        participant &&
          (participant.role === OrderParticipantRole.EDITOR || participant.role === OrderParticipantRole.OWNER)
      ),
    [participant]
  );

  const isView = useMemo(() => {
    return Boolean(participant && participant.role === OrderParticipantRole.VIEWER);
  }, [participant]);

  useEffect(() => {
    if (!isLoading && !isView && !isEditor && !canFind() && selectedTab === OrderTab.DISPATCH_VEHICLE) {
      router.push(`${orgLink}/orders`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFind, isEditor, isLoading, isView, selectedTab]);

  return (
    <>
      <GeneralDispatchVehicleInfo loading={isLoading} />
      {remainingWeight < 0 && (
        <div className="my-4">
          <Alert color="warning" title={t("order.order_detail.warning_exceed_payload")} />
        </div>
      )}
      <OrderTripTable loading={isLoading} isEditor={isEditor} />
    </>
  );
};

export default DispatchVehicleTab;
