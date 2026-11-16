type SiteIcon = { url: string; type?: string; sizes?: string };

// Use the host site's public assets directly: /neuro-atlas assets are gated
// before launch, but the favicon must also work on the anonymous launch screen.
export const plNeuroIcons: { icon: SiteIcon[]; apple: SiteIcon[] } = {
  icon: [
    { url: "https://www.plneuro.xyz/favicon.svg", type: "image/svg+xml" },
    { url: "https://www.plneuro.xyz/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    { url: "https://www.plneuro.xyz/favicon.ico", sizes: "any" },
  ],
  apple: [{ url: "https://www.plneuro.xyz/apple-touch-icon.png", sizes: "180x180" }],
};

export const plNeuroIconSources = [...plNeuroIcons.icon, ...plNeuroIcons.apple].map(icon => icon.url);

export const plNeuroIconMarkup = Object.entries(plNeuroIcons).flatMap(([kind, icons]) =>
  icons.map(icon => `<link rel="${kind === "apple" ? "apple-touch-icon" : "icon"}" href="${icon.url}"${icon.type ? ` type="${icon.type}"` : ""}${icon.sizes ? ` sizes="${icon.sizes}"` : ""}>`),
).join("");
