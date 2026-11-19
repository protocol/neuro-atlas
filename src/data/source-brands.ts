import funding from "@/data/funding-index.json";

export type SourceBrand = { id: string; label: string; logo: string; wordmark?: boolean; darkSurface?: boolean };

const editorialBrands: SourceBrand[] = [
  { id: "openalex", label: "OpenAlex", logo: "/source-logos/openalex.png" },
  { id: "google-trends", label: "Google Trends", logo: "/source-logos/google-trends.ico" },
  { id: "clinicaltrials", label: "ClinicalTrials.gov", logo: "/source-logos/clinicaltrials.svg" },
  { id: "nature", label: "Nature", logo: "/source-logos/nature.svg", wordmark: true },
  { id: "science", label: "Science", logo: "/source-logos/science.svg", wordmark: true },
  { id: "cell", label: "Cell Press", logo: "/source-logos/cell-press.svg", wordmark: true, darkSurface: true },
  { id: "biorxiv", label: "bioRxiv", logo: "/source-logos/biorxiv.jpg", wordmark: true },
  { id: "arxiv", label: "arXiv", logo: "/source-logos/arxiv.svg", wordmark: true },
  { id: "elife", label: "eLife", logo: "/source-logos/elife.svg" },
  { id: "github", label: "GitHub", logo: "/source-logos/github.svg" },
  { id: "neurotech-futures", label: "Neurotech Futures", logo: "/powered-neurotechfutures.png" },
  { id: "neurofounders", label: "Neurofounders", logo: "/source-logos/neurofounders-wordmark.png", wordmark: true },
  { id: "pl-neuro", label: "PL Neuro", logo: "/powered-plneuro.svg" },
];

const companyBrands: SourceBrand[] = funding.companies.filter(company => company.logo.startsWith("/")).map(company => ({
  id: company.slug,
  label: company.name,
  logo: company.logo,
}));

export const SOURCE_BRANDS: Readonly<Record<string, SourceBrand>> = Object.fromEntries(
  [...editorialBrands, ...companyBrands].map(brand => [brand.id, brand]),
);

const sourceHostBrands: Readonly<Record<string, string>> = {
  "openalex.org": "openalex", "api.openalex.org": "openalex", "docs.openalex.org": "openalex", "help.openalex.org": "openalex",
  "trends.google.com": "google-trends",
  "clinicaltrials.gov": "clinicaltrials",
  "nature.com": "nature",
  "science.org": "science", "science.sciencemag.org": "science", "sciencemag.org": "science",
  "cell.com": "cell",
  "biorxiv.org": "biorxiv", "api.biorxiv.org": "biorxiv",
  "arxiv.org": "arxiv",
  "elifesciences.org": "elife",
  "github.com": "github",
  "neurotechnology.substack.com": "neurotech-futures",
  "neurofounders.co": "neurofounders",
  "plneuro.xyz": "pl-neuro",
};

const host = (value: string) => new URL(value).hostname.toLowerCase().replace(/^www\./, "");
const companyHostBrands = new Map(funding.companies.map(company => [host(company.website), company.slug]));

export function sourceBrandForUrl(value: string): SourceBrand | undefined {
  try {
    if (!/^https?:\/\/[^/\\\s]+(?:[/?#]|$)/i.test(value)) return;
    const url = new URL(value);
    if (url.username || url.password || (url.protocol !== "https:" && url.protocol !== "http:")) return;
    const name = host(value);
    let id = sourceHostBrands[name] ?? companyHostBrands.get(name);
    if (name === "doi.org") {
      const doi = url.pathname.toLowerCase();
      if (/^\/10\.1038\//.test(doi)) id = "nature";
      else if (/^\/10\.1126\//.test(doi)) id = "science";
      else if (/^\/10\.7554\//.test(doi)) id = "elife";
      else if (/^\/10\.48550\/arxiv\./.test(doi)) id = "arxiv";
      else if (/^\/10\.1016\/j\.(cell|neuron|cub|cels)\./.test(doi)) id = "cell";
    }
    return id ? SOURCE_BRANDS[id] : undefined;
  } catch { return undefined; }
}

export const SOURCE_GROUP_BRANDS: Readonly<Record<string, readonly string[]>> = {
  datasets: ["openalex", "google-trends", "clinicaltrials"],
  studies: ["nature", "science", "cell", "biorxiv"],
  disclosures: ["neuralink", "science-corporation", "paradromics", "synchron"],
  discovery: ["neurotech-futures", "neurofounders"],
  ecosystems: ["neurofounders"],
  reference: ["openalex", "github", "pl-neuro"],
};
