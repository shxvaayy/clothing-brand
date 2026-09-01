import type { DeliveryProvider, Serviceability, ShipmentRequest, ShipmentResult, TrackingEvent } from "./types";

/**
 * Development-only provider. Serviceable for all valid Indian pincodes,
 * generates fake AWBs. Never used in production (factory enforces this).
 */
export class MockDeliveryProvider implements DeliveryProvider {
  readonly name = "mock";

  async checkServiceability(pincode: string): Promise<Serviceability> {
    if (!/^[1-9][0-9]{5}$/.test(pincode)) return { serviceable: false };
    return { serviceable: true, codAvailable: true, estimatedDays: 5 };
  }

  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {
    const awb = `MOCK${req.orderNumber.replace(/[^A-Z0-9]/g, "")}`;
    return {
      awb,
      trackingUrl: `/track/${awb}`,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };
  }

  async cancelShipment(): Promise<void> {}

  async getTracking(): Promise<TrackingEvent[]> {
    return [];
  }

  async handleWebhook(): Promise<null> {
    return null;
  }
}
