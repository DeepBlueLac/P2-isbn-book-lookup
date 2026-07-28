"use client";

import posthog from "posthog-js";

type EventProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (name: string, properties?: EventProperties) => void };
    plausible?: (name: string, options?: { props?: EventProperties }) => void;
    __shelfmarkAnalytics?: { posthogReady: boolean; lastEvent?: string };
  }
}

let posthogReady = false;

function ensurePostHog() {
  if (posthogReady || typeof window === "undefined") return posthogReady;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
    request_batching: false,
    loaded: () => {
      window.__shelfmarkAnalytics = { ...(window.__shelfmarkAnalytics || {}), posthogReady: true };
    },
  });
  posthogReady = true;
  window.__shelfmarkAnalytics = { ...(window.__shelfmarkAnalytics || {}), posthogReady };
  return true;
}

export function trackProductEvent(name: string, properties?: EventProperties) {
  if (typeof window === "undefined") return;
  if (ensurePostHog()) {
    posthog.capture(name, properties);
  }
  window.umami?.track(name, properties);
  window.plausible?.(name, { props: properties });
  window.__shelfmarkAnalytics = { ...(window.__shelfmarkAnalytics || {}), posthogReady, lastEvent: name };
  window.dispatchEvent(new CustomEvent("shelfmark:event", { detail: { name, properties } }));
}
