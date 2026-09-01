// Delivery partner abstraction. The order system only ever talks to this
// interface — when the real courier is finalized, add an adapter and set
// DELIVERY_PROVIDER + credentials in env. No order logic changes needed.

export type ShipmentRequest = {
  orderId: string;
  orderNumber: string;
  codAmount?: number; // paise, 0/undefined for prepaid
  weightGrams?: number;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: { name: string; sku: string; quantity: number; price: number }[];
};

export type ShipmentResult = {
  awb: string;
  labelUrl?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
};

export type TrackingEvent = {
  status: string;
  location?: string;
  note?: string;
  timestamp: Date;
};

export type Serviceability = {
  serviceable: boolean;
  codAvailable?: boolean;
  estimatedDays?: number;
  fee?: number; // paise
};

export interface DeliveryProvider {
  readonly name: string;
  checkServiceability(pincode: string): Promise<Serviceability>;
  createShipment(req: ShipmentRequest): Promise<ShipmentResult>;
  cancelShipment(awb: string): Promise<void>;
  getTracking(awb: string): Promise<TrackingEvent[]>;
  /** Verify + parse a courier webhook into normalized tracking events. */
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<{
    awb: string;
    events: TrackingEvent[];
  } | null>;
}
