export const ATLAS_COOKIE_SETTINGS_EVENT = "pl:open-cookie-settings";
const storageKey = "pl-ga-consent";
const origin = "https://www.plneuro.xyz";
const namespace = "/neuro-atlas";
type Choice = "granted" | "denied" | null;
export type AnalyticsState = { eligible: boolean; showBanner: boolean; choice: Choice };
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function canonicalPath(win: Window) {
  if (win.location.origin !== origin) return null;
  const path = win.location.pathname;
  // Only actual public app routes: no API/auth/assets or arbitrary user-provided path segments.
  return /^\/neuro-atlas(?:\/(?:milestones|funding|field-velocity|methodology|ecosystem))?\/?$/.test(path) ? path : null;
}

function sanitizedReferrer(value: string) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? `${url.origin}${url.pathname}` : "";
  } catch { return ""; }
}

export function createAtlasAnalytics(window: Window) {
  const win = window as AnalyticsWindow;
  let measurementId: string | null = null;
  let contextRequested = false;
  let consentRequired = true;
  let serverEligible = false;
  let connected = false;
  let loaded = false;
  let configured = false;
  let failed = false;
  let script: HTMLScriptElement | null = null;
  let lastPath: string | null = null;
  let pendingPaths: string[] = [];
  let permission = false;
  let settingsOpen = false;
  let localDenial = false;
  let notify: (state: AnalyticsState) => void = () => {};
  let state: AnalyticsState = { eligible: false, showBanner: false, choice: null };
  const disable = (value: boolean) => {
    if (measurementId) (win as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = value;
  };
  function command(...args: unknown[]) {
    win.dataLayer ??= [];
    // gtag consumes Arguments objects, not ordinary array data-layer events.
    // eslint-disable-next-line prefer-rest-params -- Google's gtag command queue requires an Arguments object.
    if (args.length) win.dataLayer.push(arguments);
  }
  const consentFields = (analytics: "granted" | "denied") => ({ analytics_storage: analytics, ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  function purgeCookies() {
    try {
      const names = new Set(["_ga", `_ga_${measurementId?.slice(2)}`, ...win.document.cookie.split(";").map(cookie => cookie.split("=")[0].trim()).filter(name => name.startsWith("_ga"))]);
      const paths = ["/", "/neuro-atlas", "/neuro-atlas/", ...["milestones", "funding", "field-velocity", "methodology", "ecosystem"].flatMap(route => [`/neuro-atlas/${route}`, `/neuro-atlas/${route}/`])];
      for (const name of names) for (const path of paths) for (const domain of ["", "www.plneuro.xyz", ".www.plneuro.xyz", "plneuro.xyz", ".plneuro.xyz"]) {
        win.document.cookie = `${name}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ""}; SameSite=Lax; Secure`;
      }
    } catch { /* Cookie access can be blocked; collection is already disabled. */ }
  }
  function refuse() {
    disable(true); // Must precede every other withdrawal operation, even implicit-open consent.
    if (permission) {
      if (configured) command("consent", "update", consentFields("denied"));
      purgeCookies();
      lastPath = null;
      pendingPaths = [];
    }
    permission = false;
  }
  function refresh() {
    const path = canonicalPath(win);
    if (!connected) { disable(true); return; }
    const eligible = serverEligible && !!measurementId && !!path;
    state = { ...state, eligible };
    if (!eligible || !measurementId || !path) {
      disable(true);
      state = { ...state, showBanner: false };
      notify(state);
      return;
    }
    try {
      const stored = localDenial ? "denied" : win.localStorage.getItem(storageKey);
      state = { ...state, choice: stored === "granted" || stored === "denied" ? stored : null };
      // Context policy is authoritative; stale/public cookies can never relax it.
      // Still fail closed if the browser denies cookie access altogether.
      void win.document.cookie;
      const region = !consentRequired;
      const allowed = state.choice === "granted" || (stored === null && region);
      state.showBanner = settingsOpen || (!region && state.choice === null);
      notify(state);
      if (!allowed) { refuse(); return; }
    } catch {
      refuse();
      state = { ...state, showBanner: true, choice: null };
      notify(state);
      return;
    }
    if (failed) { disable(true); return; }
    const newlyAllowed = !permission;
    permission = true;
    if ((pendingPaths.at(-1) ?? lastPath) !== path) pendingPaths.push(path);
    if (!script) {
      disable(true);
      script = win.document.createElement("script");
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.onload = () => { loaded = true; refresh(); };
      script.onerror = () => { failed = true; disable(true); };
      win.document.head.appendChild(script);
    }
    if (!loaded) return;
    disable(false);
    const fields = { page_location: `${origin}${path}`, page_referrer: sanitizedReferrer(win.document.referrer), page_title: "Neuro Atlas" };
    if (!configured) {
      win.gtag = command;
      command("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      command("js", new Date());
      command("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...fields });
      configured = true;
    }
    if (configured && newlyAllowed) command("consent", "update", consentFields("granted"));
    for (const nextPath of pendingPaths) {
      command("event", "page_view", {
        send_to: measurementId, ...fields,
        page_location: `${origin}${nextPath}`,
        page_referrer: lastPath ? `${origin}${lastPath}` : fields.page_referrer,
      });
      lastPath = nextPath;
    }
    pendingPaths = [];
  }
  const storageChanged = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) { localDenial = false; settingsOpen = false; refresh(); }
  };
  const openSettings = () => {
    if (connected && state.eligible && canonicalPath(win)) {
      settingsOpen = true;
      refresh();
    }
  };
  return {
    refresh,
    choose(choice: Exclude<Choice, null>) {
      if (!connected || !state.eligible) return;
      if (choice === "denied") { refuse(); purgeCookies(); }
      settingsOpen = false;
      localDenial = false;
      try { win.localStorage.setItem(storageKey, choice); }
      catch { localDenial = true; }
      refresh();
    },
    connect(listener: (state: AnalyticsState) => void) {
      connected = true;
      notify = listener;
      notify(state);
      const push = win.history.pushState;
      const replace = win.history.replaceState;
      const wrappedPush: History["pushState"] = function (...args) { push.apply(win.history, args); refresh(); };
      const wrappedReplace: History["replaceState"] = function (...args) { replace.apply(win.history, args); refresh(); };
      win.history.pushState = wrappedPush;
      win.history.replaceState = wrappedReplace;
      win.addEventListener("popstate", refresh);
      win.addEventListener("storage", storageChanged);
      win.addEventListener(ATLAS_COOKIE_SETTINGS_EVENT, openSettings);
      refresh();
      if (canonicalPath(win) && !contextRequested) {
        contextRequested = true;
        void win.fetch(`${namespace}/api/analytics-context`, { cache: "no-store", credentials: "same-origin", redirect: "error" })
          .then(response => response.ok ? response.json() : null)
          .then(context => {
            if (context?.eligible === true && typeof context.measurementId === "string" && /^G-[A-Z0-9]{6,20}$/.test(context.measurementId) && context.measurementId !== "G-XPSNFVNHGB") {
              measurementId = context.measurementId;
              consentRequired = context.consentRequired !== false;
              serverEligible = true;
              state = { ...state, eligible: true };
              refresh();
            }
          }).catch(() => { disable(true); });
      }
      return () => {
        connected = false;
        disable(true);
        win.removeEventListener("popstate", refresh);
        win.removeEventListener("storage", storageChanged);
        win.removeEventListener(ATLAS_COOKIE_SETTINGS_EVENT, openSettings);
        if (win.history.pushState === wrappedPush) win.history.pushState = push;
        if (win.history.replaceState === wrappedReplace) win.history.replaceState = replace;
      };
    },
  };
}


const controllers = new WeakMap<Window, ReturnType<typeof createAtlasAnalytics>>();
export function getAtlasAnalytics(win: Window) {
  let controller = controllers.get(win);
  if (!controller) { controller = createAtlasAnalytics(win); controllers.set(win, controller); }
  return controller;
}
