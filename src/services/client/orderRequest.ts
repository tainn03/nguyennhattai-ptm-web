import addDays from "date-fns/addDays";
import format from "date-fns/format";

import { addresses, forwarders, orderRequest, statuses } from "@/constants/prototype";
import { AnyObject } from "@/types";
import { randomInt } from "@/utils/number";
import { generateRandomNote } from "@/utils/prototype";

export const generateRandomRequest = (): AnyObject => {
  const forwarder = forwarders[randomInt(0, forwarders.length - 1)];
  const { status, statusColor } = statuses[randomInt(0, statuses.length - 1)];
  const pickupPoints = Array.from({ length: randomInt(1, 1) }, () => ({
    address: addresses[randomInt(0, addresses.length - 1)],
  }));
  const deliveryPoints = Array.from({ length: randomInt(1, 1) }, () => ({
    address: addresses[randomInt(0, addresses.length - 1)],
  }));

  return {
    id: randomInt(1, 100),
    forwarder,
    shipmentDetails: `${randomInt(10, 60)} Chuyến`,
    status,
    statusColor,
    pickupDate: format(addDays(new Date(), randomInt(1, 3)), "dd/MM/yyyy HH:mm"),
    deliveryDate: format(addDays(new Date(), randomInt(3, 7)), "dd/MM/yyyy HH:mm"),
    note: generateRandomNote(),
    pickupPoints,
    deliveryPoints,
  };
};

export const randomRequestsFetcher = (): AnyObject[] => {
  return Array.from({ length: 10 }, () => generateRandomRequest());
};

export const randomRequestFetcher = async (): Promise<AnyObject> => {
  return orderRequest;
};
