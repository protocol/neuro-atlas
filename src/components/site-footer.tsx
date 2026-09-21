const linkGroups = [
  {
    label: "Explore",
    links: [
      { label: "PL R&D", href: "https://www.plrd.org/" },
      { label: "PL Neuro", href: "https://www.plneuro.xyz/" },
      { label: "Protocol Labs", href: "https://www.protocol.ai/" },
    ],
  },
  {
    label: "Connect",
    links: [
      { label: "X / Twitter", href: "https://x.com/protocollabs_rd" },
      { label: "GitHub", href: "https://github.com/protocol/neuro-atlas" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy Policy", href: "https://www.protocol.ai/legal/#privacy-policy" },
      { label: "Terms of Service", href: "https://www.protocol.ai/legal/#terms-conditions" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="px-3 pb-6 sm:px-4 lg:pl-2 lg:pr-4">
      <div className="px-5 pt-5 sm:px-7 lg:px-9">
        <div className="flex flex-col gap-7 pb-5 xl:flex-row xl:justify-between xl:gap-10">
          <div>
            <p className="text-sm font-semibold tracking-tight">Neuro Atlas</p>
            <p className="mt-2 text-[13px] leading-6 text-foreground/70">
              A field guide to neurotechnology.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-3 gap-4 sm:gap-6">
            {linkGroups.map((group) => (
              <div key={group.label}>
                <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                  {group.label}
                </h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="inline-flex min-h-7 items-center rounded-sm py-1 text-[13px] leading-5 text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent pointer-coarse:min-h-11 pointer-coarse:py-2"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-border-strong pt-5 text-[12px] leading-6 text-foreground/70">
          <p>
            Neuro Atlas is for informational purposes only and is not investment,
            legal, or medical advice. It is not an offer, solicitation, or
            recommendation of any security or investment product, and makes no
            commitment or guarantee of future performance or outcomes. Company and
            project inclusion does not imply endorsement. Data is compiled from
            third-party sources and may contain errors, be incomplete, or become
            outdated, and is provided without warranty. You should review the linked
            primary sources and do your own due diligence before relying on any data
            in this site. Protocol Labs, Inc. and PL Capital hold, or may hold,
            financial interests in companies or funds featured here.
          </p>
        </div>
      </div>
    </footer>
  );
}
