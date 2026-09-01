"use client";

// Central client-side analytics SDK. All storefront events go through track().
export function track(type: string, data?: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({
      type,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      ...utmFromUrl(),
      ...data,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // analytics must never break the store
  }
}

function utmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => p.get(k) || undefined;
  const utm = {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
  };
  // persist first-touch UTM for attribution through checkout
  if (utm.utmSource && !sessionStorage.getItem("rn_utm")) {
    sessionStorage.setItem("rn_utm", JSON.stringify(utm));
  }
  if (!utm.utmSource) {
    const saved = sessionStorage.getItem("rn_utm");
    if (saved) return JSON.parse(saved) as typeof utm;
  }
  return utm;
}

export function notifyCartChanged() {
  window.dispatchEvent(new CustomEvent("rn:cart-changed"));
}

export function notifyWishlistChanged() {
  window.dispatchEvent(new CustomEvent("rn:wishlist-changed"));
}
