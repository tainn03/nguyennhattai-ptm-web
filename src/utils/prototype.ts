import { CustomerType, OrderTripStatusType, RouteType } from "@prisma/client";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import colors from "tailwindcss/colors";

import { BadgeProps } from "@/components/atoms/Badge/Badge";
import { maleNames } from "@/constants/prototype";
import { randomInt } from "@/utils/number";
import { randomString } from "@/utils/string";

// Generate owner name
export function generateOwnerName() {
  const owners = [
    "Doanh nghiệp",
    "Công ty Samuel Rogers Xiong Witherspoon",
    "Công ty Janna Trevino Xiong",
    "Công ty Harriet Wade Breanna Pugh",
    "Công ty Tana Cruz Breanna Zavala",
    "Công ty Breanna Harris Xiong",
    "Công ty Kitra Wong WcDonald",
  ];

  return owners[Math.floor(Math.random() * owners.length)];
}

// Generate random driver
export function generateRandomDriver() {
  return maleNames[Math.floor(Math.random() * maleNames.length)];
}

// Generate random license plate
export function generateRandomLicensePlate() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let plate = "";

  for (let i = 0; i < 2; i++) {
    plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  plate += letters.charAt(Math.floor(Math.random() * letters.length));
  plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
  plate += "-";

  for (let i = 0; i < 5; i++) {
    plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return plate;
}

// Hàm lấy danh sách ngày trong tháng
export const getDaysInMonth = (year: number, month: number) => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start, end });
  return days.map((day) => format(day, "yyyy-MM-dd"));
};

// Hàm lấy danh sách ngày trong tuần
export const getDaysInWeek = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  return days.map((day) => format(day, "yyyy-MM-dd"));
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    primary: colors.blue[500],
    purple: colors.purple[500],
    info: colors.cyan[500],
    warning: colors.yellow[500],
    pink: colors.pink[500],
    teal: colors.teal[500],
    success: colors.green[500],
    error: colors.red[500],
  };

  const step = tripSteps.find((step) => step.value === status);
  return step ? colorMap[step.color ?? ""] : colors.gray[500];
};

export const tripSteps: {
  id: number;
  value: OrderTripStatusType;
  color: BadgeProps["color"];
  label: string;
}[] = [
  { id: 1, value: OrderTripStatusType.NEW, color: "primary", label: "Chuyến mới" },
  { id: 2, value: OrderTripStatusType.PENDING_CONFIRMATION, color: "purple", label: "Đang chờ tài xế xác nhận" },
  { id: 3, value: OrderTripStatusType.CONFIRMED, color: "info", label: "Đã xác nhận" },
  { id: 4, value: OrderTripStatusType.WAITING_FOR_PICKUP, color: "warning", label: "Đang đến nơi nhận hàng" },
  { id: 5, value: OrderTripStatusType.WAITING_FOR_DELIVERY, color: "pink", label: "Đang đến nơi giao hàng" },
  { id: 6, value: OrderTripStatusType.DELIVERED, color: "teal", label: "Đã giao hàng" },
  { id: 7, value: OrderTripStatusType.COMPLETED, color: "success", label: "Đã hoàn thành" },
  { id: 8, value: OrderTripStatusType.CANCELED, color: "error", label: "Đã hủy" },
];

export const tripSteps2: {
  id: number;
  value?: OrderTripStatusType;
  color: BadgeProps["color"];
  label: string;
}[] = [
  { id: 1, value: OrderTripStatusType.NEW, color: "primary", label: "Chuyến mới" },
  { id: 2, value: OrderTripStatusType.PENDING_CONFIRMATION, color: "purple", label: "Đang chờ tài xế xác nhận" },
  { id: 3, value: OrderTripStatusType.CONFIRMED, color: "info", label: "Đã xác nhận" },
  { id: 4, value: OrderTripStatusType.WAITING_FOR_PICKUP, color: "warning", label: "Đang đến nơi nhận hàng" },
  { id: 5, value: OrderTripStatusType.WAITING_FOR_PICKUP, color: "pink", label: "Lên hàng xong" },
  { id: 6, value: OrderTripStatusType.WAITING_FOR_DELIVERY, color: "pink", label: "Đang đến nơi giao hàng" },
  { id: 8, value: OrderTripStatusType.DELIVERED, color: "teal", label: "Đã giao hàng" },
  { id: 9, value: OrderTripStatusType.COMPLETED, color: "success", label: "Đã hoàn thành" },
  { id: 10, value: OrderTripStatusType.CANCELED, color: "error", label: "Đã hủy" },
];

// Hàm sinh ngẫu nhiên một trạng thái từ tripSteps
const getRandomStatus = () => {
  const randomIndex = Math.floor(Math.random() * tripSteps.length);
  return tripSteps[randomIndex];
};

// Hàm sinh ngẫu nhiên một chuyến đi
const generateRandomTrip = (resourceId: number, date: string) => {
  const status = getRandomStatus();
  return {
    id: Math.floor(Math.random() * 100000), // ID ngẫu nhiên
    resourceId,
    date,
    orderTrip: {
      code: `TRIP${Math.floor(Math.random() * 10000)}`, // Mã chuyến ngẫu nhiên
      lastStatusType: status.value,
      statuses: tripSteps.map((step) => ({
        type: step.value,
        createdAt: date,
      })),
      weight: randomInt(1, 50), // Trọng lượng ngẫu nhiên
      pickupDate: date,
      deliveryDate: date,
      order: {
        id: Math.floor(Math.random() * 100000), // ID ngẫu nhiên
        code: `ORDER${Math.floor(Math.random() * 10000)}`, // Mã đơn hàng ngẫu nhiên
        customer: {
          id: Math.floor(Math.random() * 100000), // ID ngẫu nhiên
          type: Math.random() > 0.5 ? CustomerType.CASUAL : CustomerType.FIXED, // Loại khách hàng ngẫu nhiên
          code: `CUS${randomInt(10, 99)}`, // Mã khách hàng ngẫu nhiên
          name: `Khách hàng ${randomInt(10, 99)}`, // Tên khách hàng ngẫu nhiên
        },
        route: {
          id: Math.floor(Math.random() * 100000), // ID ngẫu nhiên
          type: RouteType.FIXED,
          code: `${randomString(1)}${randomInt(10, 99)}-${randomString(1)}${randomInt(10, 99)}`.toUpperCase(), // Mã tuyến ngẫu nhiên
          name: `Tuyến ${randomString(1)}${randomInt(10, 99)}-${randomString(1)}${randomInt(10, 99)}`, // Tên tuyến ngẫu nhiên
        },
        weight: randomInt(50, 100), // Trọng lượng ngẫu nhiên
        unit: {
          id: Math.floor(Math.random() * 100000), // ID ngẫu nhiên
          code: ["KG", "Tấn", "PL", "Cont40"][Math.floor(Math.random() * 4)],
        },
      },
    },
  };
};

// Hàm chính để sinh ra các chuyến đi
export const generateTrips = (resources: { id: number }[], startDate: string, endDate: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  resources.forEach((resource) => {
    const numberOfTrips = randomInt(30, 90);
    for (let i = 0; i < numberOfTrips; i++) {
      const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
        .toISOString()
        .split("T")[0];
      trips.push(generateRandomTrip(resource.id, randomDate));
    }
  });

  return trips;
};

export const generateRandomNote = (): string => {
  const note = [
    "Giao hàng nhanh",
    "Cẩn thận hàng dễ vỡ",
    "Yêu cầu kiểm tra hàng trước khi nhận",
    "Yêu cầu đóng gói kỹ",
    "Giao hàng vào buổi sáng",
    "Giao hàng vào buổi chiều",
    "Giao hàng vào buổi tối",
    "Liên hệ trước khi giao hàng",
    "Không giao hàng vào cuối tuần",
    "Giao hàng vào ngày lễ",
    "Yêu cầu người nhận ký tên",
    "Giao hàng tại địa chỉ phụ",
    "Đảm bảo nhiệt độ bảo quản",
    "Không để hàng dưới ánh nắng trực tiếp",
    "Yêu cầu xe có điều hòa",
    "Giao hàng vào ngày làm việc",
    "Không giao hàng vào giờ cao điểm",
    "Yêu cầu người nhận kiểm tra hàng hóa",
    "Giao hàng tại cổng chính",
    "Không giao hàng vào buổi trưa",
  ];

  return Array.from({ length: randomInt(3, 6) }, () => note[randomInt(0, note.length - 1)]).join(", ");
};
