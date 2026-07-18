type EventProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (name: string, properties?: EventProperties) => void };
    plausible?: (name: string, options?: { props?: EventProperties }) => void;
  }
}

export function trackProductEvent(name: string, properties?: EventProperties) {
  if (typeof window === "undefined") return;
  window.umami?.track(name, properties);
  window.plausible?.(name, { props: properties });
  window.dispatchEvent(new CustomEvent("shelfmark:event", { detail: { name, properties } }));
}
