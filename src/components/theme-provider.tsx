"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  const storageKey = JSON.stringify(props.storageKey ?? "theme").replace(/</g, "\\u003c");

  return (
    <>
      {/* next-themes accepts arbitrary stored values, including legacy "system".
          Normalize those before its first-paint script and client initialization. */}
      <script
        nonce={props.nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `try{const key=${storageKey};const theme=localStorage.getItem(key);if(theme!==null&&theme!=="light"&&theme!=="dark")localStorage.removeItem(key)}catch{}`,
        }}
      />
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        {...props}
      />
    </>
  );
}
