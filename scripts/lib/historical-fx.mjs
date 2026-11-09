// Historical conversions are curated, source-bound observations, never live FX.
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function historicalFxFor(sourceUrl, eventDate, conversions = []) {
  const matches = conversions.filter(row => row.sourceUrl === sourceUrl);
  if (!matches.length) return null;
  const fx = matches[0];
  const basisDate = fx.dateBasis === 'investment_date' ? fx.investmentDate : fx.announcedOn;
  const validUrl = typeof fx.rateSourceUrl === 'string' && /^https:\/\/[^/\s?#]+(?:\/[^\s]*)?$/.test(fx.rateSourceUrl);
  if (matches.length !== 1 || !Number.isFinite(fx.amountNativeM) || fx.amountNativeM <= 0 ||
      !Number.isFinite(fx.nativePerUsd) || fx.nativePerUsd <= 0 || !/^[A-Z]{3}$/.test(fx.currency) ||
      !validUrl || !fx.rateSource?.trim() || !isoDate(fx.announcedOn) || fx.announcedOn !== eventDate ||
      !isoDate(fx.rateDate) || !isoDate(fx.reviewedOn) || !isoDate(basisDate) ||
      !['announcement_date', 'investment_date'].includes(fx.dateBasis) ||
      (fx.dateBasis === 'announcement_date' && fx.investmentDate !== null) ||
      (fx.dateBasis === 'investment_date' && fx.investmentDate > fx.announcedOn) ||
      fx.rateDate !== basisDate || fx.rateDateBasis !== undefined || fx.reviewedOn < fx.announcedOn) {
    throw new Error(`Invalid historical FX provenance: ${sourceUrl}`);
  }
  const amountUsdM = fx.amountNativeM / fx.nativePerUsd;
  if (!Number.isFinite(amountUsdM)) throw new Error(`Invalid historical FX amount: ${sourceUrl}`);
  return { amountUsdM, fx };
}
