import type { DeliveryProvider } from "./types";
import { MockDeliveryProvider } from "./mock";

/**
 * Resolve the configured delivery provider.
 *
 * To plug in the real courier later:
 *  1. Create an adapter in this folder implementing DeliveryProvider
 *     (e.g. shiprocket.ts / delhivery.ts) using DELIVERY_API_KEY etc.
 *  2. Register it in the switch below.
 *  3. Set DELIVERY_PROVIDER=<name> and credentials in env.
 * Nothing in the order system changes.
 */
export function getDeliveryProvider(): DeliveryProvider {
  const name = (process.env.DELIVERY_PROVIDER || "mock").toLowerCase();
  switch (name) {
    case "mock":
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_DELIVERY !== "true") {
        throw new Error(
          "Mock delivery provider is not allowed in production. Configure DELIVERY_PROVIDER."
        );
      }
      return new MockDeliveryProvider();
    default:
      throw new Error(
        `Unknown delivery provider "${name}". Add an adapter in src/lib/delivery and register it in factory.ts.`
      );
  }
}

export function deliveryConfigured() {
  const name = (process.env.DELIVERY_PROVIDER || "mock").toLowerCase();
  return name !== "mock";
}
