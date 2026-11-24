import Link from "next/link";
import { atlasMetadata } from "@/lib/atlas-metadata";
import { LandingVisual } from "@/components/landing-visual";

export const metadata = atlasMetadata("/", "Neuro Atlas");

const PLATES = [
  {
    href: "/milestones", title: "Milestones", view: "milestones",
    blurb: "Follow funding events, first-in-human trials, regulatory decisions, and commercial progress across neurotechnology on a year-by-year timeline.",
    topics: ["Capital", "Clinical & regulatory", "Commercial"],
  },
  {
    href: "/field-velocity", title: "Field Velocity", view: "velocity",
    blurb: "Explore measurements of neural recording, brain mapping, and brain-computer interfaces, alongside research activity and expected inflection points.",
    topics: ["Technical capabilities", "Research activity", "Inflection points"],
  },
  {
    href: "/funding", title: "BCI Funding Index", view: "funding",
    blurb: "Explore implanted and implant-adjacent brain-computer interface companies, their financing histories, and the investors participating in each round.",
    topics: ["Companies", "Funding rounds", "Investors"],
  },
] as const;

export default function Home() {
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="landing-eyebrow">Neuro Atlas</p>
        <h1 id="landing-title" className="landing-title">Neurotechnology, mapped.</h1>
        <p className="landing-intro">
          Explore the breakthroughs, companies, and capital shaping the field.
        </p>
        <div className="landing-actions">
          <a href="#explore" className="landing-explore">Explore the atlas <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section id="explore" tabIndex={-1} className="landing-directory" aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="landing-section-title">Explore the atlas</h2>
        <div className="landing-rows">
          {PLATES.map((plate) => (
            <Link
              key={plate.href}
              href={plate.href}
              className="landing-tile"
              aria-labelledby={`tile-${plate.view}`}
              aria-describedby={`tile-description-${plate.view}`}
            >
              <div className="landing-tile-visual" aria-hidden="true">
                <LandingVisual view={plate.view} />
              </div>
              <div className="landing-tile-content">
                <h3 id={`tile-${plate.view}`}>{plate.title}</h3>
                <p id={`tile-description-${plate.view}`} className="landing-tile-description">{plate.blurb}</p>
                <ul className="landing-tile-topics" aria-label="Topics">
                  {plate.topics.map((topic) => <li key={topic}>{topic}</li>)}
                </ul>
              </div>
              <span className="landing-tile-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
