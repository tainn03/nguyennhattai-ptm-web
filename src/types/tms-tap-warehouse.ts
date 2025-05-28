/**
 * Type definition for an order request from external systems
 * Contains all the necessary information about an order including:
 */
export type WarehouseOrderRequest = {
  customerCode: string | null; // Unique identifier for the customer
  customerName: string | null; // Name of the customer
  customerPhone: string | null; // Customer's phone number
  customerEmail: string | null; // Customer's email address
  //// routeCode: string | null; // Unique identifier for the delivery route
  //// routeName: string | null; // Name/description of the delivery route
  code: string | null; // Unique order code/reference number
  orderDate: Date | null; // Date when order was placed
  deliveryDate: Date | null; // Expected delivery date
  //// expiryDate: Date | null; // Expiration date for the order/goods
  unitOfMeasure: string | null; // Unit used for measuring the goods
  weight: number | null; // Weight of goods in specified unit
  //// totalAmount: number | null; // Total monetary value of the order
  //// notes: string | null; // Additional notes/comments about the order
  //// merchandiseTypes: string | null; // Types of goods in the order
  //// merchandiseNote: string | null; // Additional notes about the merchandise
  cbm: number | null; // Cubic meter measurement of goods
  //// lastStatusType: "INBOUND" | null; // Most recent status of the order
  //// slot: string | null; // Assigned warehouse slot/location
  //// tripCode: string | null; // Unique identifier for delivery trip
  driverName: string | null; // Name of assigned driver
  driverPhone: string | null; // Driver's contact number
  driverEmail: string | null; // Driver's email address
  vehicleNumber: string | null; // Vehicle registration/plate number
  vehicleType: string | null; // Type/model of delivery vehicle
  inventories: Inventory[] | null; // Array of inventories
};

/**
 * Type definition for requests from other services in distributed system
 * Used to receive order data from other microservices calling into this API
 */
export type WarehouseOrdersRequest = {
  clientTimeZone: string; // Client's timezone for date conversion
  createdAt: string | Date; // Creation timestamp
  orders: WarehouseOrderRequest[]; // Array of order requests
};

/**
 * Type definition for a consignment/package within an inventory
 * Contains details about individual items being shipped including:
 */
export type Consignment = {
  name: string | null; // Name/description of the consignment
  merchandiseType: string | null; // Type/category of merchandise
  weight: number | null; // Weight of the consignment
  length: number | null; // Length dimension
  width: number | null; // Width dimension
  height: number | null; // Height dimension
  quantity: number | null; // Number of items
  notes: string | null; // Additional notes about the consignment
  unit: string | null; // Unit of measurement
};

/**
 * Type definition for inventory record
 * Represents a collection of consignments with:
 */
export type Inventory = {
  code: string | null; // Unique inventory identifier
  weight: number | null; // Total weight of inventory
  unitOfMeasure: string | null; // Unit used for measurements
  cbm: number | null; // Cubic meter volume
  pickupPoint: string | null; // Location for pickup
  deliveryPoint: string | null; // Destination for delivery
  pickupTimeNotes: string | null; // Notes about pickup timing
  deliveryTimeNotes: string | null; // Notes about delivery timing
  customerCode: string | null; // Customer identifier
  customerName: string | null; // Name of customer
  customerPhone: string | null; // Customer's phone number
  customerEmail: string | null; // Customer's email address
  orderDate: Date | null; // Date order was placed
  deliveryDate: Date | null; // Expected delivery date
  consignments: Consignment[]; // Array of consignments in this inventory
};

/**
 * Type definition for a request to update the status of orders
 * Contains the order IDs and the new status to set
 */
export type OutboundOrderRequest = {
  orders: { id: number; code: string }[];
  exportDate: string | Date; // Export date
  status: "OUTBOUND"; // New status to set for the orders
  notes: string | null; // Additional notes/comments about the order
  tripCode: string | null; // Unique identifier for delivery trip
  driverName: string | null; // Name of assigned driver
  driverPhone: string | null; // Driver's contact number
  driverEmail: string | null; // Driver's email address
  vehicleNumber: string | null; // Vehicle registration/plate number
  vehicleType: string | null; // Type/model of delivery vehicle
  clientTimeZone: string; // Client's timezone for date conversion
  createdAt: string | Date; // Creation timestamp
  sendNotification: boolean; // Whether to send notification
};

/**
 * Type definition for a request to notify TMS web about in-stock or in-progress orders
 * Contains the order codes and the current date
 */
export type WarehouseNotifyRequest = {
  organizationId: number;
  clientTimeZone: string; // Client's timezone for date conversion
  currentDate: string | Date; // Current date
  orders: Pick<WarehouseOrderRequest, "code">[]; // Array of order codes
  status: "IN_STOCK" | "IN_PROGRESS";
};
