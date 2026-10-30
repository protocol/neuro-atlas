import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import React, { act } from "react";
import { JSDOM } from "jsdom";

// Use separate server/client module graphs, as Next does. next-themes captures
// whether window exists at module evaluation, so one shared SSR import is unsafe.
const serverMarkup = execFileSync(process.execPath, [
  "--import", "tsx", "--input-type=module", "--eval", `
    import React from "react";
    import { renderToString } from "react-dom/server";
    import { ThemeProvider } from "./src/components/theme-provider.tsx";
    import { ThemeToggle } from "./src/components/theme-toggle.tsx";
    process.stdout.write(renderToString(React.createElement(React.StrictMode, null,
      React.createElement(ThemeProvider, null,
        React.createElement(ThemeToggle),
        React.createElement("p", null, "Metrics")
      )
    )));
  `,
], { encoding: "utf8" });

async function openAtlas({ storedTheme = null, osDark = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root">${serverMarkup}</div></body></html>`, {
    url: "https://atlas.example/field-velocity",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  if (storedTheme !== null) window.localStorage.setItem("theme", storedTheme);
  const listeners = new Set();
  let dark = osDark;
  window.matchMedia = () => ({
    get matches() { return dark; },
    media: "(prefers-color-scheme: dark)",
    addListener: listener => listeners.add(listener),
    removeListener: listener => listeners.delete(listener),
  });
  for (const key of ["window", "document", "HTMLElement", "localStorage", "getComputedStyle"]) {
    globalThis[key] = window[key];
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  // Run the actual server-emitted bootstrap scripts in document order, before
  // loading client React. This checks first paint separately from hydration.
  for (const script of window.document.querySelectorAll("script")) window.eval(script.textContent);
  const initialClass = window.document.documentElement.className;
  const initialColorScheme = window.document.documentElement.style.colorScheme;
  const { ThemeProvider } = await import("../src/components/theme-provider.tsx");
  const { ThemeToggle } = await import("../src/components/theme-toggle.tsx");
  const { hydrateRoot } = await import("react-dom/client");
  const renderRoute = route => React.createElement(React.StrictMode, null,
    React.createElement(ThemeProvider, null,
      React.createElement(ThemeToggle),
      React.createElement("p", null, route),
    ),
  );
  const hydrationErrors = [];
  let root;
  await act(async () => {
    root = hydrateRoot(window.document.getElementById("root"), renderRoute("Metrics"), {
      onRecoverableError: error => hydrationErrors.push(error.message),
    });
  });
  return {
    window,
    initialClass,
    initialColorScheme,
    hydrationErrors,
    async changeOsPreference(isDark) {
      dark = isDark;
      await act(async () => { for (const listener of listeners) listener({ matches: dark }); });
    },
    async navigate() {
      dom.reconfigure({ url: "https://atlas.example/about" });
      await act(async () => root.render(renderRoute("About")));
    },
    async close() {
      await act(async () => root.unmount());
      // next-themes removes its temporary transition-suppression styles later.
      await new Promise(resolve => setTimeout(resolve, 5));
      window.close();
    },
  };
}

function assertTheme(atlas, theme) {
  assert.equal(atlas.window.document.documentElement.className, theme);
  assert.equal(atlas.window.document.documentElement.style.colorScheme, theme);
  assert.equal(atlas.window.document.querySelector("button")?.getAttribute("aria-label"), `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  assert.deepEqual(atlas.hydrationErrors, []);
}

function assertLight(atlas) {
  assertTheme(atlas, "light");
}

test("a fresh visitor gets light before hydration even when the OS prefers dark", async () => {
  const atlas = await openAtlas();
  try {
    assert.equal(atlas.initialClass, "light");
    assert.equal(atlas.initialColorScheme, "light");
    assertLight(atlas);
    await atlas.changeOsPreference(false);
    await atlas.changeOsPreference(true);
    assertLight(atlas);
  } finally { await atlas.close(); }
});

test("stored values other than an explicit light or dark choice fall back to light before hydration", async () => {
  for (const storedTheme of ["system", "unknown", "", "DARK", "dark light"]) {
    const atlas = await openAtlas({ storedTheme });
    try {
      assert.equal(atlas.initialClass, "light", `Stored preference: ${JSON.stringify(storedTheme)}`);
      assert.equal(atlas.initialColorScheme, "light");
      assertLight(atlas);
    } finally { await atlas.close(); }
  }
});

test("the existing toggle persists each explicit choice across navigation and reload", async () => {
  let atlas = await openAtlas();
  try {
    assertLight(atlas);
    for (const theme of ["dark", "light"]) {
      await act(async () => atlas.window.document.querySelector("button").click());
      assertTheme(atlas, theme);
      assert.equal(atlas.window.localStorage.getItem("theme"), theme);
      await atlas.navigate();
      assertTheme(atlas, theme);
      const storedTheme = atlas.window.localStorage.getItem("theme");
      await atlas.close();
      atlas = await openAtlas({ storedTheme });
      assert.equal(atlas.initialClass, theme);
      assert.equal(atlas.initialColorScheme, theme);
      assertTheme(atlas, theme);
    }
  } finally { await atlas.close(); }
});

test("existing explicit choices survive navigation and reload without following the OS", async () => {
  for (const theme of ["dark", "light"]) {
    const atlas = await openAtlas({ storedTheme: theme, osDark: theme === "light" });
    let savedTheme;
    try {
      assert.equal(atlas.initialClass, theme);
      assert.equal(atlas.initialColorScheme, theme);
      assertTheme(atlas, theme);
      await atlas.navigate();
      assert.equal(atlas.window.document.querySelector("p").textContent, "About");
      assertTheme(atlas, theme);
      await atlas.changeOsPreference(theme === "dark");
      assertTheme(atlas, theme);
      savedTheme = atlas.window.localStorage.getItem("theme");
      assert.equal(savedTheme, theme, "Keep the existing localStorage key and explicit choice");
    } finally { await atlas.close(); }

    const reloaded = await openAtlas({ storedTheme: savedTheme, osDark: theme === "light" });
    try {
      assert.equal(reloaded.initialClass, theme);
      assert.equal(reloaded.initialColorScheme, theme);
      assertTheme(reloaded, theme);
      assert.equal(reloaded.window.localStorage.getItem("theme"), theme);
    } finally { await reloaded.close(); }
  }
});
