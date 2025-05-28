import { generateRandomDriver } from "@/utils/prototype";

export const maleNames = [
  "Nguyễn Văn An",
  "Trần Đức Bình",
  "Lê Minh Cường",
  "Phạm Hồng Đăng",
  "Hoàng Văn Dũng",
  "Vũ Mạnh Hùng",
  "Đặng Quang Khải",
  "Bùi Tiến Lộc",
  "Ngô Thanh Nam",
  "Đỗ Trung Thành",
];

export const events = [
  {
    id: 1,
    title: "Chuyến hàng 1",
    description: "Mô tả chuyến hàng 1",
    date: "2025-01-01",
    resourceId: 1,
  },
  {
    id: 2,
    title: "Chuyến hàng 2",
    description: "Mô tả chuyến hàng 2",
    date: "2025-01-01",
    resourceId: 1,
  },
  {
    id: 3,
    title: "Chuyến hàng 3",
    description: "Mô tả chuyến hàng 3",
    date: "2025-01-01",
    resourceId: 1,
  },
  {
    id: 4,
    title: "Chuyến hàng 4",
    description: "Mô tả chuyến hàng 4",
    date: "2025-01-01",
    resourceId: 1,
  },
  {
    id: 5,
    title: "Chuyến hàng 5",
    description: "Mô tả chuyến hàng 5",
    date: "2025-01-02",
    resourceId: 2,
  },
  {
    id: 6,
    title: "Chuyến hàng 6",
    description: "Mô tả chuyến hàng 6",
    date: "2025-01-02",
    resourceId: 2,
  },
];

export const driverReportTemps = [
  {
    id: 1,
    name: "Chuyến mới",
    description: "Chuyến mới được tạo từ quản lý, quản lý điều xe hoặc khách hàng.",
    displayOrder: 1,
    isSystem: true,
  },
  {
    id: 2,
    name: "Đang chờ tài xế xác nhận",
    description: "Đã gửi thông báo chuyến hàng cho tài xế và đang chờ tài xế xác nhận.",
    displayOrder: 2,
    isSystem: true,
  },
  {
    id: 3,
    name: "Tài xế đã xác nhận",
    description: "Tài xế đã nhận được thông tin về chuyến hàng",
    displayOrder: 3,
    isSystem: true,
  },
  {
    id: 4,
    name: "Đang đến nơi nhận hàng",
    description: "Tài xế đã bắt đầu xử lý đơn hàng và đang di chuyển đến nơi nhận hàng.",
    displayOrder: 4,
    isSystem: true,
  },
  {
    id: 5,
    name: "Lên hàng xong",
    description: "Tài xế đã lên hàng xong và sẵn sàng giao hàng.",
    displayOrder: 5,
    isSystem: false,
  },
  {
    id: 6,
    name: "Đang đến nơi giao hàng",
    description: "Đã nhận hàng và đang bắt đầu di chuyển đến nơi giao hàng.",
    displayOrder: 6,
    isSystem: true,
  },
  {
    id: 7,
    name: "Đã giao hàng",
    description: "Đã giao hàng thành công, chụp hình hóa đơn chứng từ nhận hàng để hoàn thành chuyến hàng.",
    displayOrder: 8,
    isSystem: true,
  },
  {
    id: 8,
    name: "Đã hoàn thành",
    description: "Chuyến hàng đã hoàn thành, đã bổ sung đầy đủ thông tin chứng từ.",
    displayOrder: 8,
    isSystem: true,
  },
  {
    id: 9,
    name: "Đã hủy",
    description: "Chuyến hàng đã bị hủy.",
    displayOrder: 9,
    isSystem: true,
  },
];

export const driverReportDetailTemps = [
  {
    name: "Kiểm tra địa chỉ và thông tin liên hệ",
    description:
      "Đảm bảo rằng tài xế đang ở đúng địa điểm nhận hàng và có thông tin liên hệ của người gửi hàng trong trường hợp cần liên lạc.",
    displayOrder: 1,
  },
  {
    name: "Kiểm tra trạng thái hàng hóa",
    description:
      "Kiểm tra danh sách hàng hóa cần nhận và so sánh với đơn đặt hàng. Đảm bảo rằng tất cả các mặt hàng được nhận đúng loại và số lượng.\nKiểm tra tình trạng của hàng hóa, xem xét xem có bất kỳ dấu vết hỏng hóc hoặc hỏng hóc nào không. Nếu có bất kỳ vấn đề nào, cần lưu ý và ghi chú lại.",
    displayOrder: 2,
  },
  {
    name: "Ký nhận hàng",
    description:
      "Sau khi nhận hàng, tài xế cần ký nhận hoặc ghi chú trạng thái hàng hóa trong văn bản liên quan để ghi lại bằng chứng về tình trạng ban đầu của hàng hóa.",
    displayOrder: 3,
  },
];

export const forwarders = ["Vantage Logistics Corporation"];

export const statuses = [
  { status: "Đang chờ xác nhận", statusColor: "primary" },
  { status: "Đã xác nhận", statusColor: "success" },
  { status: "Từ chối", statusColor: "error" },
];

export const addresses = [
  "123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM",
  "456 Đường Trần Hưng Đạo, Quận 1, TP.HCM",
  "101 Đường Lý Thường Kiệt, Quận 10, TP.HCM",
  "789 Đường Lê Duẩn, Quận Hoàn Kiếm, Hà Nội",
  "234 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM",
  "567 Đường Hùng Vương, Quận 5, TP.HCM",
  "111 Đường Lê Duẩn, Quận Hoàn Kiếm, Hà Nội",
  "101 Đường Trần Phú, Quận Hải Châu, Đà Nẵng",
];

export const orderRequest = {
  code: "REQ-2025001",
  status: "Chờ xác nhận",
  shipmentDetails: "60 Chuyến",
  description:
    "Yêu cầu đơn đặt hàng cần được xử lý trước ngày 10/02/2025. Voluptatem aspernatur velit voluptatum facere aut fugiat",
  pickupPoints: [
    {
      id: "F28AB2CD",
      contactName: generateRandomDriver(),
      phone: "+1 (616) 807-5856",
      email: "nguyenvana@gmail.com",
      note: "Cần vận chuyển ban đêm",
      address: "123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM",
    },
    {
      id: "369D4195",
      contactName: generateRandomDriver(),
      phone: "+1 (639) 719-8154",
      email: "nguyenvanb@gmail.com",
      note: "Cần vận chuyển ban đêm",
      address: "456 Đường Trần Hưng Đạo, Quận 1, TP.HCM",
    },
    {
      id: "EF4D9290",
      contactName: generateRandomDriver(),
      phone: "+1 (472) 351-9109",
      email: "nguyenvanbc@gmail.com",
      note: "Cần vận chuyển ban đêm",
      address: "101 Đường Lý Thường Kiệt, Quận 10, TP.HCM",
    },
  ],
  deliveryPoints: [
    {
      id: "4BA79A1B",
      contactName: generateRandomDriver(),
      phone: "+1 (946) 815-5823",
      email: "qyqovag@mailinator.com",
      note: "Cần vận chuyển ban đêm",
      address: "789 Đường Lê Duẩn, Quận Hoàn Kiếm, Hà Nội",
    },
    {
      id: "10AE4EBC",
      contactName: generateRandomDriver(),
      phone: "+1 (613) 876-1117",
      email: "qydy@mailinator.com",
      note: "Cần vận chuyển ban đêm",
      address: "101 Đường Trần Phú, Quận Hải Châu, Đà Nẵng",
    },
  ],
  createdAt: "2025-02-01 10:00",
  updatedAt: "2025-02-02 09:30",
  customer: {
    name: "Công ty Thương Mại Vận Tải XYZ",
    code: "CTY-XYZ",
    phone: "0123 456 789",
    email: "contact@xyzlogistics.com",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    note: "Khách hàng cần vận chuyển hàng hóa cẩn thận",
  },
  items: [
    {
      id: 1,
      name: "Hàng hóa A",
      code: "A7F53E5C5841",
      quantity: 60,
      unit: "Chuyến",
      weight: 60,
      type: "Hàng siêu trường, siêu trọng",
      packaging: "1200 x 800 x 1000 cm",
      notes: "Cần đóng gói cẩn thận",
    },
    {
      id: 2,
      name: "Hàng hóa B",
      code: "25BB42BECE6D",
      quantity: 50,
      unit: "Pallets",
      weight: 100,
      type: "Hàng dễ vỡ",
      packaging: "100 x 80 x 50 cm",
      notes: "Hàng dễ vỡ",
    },
    {
      id: 3,
      name: "Hàng hóa C",
      code: "DEBF57D20C31",
      quantity: 200,
      unit: "Pallets",
      weight: 100,
      type: "Hàng dễ cháy",
      packaging: "50 x 50 x 50 cm",
      notes: "Hàng dễ cháy",
    },
  ],
  costInfo: {
    subTotal: 2000000,
    tax: 200000,
    shippingFee: 150000,
    total: 2350000,
  },
};

export const customerComboboxItems = [
  { label: "Vietnam Airlines Cargo", value: "Vietnam Airlines Cargo" },
  { label: "Vinatrans", value: "Vinatrans" },
  { label: "Gemadept Logistics", value: "Gemadept Logistics" },
  { label: "DHL Vietnam", value: "DHL Vietnam" },
  { label: "FedEx Vietnam", value: "FedEx Vietnam" },
  { label: "UPS Vietnam", value: "UPS Vietnam" },
  { label: "TNT Express Vietnam", value: "TNT Express Vietnam" },
  { label: "Kuehne + Nagel Vietnam", value: "Kuehne + Nagel Vietnam" },
  { label: "Sotrans", value: "Sotrans" },
  { label: "Maersk Vietnam", value: "Maersk Vietnam" },
];

export const orderRequestStatuses = [
  { label: "Đang chờ xác nhận", value: "Đang chờ xác nhận" },
  { label: "Đã xác nhận", value: "Đã xác nhận" },
  { label: "Từ chối", value: "Từ chối" },
];

export const workflowComboboxItems = [
  { label: "Quy trình xuất khẩu hàng hoá", value: "2" },
  { label: "Quy trình nhập khẩu hàng hoá", value: "3" },
  { label: "Quy trình vận chuyển hàng hoá nội địa", value: "4" },
  { label: "Quy trình vận chuyển hàng hoá tại cảng Cát Lái", value: "5" },
  {
    label: "Quy trình vận chuyển hàng hoá tại cảng Hải Phòng",
    value: "6",
  },
];
