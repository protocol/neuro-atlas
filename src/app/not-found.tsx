import Link from "next/link";

const destinations = [
  { href: "/milestones", title: "Milestones", description: "Scientific, clinical, and commercial breakthroughs." },
  { href: "/field-velocity", title: "Field Velocity", description: "Measurements of how the field is advancing." },
  { href: "/funding", title: "BCI Funding Index", description: "The companies and capital behind brain-computer interfaces." },
];

export default function NotFound() {
  return (
    <div className="atlas-not-found">
      <section className="atlas-not-found-hero" aria-labelledby="not-found-title">
        <div className="atlas-not-found-copy">
          <p className="atlas-not-found-eyebrow">404 · Page not found</p>
          <h1 id="not-found-title">Off the map.</h1>
          <p className="atlas-not-found-intro">
            We couldn’t find this page. The link may be out of date, or the address may have a typo.
          </p>
          <Link href="/" className="atlas-not-found-home">
            Back to Neuro Atlas <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="atlas-not-found-art" aria-hidden="true">
          <svg viewBox="0 0 360 220" fill="none" aria-hidden="true" focusable="false">
            <path d="M0 45H360M0 110H360M0 175H360M50 0V220M180 0V220M310 0V220" stroke="currentColor" opacity=".15" />
            <circle cx="180" cy="110" r="90" stroke="currentColor" opacity=".22" />
            <circle cx="180" cy="110" r="65" stroke="currentColor" strokeDasharray="2 7" opacity=".4" />
            <path d="M43 45H57M50 38V52M303 175H317M310 168V182" stroke="currentColor" opacity=".6" />
            <circle cx="310" cy="45" r="4" fill="currentColor" />
            <circle cx="50" cy="175" r="4" fill="currentColor" />
          </svg>
          <span>404</span>
        </div>
      </section>
      <section className="atlas-not-found-directory" aria-labelledby="not-found-explore">
        <h2 id="not-found-explore">Find your way back</h2>
        <div className="atlas-not-found-links">
          {destinations.map((destination) => (
            <Link key={destination.href} href={destination.href} className="atlas-not-found-link">
              <div className="atlas-not-found-link-title">
                <h3>{destination.title}</h3><span aria-hidden="true">↗</span>
              </div>
              <p>{destination.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
