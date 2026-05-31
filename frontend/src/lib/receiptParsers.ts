/**
 * Receipt OCR parsers — pluggable per-store profiles.
 *
 * Architecture:
 *  - Each StoreProfile has a `detect(text)` (header/keyword match) and an
 *    optional `preprocess(text)` to strip noise lines + optional `parse()`
 *    overrides.
 *  - `parseReceipt(text, ctx)`:
 *      1. Picks the best matching profile (or DEFAULT).
 *      2. Runs `preprocess` to filter noise specific to that retailer
 *         (e.g. "CHANGE DUE", "C-T MONEY", "MEMBER SAVINGS").
 *      3. Runs the generic parser on the cleaned text.
 *      4. Layers profile-specific overrides on top.
 *
 * Adding a new store: append an entry to `STORE_PROFILES` below.
 * Tuning a store: paste real OCR raw text into the unit tests / dev console,
 * inspect [OCR raw text] log, and adjust `ignore` / `labels` patterns.
 */

export type ParseContext = { province?: string };

export type ParsedReceipt = {
  subtotal: string;
  tps: string;
  tvq: string;
  tvh: string;
  tip: string;
  total: string;
  noTax: boolean;
  /** Detected supplier/merchant name (e.g. "Dollarama"). Empty string if unknown. */
  supplier: string;
  /** Profile id that matched, e.g. 'UNIPRIX' or 'DEFAULT'. */
  profileId: string;
  /** Human-readable label for UI debug. */
  profileLabel: string;
};

type PartialFields = Partial<Omit<ParsedReceipt, 'profileId' | 'profileLabel'>>;

export type StoreProfile = {
  id: string;
  label: string;
  /** Regexes any of which, if matched against the full text, selects this profile. */
  detect: RegExp[];
  /** Lines matching any pattern here are removed before generic parsing. */
  ignore?: RegExp[];
  /**
   * Canonical supplier/merchant name shown to the user. May be a string for
   * single-brand profiles, or a function for multi-brand profiles that picks
   * the actual brand from the OCR text.
   */
  supplier?: string | ((text: string) => string | undefined);
  /**
   * Optional override hook — runs *after* the generic parser on the cleaned text.
   * Return only the fields you want to overwrite. Empty strings are ignored.
   */
  override?: (cleanedText: string, ctx: ParseContext, base: PartialFields) => PartialFields;
};

// ─────────────────────────── Generic parser ────────────────────────────────
// (Logic preserved from the previous in-page parseOcrText to avoid regression.)

const extractAmountsFromText = (src: string): number[] => {
  // Strip year-looking values like "2026,10" (QC date format) before scanning.
  // Without this, a date line "10 Mai 2026,10:27" extracts 2026.10 as a price,
  // which becomes the max-amount fallback total and explodes all calculations.
  const cleaned = src.replace(/\b20\d{2}[,.]\d{2}\b/g, '');
  const found = new Set<number>();
  for (const m of cleaned.matchAll(/\b(\d{1,6})[.,](\d{2})\b/g)) {
    const n = parseFloat(`${m[1]}.${m[2]}`);
    if (isFinite(n) && n > 0) found.add(n);
  }
  for (const m of cleaned.matchAll(/\b(\d{2,5})\s(\d{2})\b/g)) {
    const n = parseFloat(`${m[1]}.${m[2]}`);
    if (isFinite(n) && n >= 1 && n < 10000) found.add(n);
  }
  return [...found];
};

const lastPriceOf = (line: string): number | null => {
  const nums = extractAmountsFromText(line);
  return nums.length ? nums[nums.length - 1] : null;
};

const firstPriceOf = (line: string): number | null => {
  const nums = extractAmountsFromText(line);
  return nums.length ? nums[0] : null;
};

const has = (line: string, ...words: string[]) =>
  words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(line));

const taxAmountAfterLabel = (line: string, labelRe: RegExp): number | null => {
  const norm = line.replace(/,/g, '.');
  const lm = norm.match(labelRe);
  if (!lm || lm.index === undefined) return null;
  const after = norm.slice(lm.index + lm[0].length);
  // Skip rate tokens like "(5%)" / "(9.975%)" — require the .NN to NOT be
  // followed by another digit or a percent sign.
  for (const dm of after.matchAll(/(\d{1,4}\.\d{2})(?![0-9%])/g)) {
    const v = parseFloat(dm[1]);
    if (isFinite(v) && v > 0) return v;
  }
  return null;
};

/**
 * Tax-label normalization — collapse OCR’d dotted/spaced abbreviations into a
 * single token so word-boundary matchers (`\btps\b`, `\btvq\b`, …) hit.
 * Without this, Metro / Subway / Tim Hortons / Poulet Rouge — which print
 * "T.P.S" / "T. V. Q" / "G. S. T" — silently drop their tax fields.
 */
const normalizeTaxLabels = (text: string): string =>
  text
    .replace(/\bT\s*[.\u00b7]\s*P\s*[.\u00b7]?\s*S\b/gi, 'TPS')
    .replace(/\bT\s*[.\u00b7]\s*V\s*[.\u00b7]?\s*Q\b/gi, 'TVQ')
    .replace(/\bT\s*[.\u00b7]\s*V\s*[.\u00b7]?\s*H\b/gi, 'TVH')
    .replace(/\bG\s*[.\u00b7]\s*S\s*[.\u00b7]?\s*T\b/gi, 'GST')
    .replace(/\bQ\s*[.\u00b7]\s*S\s*[.\u00b7]?\s*T\b/gi, 'QST')
    .replace(/\bH\s*[.\u00b7]\s*S\s*[.\u00b7]?\s*T\b/gi, 'HST')
    // Re-insert a space between a tax label and a digit-rate that OCR glued
    // together: "TPS5%" / "TVQ9.975%" / "GST5%" \u2192 "TPS 5%" / "TVQ 9.975%" /
    // "GST 5%". Without this, the \btps\b / \btvq\b matchers below miss the
    // line entirely and the form silently falls back to province-rate auto-calc.
    .replace(/\b(TPS|TVQ|TVH|GST|QST|HST)(?=\d)/gi, '$1 ')
    // OCR often inserts spaces around decimal points: "56 . 90" \u2192 "56.90".
    // Without this, "SOUS TOTAL 56 . 90%" can't be parsed so the subtotal
    // falls back to the first item price, pushing the remainder into tip.
    .replace(/(\d)\s+\.\s+(\d{2})\b/g, '$1.$2');

/**
 * Noise lines applied to every receipt before the generic parser runs.
 * Each entry removes a class of line that has been observed to wrongly
 * capture TOTAL / TIP / TAX values on real receipts.
 */
const DEFAULT_NOISE: RegExp[] = [
  // Restaurant tip-suggestion blocks: "15% (Pourb. $2.18, TOTAL $18.90)".
  // These contain BOTH "pourboire" and "total" + a price → they would steal
  // the tip and the total from the actual summary lines below.
  /\b\d{1,2}\s*%.{0,40}pourb/i,
  /pourb\.?.{0,30}\d{1,2}\s*%/i,
  /\b\d{1,2}\s*%.{0,40}\btip\b/i,
  // Cash-back / change lines.
  /^\s*monnaie\b/i,
  /^\s*change\s*(due|owe(d)?)?\b/i,
  // Penny rounding ("Arrondissement: -0,01").
  /\barrondi(ssement)?\b/i,
  // Card slip echoes that repeat the amount with VISA / Interac labels.
  /^\s*(visa|m\/?c|mastercard|amex|interac|debit|d\u00e9bit|cr\u00e9dit|credit)\b[^a-z]*\d/i,
  /^\s*compte\s*:?\s*visa\b/i,
  /^\s*type\s+de\s+(carte|trans)/i,
  /^\s*num[e\u00e9]ro\s+(de\s+)?carte\b/i,
  /^\s*card\s+(type|number)\b/i,
  /^\s*acct\s*:/i,
  /\bapprouv[e\u00e9]e?\b/i,
  /\bapproved\b/i,
  // Date / timestamp lines that contain receipt-year patterns like
  // "2026,10:27" or "26/05/10 10:09:33" — these would otherwise extract
  // 2026.10 (or similar) as a price and corrupt the max-amount fallback.
  /\b20\d{2}[-,\/]\d{2}/,
  /\b\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/,
];

const parseGeneric = (rawText: string, ctx: ParseContext): PartialFields => {
  const province = ctx.province;
  const text = normalizeTaxLabels(
    rawText
      .split('\n')
      .filter(l => !DEFAULT_NOISE.some(rx => rx.test(l)))
      .join('\n'),
  );
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const allAmounts = extractAmountsFromText(text);
  const result: Record<string, string> = {};

  // Pre-pass 1: same-line "TPS: x.xx TVQ: y.yy"
  for (const line of lines) {
    if (/\d{8,}/.test(line)) continue;
    if (!result.tps) {
      const v = taxAmountAfterLabel(line, /\b(?:tps|gst)\b/i);
      if (v !== null) result.tps = v.toFixed(2);
    }
    if (!result.tvq) {
      const v = taxAmountAfterLabel(line, /\b(?:tvq|tvo|tv0|tvg|ivq|lvq|1vq|qst|tq|vq)\b/i);
      if (v !== null) result.tvq = v.toFixed(2);
    }
    if (!result.tvh) {
      const v = taxAmountAfterLabel(line, /\b(?:tvh|hst)\b/i);
      if (v !== null) {
        // Some QC POS systems mislabel TPS (5%) and TVQ (9.975%) as "TVH".
        // Detect by the rate% on the same line and store in the correct field.
        const prov1 = (province ?? '').toUpperCase().trim();
        if (prov1 === 'QC' && !result.tvq && /\b9[.,][5-9]\d*\s*%/.test(line)) {
          result.tvq = v.toFixed(2);
        } else if (prov1 === 'QC' && !result.tps && /\b5(?:[.,]0{0,3})?\s*%/.test(line)) {
          result.tps = v.toFixed(2);
        } else {
          result.tvh = v.toFixed(2);
        }
      }
    }
  }

  // Pre-pass 1b: rate-fingerprint fallback. QC TPS is always 5% and TVQ is
  // always 9.975% \u2014 if the literal rate appears on a line, that line is the
  // tax line even when the "TPS"/"TVQ" label itself was OCR-mangled (e.g.
  // "1PS 5%", "TVO 9.975%", "TPSS5%"). Look for the price on the same line
  // first, then the next short line (boxed layouts).
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\d{8,}/.test(line)) continue;
    const findRatePrice = (rateRe: RegExp): number | null => {
      if (!rateRe.test(line)) return null;
      // Strip the rate token itself so we don't pick "5.00" out of "5%".
      const stripped = line.replace(rateRe, ' ');
      const p = taxAmountAfterLabel(stripped, /^/);
      if (p !== null) return p;
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next && next.length <= 20) {
          const np = firstPriceOf(next);
          if (np !== null && np > 0 && np < 1000) return np;
        }
      }
      return null;
    };
    if (!result.tps) {
      const v = findRatePrice(/\b5(?:[.,]0{0,3})?\s*%/);
      if (v !== null) result.tps = v.toFixed(2);
    }
    if (!result.tvq) {
      const v = findRatePrice(/\b9[.,][5-9]\d*\s*%/);
      if (v !== null) result.tvq = v.toFixed(2);
    }
  }

  // Pre-pass 2: lock in "Montant total" / "Total facture" / payment-echo lines
  // before main loop. Payment-echo lines (Clover paiement, CARTE CR./CREDIT,
  // MONTANT) reliably show the actual amount charged even when the TOTAL line
  // itself is garbled (e.g. Metro: OCR drops "SOUS-" from "SOUS-TOTAL", making
  // the parser think 36.42 is the total; "CARTE CR. 39.31" corrects this).
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isPaymentEcho =
      /\bclover\s+paie[mr]ent\b/i.test(line) ||
      /^\s*carte\s+(cr\.?|credit)\b/i.test(line);
    const isTotalHeader = /montant.{0,8}total|total.{0,8}factur/i.test(line) &&
        !has(line, 'subtotal', 'sous.{0,3}total', 'somme.partielle');
    if (isPaymentEcho || isTotalHeader) {
      let p = lastPriceOf(line);
      if (p === null && i + 1 < lines.length) p = lastPriceOf(lines[i + 1]);
      if ((p ?? 0) > 0) { result.total = p!.toFixed(2); if (!isPaymentEcho) break; }
    }
  }

  const noTax = /non.inscrit|non.taxable|not.taxable|tax.exempt/i.test(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let price = lastPriceOf(line);
    if (price === null && i + 1 < lines.length) price = lastPriceOf(lines[i + 1]);
    if (price === null && i + 2 < lines.length) price = lastPriceOf(lines[i + 2]);
    if (price === null && i + 3 < lines.length) price = lastPriceOf(lines[i + 3]);

    if (!result.subtotal && has(line, 'subtotal', 'sous.{0,3}total', 'sub.total', 'somme.partielle')) {
      const sp = firstPriceOf(line);
      if ((sp ?? 0) > 0) result.subtotal = sp!.toFixed(2);
    }
    // "Montant taxable" (the taxable base) overrides any prior SOUS-TOTAL —
    // useful when OCR misreads the SOUS-TOTAL amount but gets this line right.
    if (has(line, 'montant.taxable')) {
      const sp = firstPriceOf(line);
      if ((sp ?? 0) > 0) result.subtotal = sp!.toFixed(2);
    }
    if (!result.tps && has(line, 'tps', 'gst', 'tax') && !/\d{8,}/.test(line)) {
      if ((price ?? 0) > 0) result.tps = price!.toFixed(2);
    }
    if (!result.tvq && has(line, 'tvq', 'tvo', 'tv0', 'tvg', 'qst', 'tq', 'vq') && !/\d{8,}/.test(line)) {
      if ((price ?? 0) > 0) result.tvq = price!.toFixed(2);
    }
    if (has(line, 'tvh', 'hst') && !/\d{8,}/.test(line)) {
      const prov2 = (province ?? '').toUpperCase().trim();
      if (prov2 === 'QC' && /\b9[.,][5-9]\d*\s*%/.test(line)) {
        if (!result.tvq && (price ?? 0) > 0) result.tvq = price!.toFixed(2);
      } else if (prov2 === 'QC' && /\b5(?:[.,]0{0,3})?\s*%/.test(line)) {
        if (!result.tps && (price ?? 0) > 0) result.tps = price!.toFixed(2);
      } else if (!result.tvh) {
        if ((price ?? 0) > 0) result.tvh = price!.toFixed(2);
      }
    }
    if (!result.tip && has(line, 'tip', 'gratuity', 'pourboire')) {
      if ((price ?? 0) > 0) result.tip = price!.toFixed(2);
    }
    const looksLikeTotal = has(line, 'total', 'montant') || /\bt[o0][t][a][li1]\b/i.test(line);
    if (!result.total && looksLikeTotal && !has(line, 'subtotal', 'sous.{0,3}total', 'taxable')) {
      // Same-line price first (column header guard). If absent, look at the
      // very next short line ONLY when nothing meaningful precedes the price
      // (rescues boxed layouts like KandJu "TOTAL\n20,68 $" where OCR may also
      // render "$" as "5"/"S"; rejects "TOTAL" column headers followed by
      // verbose item rows).
      let sameLine = lastPriceOf(line);
      if ((sameLine ?? 0) === 0 && i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next && next.length <= 30) {
          const m = next.match(/(\d{1,6}[.,]\d{2})/);
          if (m && next.slice(0, m.index!).replace(/[\s$]/g, '') === '') {
            const v = parseFloat(m[1].replace(',', '.'));
            if (isFinite(v) && v > 0) sameLine = v;
          }
        }
      }
      if ((sameLine ?? 0) > 0) result.total = sameLine!.toFixed(2);
    }
  }

  // Fallback: largest amount = total.
  if (!result.total && allAmounts.length > 0) {
    result.total = Math.max(...allAmounts).toFixed(2);
  }
  // Fallback: largest amount < total = subtotal.
  if (!result.subtotal && result.total) {
    const totalNum = parseFloat(result.total);
    const candidates = allAmounts.filter(a => a < totalNum * 0.995);
    if (candidates.length > 0) result.subtotal = Math.max(...candidates).toFixed(2);
  }

  // QC remainder logic.
  if (!result.tip && result.total && result.subtotal) {
    const rem =
      parseFloat(result.total) -
      parseFloat(result.subtotal) -
      parseFloat(result.tps || '0') -
      parseFloat(result.tvq || '0') -
      parseFloat(result.tvh || '0');
    if (rem >= 0.5) {
      const prov = (province ?? '').toUpperCase().trim();
      if (prov === 'QC') {
        if (!result.tvq && result.tps) result.tvq = rem.toFixed(2);
        else if (!result.tps && result.tvq) result.tps = rem.toFixed(2);
        else if (result.tps && result.tvq) result.tip = rem.toFixed(2);
      } else if (['ON', 'NS', 'NB', 'NL', 'PE'].includes(prov)) {
        if (!result.tvh) result.tvh = rem.toFixed(2);
        else result.tip = rem.toFixed(2);
      } else if (result.tps) {
        result.tip = rem.toFixed(2);
      }
    }
  }

  if (noTax && !result.subtotal && result.total) result.subtotal = result.total;

  // Rate-split back-calculation: when OCR gives us total + subtotal but missed
  // the individual tax lines (common when the amount column is in the fold of a
  // crumpled receipt), derive each tax from (total − subtotal) × (rate / totalRate).
  // This preserves whatever rounding the retailer used rather than applying our
  // own rate × subtotal rounding, which can be off by ±$0.01.
  // Only runs when NO taxes were extracted by any of the passes above.
  if (
    result.total && result.subtotal &&
    !result.tps && !result.tvq && !result.tvh && !noTax
  ) {
    const totalTax = Math.round(
      (parseFloat(result.total) - parseFloat(result.subtotal)) * 100,
    );
    const prov = (province ?? '').toUpperCase().trim();
    if (prov === 'QC' && totalTax > 0) {
      const rTps = 5;
      const rTvq = 9.975;
      const rSum = rTps + rTvq;
      const tpsCents = Math.round((totalTax * rTps) / rSum);
      const tvqCents = totalTax - tpsCents;
      result.tps = (tpsCents / 100).toFixed(2);
      result.tvq = (tvqCents / 100).toFixed(2);
    } else if (['ON', 'NS', 'NB', 'NL', 'PE'].includes(prov) && totalTax > 0) {
      result.tvh = (totalTax / 100).toFixed(2);
    } else if (['AB', 'BC', 'MB', 'SK', 'NT', 'NU', 'YT'].includes(prov) && totalTax > 0) {
      result.tps = (totalTax / 100).toFixed(2);
    }
  }

  // Tax-exempt receipts (bakery, basic groceries, library fines…): subtotal ==
  // total with no taxes parsed. Mark `noTax` so the form’s auto-tax-calc is
  // suppressed (otherwise province-rate auto-calc would inflate the total).
  if (
    result.subtotal &&
    result.total &&
    !result.tps && !result.tvq && !result.tvh &&
    Math.abs(parseFloat(result.subtotal) - parseFloat(result.total)) < 0.05
  ) {
    (result as Record<string, string>)._noTax = '1';
  }

  // Sum-sanity check — if subtotal + parsed taxes (+ tip) disagrees with the
  // parsed total by more than $0.50, the OCR almost certainly misread a digit
  // in the TOTAL line (e.g. Bath&Body Works: total "83.23" but components sum
  // to 33.23). Trust the labelled components.
  if (result.subtotal && result.total && (result.tps || result.tvq || result.tvh)) {
    const sum =
      parseFloat(result.subtotal) +
      parseFloat(result.tps || '0') +
      parseFloat(result.tvq || '0') +
      parseFloat(result.tvh || '0') +
      parseFloat(result.tip || '0');
    const parsedTotal = parseFloat(result.total);
    if (isFinite(sum) && sum > 0 && Math.abs(sum - parsedTotal) > 0.5) {
      console.log('[OCR sum-check] total', parsedTotal, '→', sum.toFixed(2));
      result.total = sum.toFixed(2);
    }
  }

  // Last-resort back-calc subtotal from total + province rate.
  if (!result.subtotal && !result.tps && !result.tvq && !result.tvh && result.total && !noTax) {
    const totalNum = parseFloat(result.total);
    const prov = (province ?? '').toUpperCase().trim();
    let rate = 0;
    if (prov === 'QC')                                                  rate = 0.05 + 0.09975;
    else if (prov === 'ON')                                             rate = 0.13;
    else if (['NS', 'NB', 'NL', 'PE'].includes(prov))                  rate = 0.15;
    else if (['AB', 'BC', 'MB', 'SK', 'NT', 'NU', 'YT'].includes(prov)) rate = 0.05;
    if (rate > 0) result.subtotal = (totalNum / (1 + rate)).toFixed(2);
  }

  return {
    subtotal: result.subtotal,
    tps: result.tps,
    tvq: result.tvq,
    tvh: result.tvh,
    tip: result.tip,
    total: result.total,
    noTax: noTax || (result as Record<string, string>)._noTax === '1',
  };
};

// ───────────────────────── Store profile registry ──────────────────────────
// Each profile filters noise specific to that retailer so the generic parser
// picks the right SUBTOTAL/TPS/TVQ/TOTAL. Add new entries here as you collect
// real OCR samples; tighten `ignore` patterns to match observed noise.

const IGNORE_PAYMENT_TAIL = [
  /\bchange\s*(due|owe?d?)?\b/i,
  /\bmonnaie\b/i,
  /\b(debit|credit|visa|m\/?c|mastercard|amex|interac|atm)\b.*\btend(er(ed)?)?\b/i,
  /\btend(er(ed)?)?\b/i,
  /\bauth(orization)?\s*[:#]/i,
  /\bapproved\b|\bapprouv/i,
  /\baid:?\s*[a-f0-9]/i,
  /\btvr:?\s*[a-f0-9]/i,
  /\btsi:?\s*[a-f0-9]/i,
];

export const STORE_PROFILES: StoreProfile[] = [
  {
    id: 'UNIPRIX',
    label: 'Uniprix',
    supplier: 'Uniprix',
    detect: [/\buniprix\b/i, /\buni.?prix\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /points?\s+(air\s+miles|inspire|rx)/i,
      /no\.?\s*rx\b/i,
    ],
  },
  {
    id: 'DOLLARAMA',
    label: 'Dollarama',
    supplier: 'Dollarama',
    detect: [/\bdollarama\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bitems?\s*sold\b/i,
      /\bquant(ity|it[ée])\b/i,
    ],
  },
  {
    id: 'KANDJU',
    label: 'Kandju',
    supplier: 'KandJu',
    // Cover common OCR misreads of the brand (K/R, J/I, U/V, etc.).
    // Also match by known-stable identifiers: store address and CRA GST number
    // (1812413904) which appear consistently on every receipt even when the
    // store name itself is unreadable due to image quality.
    detect: [
      /\bkandju\b/i, /\bkanjoo\b/i, /\bk[a@]ndj[uo]\b/i, /\brandju\b/i,
      /\b1812413904\b/,             // KandJu CRA/GST registration number
      /620\s+rue\s+j[.-]a[.-].*bombardier/i, // KandJu street address
    ],
    ignore: [...IGNORE_PAYMENT_TAIL],
  },
  {
    id: 'COSTCO',
    label: 'Costco',
    supplier: 'Costco',
    detect: [/\bcostco\b/i, /\bcostco\s+wholesale\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /member(ship)?\s*#?/i,
      /\bsavings?\b/i,
      /\btpd\b/i,                 // Costco "TPD" instant rebate flag
      /instant\s+(savings|rebate)/i,
      /\bcoupon\b/i,
      /\bitems?\s*sold\b/i,
    ],
  },
  {
    id: 'CANADIAN_TIRE',
    label: 'Canadian Tire',
    supplier: 'Canadian Tire',
    detect: [/\bcanadian\s+tire\b/i, /\bcdn\s+tire\b/i, /\bpneus\s+canadien/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bc[\-\s]?t\s+money\b/i,
      /\bargent\s+ct\b/i,
      /\bct\s+money\b/i,
      /\btriangle\s+rewards?\b/i,
      /\bearn(ed)?\b.*\bct\b/i,
    ],
  },
  {
    id: 'HOME_DEPOT',
    label: 'Home Depot',
    supplier: 'Home Depot',
    detect: [/\bhome\s*depot\b/i, /\bthe\s+home\s+depot\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bpro\s+xtra\b/i,
      /\bperks?\b/i,
    ],
  },
  {
    id: 'RONA',
    label: 'Rona',
    supplier: (text: string) => /\br[ée]no[\-\s]?d[ée]p[ôo]t\b/i.test(text) ? 'Réno-Dépôt' : 'Rona',
    detect: [/\brona\b/i, /\brona\s+inc\b/i, /\bréno[\-\s]?dépôt\b/i, /\breno[\-\s]?depot\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bvip\s*pro\b/i,
      /\bairmiles?\b/i,
    ],
  },
  {
    id: 'WALMART',
    label: 'Walmart',
    supplier: 'Walmart',
    detect: [/\bwal[\-\s]?mart\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bsave\s+money\b/i,
      /\bitems?\s*sold\b/i,
      /\btc#?\s*\d/i,
    ],
  },
  {
    id: 'GROCERY_QC',
    label: 'Metro / IGA / Provigo',
    supplier: (text: string) => {
      const t = text.toLowerCase();
      if (/\bsuper\s*c\b/.test(t)) return 'Super C';
      if (/\bprovigo\b/.test(t))   return 'Provigo';
      if (/\bmaxi\b/.test(t))      return 'Maxi';
      if (/\biga\b/.test(t))       return 'IGA';
      if (/\bmetro\b/.test(t))     return 'Metro';
      return undefined;
    },
    detect: [/\bmetro\b/i, /\biga\b/i, /\bprovigo\b/i, /\bmaxi\b/i, /\bsuper\s*c\b/i],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bair\s*miles\b/i,
      /\bmoi\s*récompenses?\b/i,
      /\bpc\s*optimum\b/i,
      /\beco\s*frais\b/i,            // consignes / eco-fees are line items, keep them in subtotal
    ],
  },
  {
    id: 'FUEL_CONVENIENCE',
    label: 'Couche-Tard / Petro / Esso / Shell',
    supplier: (text: string) => {
      const t = text.toLowerCase();
      if (/\bcouche[\-\s]?tard\b/.test(t)) return 'Couche-Tard';
      if (/\bpetro[\-\s]?canada\b/.test(t)) return 'Petro-Canada';
      if (/\besso\b/.test(t))     return 'Esso';
      if (/\bshell\b/.test(t))    return 'Shell';
      if (/\bultramar\b/.test(t)) return 'Ultramar';
      if (/\birving\b/.test(t))   return 'Irving';
      if (/\bcircle\s*k\b/.test(t)) return 'Circle K';
      return undefined;
    },
    detect: [
      /\bcouche[\-\s]?tard\b/i,
      /\bpetro[\-\s]?canada\b/i,
      /\besso\b/i,
      /\bshell\b/i,
      /\bultramar\b/i,
      /\birving\b/i,
      /\bcircle\s*k\b/i,
    ],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\bpump\s*#?\s*\d/i,
      /\bpompe\s*#?\s*\d/i,
      /\bproduct\s*#/i,
      /\bproduit\s*#/i,
      /\bprice\s*\/\s*l\b/i,
      /\bprix\s*\/\s*l\b/i,
      /\bunit\s*price\b/i,
      /\blit(re|er)s?\b/i,
      /\bvolume\b/i,
      /\bodometer\b/i,
    ],
  },
  {
    id: 'BATH_BODY_WORKS',
    label: 'Bath & Body Works',
    supplier: 'Bath & Body Works',
    // OCR severely mangles the cursive header. We deliberately drop \b word
    // boundaries here because real captures look like "hatnandbodyworks.ca",
    // "PROMI NADES ST BRUNG", "bodyworks" jammed against neighbouring words.
    detect: [
      /bath\s*(&|and|n)?\s*body\s*works?/i,
      /bath\s*and\s*body\s*works?/i,
      /bathandbodyworks?/i,
      /h?atn?an?dbodyworks?/i,        // OCR of "...bathandbodyworks..."
      /body\s*works?\.?ca/i,
      /promi?\s*nades?\s+st[\s\-]?brun/i,
      /promenades?\s+st[\s\-]?brun/i,
    ],
    ignore: [...IGNORE_PAYMENT_TAIL],
  },
  {
    id: 'RESTAURANT_FOOD',
    label: 'Restaurant / Café (Tim, Subway, Poulet Rouge…)',
    supplier: (text: string) => {
      const t = text.toLowerCase();
      if (/\btim\s*horton/.test(t))      return 'Tim Hortons';
      if (/\bsubway\b/.test(t))          return 'Subway';
      if (/\bpoulet\s+rouge\b/.test(t))  return 'Poulet Rouge';
      if (/\bmcdonald'?s?\b/.test(t))    return "McDonald's";
      if (/\bst[\-\s]?hubert\b/.test(t)) return 'St-Hubert';
      if (/\bharvey'?s?\b/.test(t))      return "Harvey's";
      if (/\bcora\b/.test(t))            return 'Cora';
      if (/\bnormandin\b/.test(t))       return 'Normandin';
      if (/\bvalentine\b/.test(t))       return 'Valentine';
      if (/\bchez\s+ashton\b/.test(t))   return 'Chez Ashton';
      return undefined; // fall back to generic header detection
    },
    detect: [
      /\btim\s*horton/i,
      /\bsubway\b/i,
      /\bpoulet\s+rouge\b/i,
      /\bmcdonald'?s?\b/i,
      /\bst[\-\s]?hubert\b/i,
      /\bharvey'?s?\b/i,
      /\bcora\b/i,
      /\bnormandin\b/i,
      /\bvalentine\b/i,
      /\bchez\s+ashton\b/i,
      /\brestaurant\b/i,
      /\bresto\b/i,
      /\bcaf[ée]\b/i,
      /\bpizz(a|eria)\b/i,
      // Receipts with explicit tip-suggestion blocks are restaurants in practice.
      /pourb\.?.{0,30}\d{1,2}\s*%/i,
    ],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      // Restaurant-specific extras (DEFAULT_NOISE already strips tip suggestions,
      // but list them here too for safety + readability).
      /\b\d{1,2}\s*%.{0,40}pourb/i,
      /pourb\.?.{0,30}\d{1,2}\s*%/i,
      /\bsuggestion\s+pourboire\b/i,
      /\btip\s+suggestion\b/i,
      /\bcaissier\b/i,
      /\bshift\s*\d/i,
    ],
  },
  {
    id: 'CHOCOLATERIE_SPECIALTY',
    label: 'Chocolaterie / Spécialité',
    supplier: (text: string) => {
      if (/\bla\s+cabosse\b/i.test(text)) return 'La Cabosse';
      return undefined; // fall back to header detection
    },
    detect: [
      /\bchocolaterie\b/i,
      /\bla\s+cabosse\b/i,
      /\bbonbons?\b/i,
      /\bp[âa]tisserie\b/i,
      /\bboulangerie\b/i,
    ],
    ignore: [...IGNORE_PAYMENT_TAIL],
  },
  {
    id: 'LODGING_PARKING',
    label: 'Motel / Hotel / Parking',
    supplier: (text: string) => {
      const t = text.toLowerCase();
      if (/\bindigo\b/.test(t))           return 'Indigo';
      if (/\bimpark\b/.test(t))           return 'Impark';
      if (/\beasypark\b/.test(t))         return 'EasyPark';
      if (/\bprecise\s*parklink\b/.test(t)) return 'Precise ParkLink';
      return undefined; // fall back to header detection (hotel name varies)
    },
    detect: [
      /\bmotel\b/i,
      /\bhotel\b/i,
      /\bhôtel\b/i,
      /\bauberge\b/i,
      /\binn\b/i,
      /\blodge\b/i,
      /\bparking\b/i,
      /\bstationnement\b/i,
      /\bindigo\b/i,
      /\bimpark\b/i,
      /\beasypark\b/i,
      /\bprecise\s*parklink\b/i,
    ],
    ignore: [
      ...IGNORE_PAYMENT_TAIL,
      /\broom\s*#?\s*\d/i,
      /\bchambre\s*#?\s*\d/i,
      /\bcheck.?in\b/i,
      /\bcheck.?out\b/i,
      /\barriv(ée|al)\b/i,
      /\bdépart\b/i,
      /\bnights?\b/i,
      /\bnuits?\b/i,
      /\bdur(ation|ée)\b/i,
      /\bentry\b|\bexit\b/i,
    ],
  },
];

const DEFAULT_PROFILE_ID = 'DEFAULT';
const DEFAULT_PROFILE_LABEL = 'Générique / Generic';

export const detectStoreProfile = (text: string): StoreProfile | null => {
  // Match against the first ~15 lines (header region) preferentially, but allow
  // anywhere in the text as fallback (some receipts print the store name in the
  // footer for franchises like Couche-Tard).
  const header = text.split('\n').slice(0, 15).join('\n');
  for (const p of STORE_PROFILES) {
    if (p.detect.some(rx => rx.test(header))) return p;
  }
  for (const p of STORE_PROFILES) {
    if (p.detect.some(rx => rx.test(text))) return p;
  }
  return null;
};

const applyIgnore = (text: string, patterns?: RegExp[]): string => {
  if (!patterns || patterns.length === 0) return text;
  return text
    .split('\n')
    .filter(line => !patterns.some(rx => rx.test(line)))
    .join('\n');
};

const mergeTruthy = (base: PartialFields, over: PartialFields): PartialFields => ({
  subtotal: over.subtotal || base.subtotal,
  tps: over.tps || base.tps,
  tvq: over.tvq || base.tvq,
  tvh: over.tvh || base.tvh,
  tip: over.tip || base.tip,
  total: over.total || base.total,
  noTax: over.noTax ?? base.noTax,
});

/**
 * Heuristic supplier name extractor for the DEFAULT profile (and as fallback
 * for multi-brand profiles whose `supplier()` returned undefined). Picks the
 * first non-noise header line, cleans OCR garbage, and Title-Cases it.
 */
const SUPPLIER_NOISE = /receipt|reçu|facture|invoice|bill|copy|copie|merci|thank\s*you|welcome|bienvenue|tps|tvq|tvh|gst|hst|qst|sous[\-\s]?total|subtotal|total|montant|amount|paiement|payment|cash|comptant|debit|d[ée]bit|credit|cr[ée]dit|visa|mastercard|interac|amex|approved|approuv[ée]|terminal|transaction|caisse|cashier|caissier|operator|store|magasin|mall|centre|tel\.|t[ée]l|www\.|http|address|adresse|québec|quebec|ontario|canada|qc\b|on\b|nb\b|ns\b/i;

const extractSupplierFromHeader = (text: string): string | undefined => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Look at the first ~8 lines: receipts almost always print the merchant name there.
  for (const raw of lines.slice(0, 8)) {
    // Strip non-letter junk so all-symbol lines (barcodes, dashes) skip
    const letters = raw.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 3) continue;
    if (/\d{4,}/.test(raw)) continue;        // long digit runs = phone/store-id/postal
    if (SUPPLIER_NOISE.test(raw)) continue;
    // Drop trailing punctuation, normalize whitespace, Title Case mostly-uppercase shouting
    const cleaned = raw.replace(/[^\p{L}\p{N}\s&'\-.]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const upperRatio = cleaned.replace(/[^A-Za-z]/g, '').split('').filter(c => c === c.toUpperCase()).length /
                       Math.max(1, cleaned.replace(/[^A-Za-z]/g, '').length);
    const out = upperRatio > 0.7
      ? cleaned.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase())
      : cleaned;
    return out.length > 60 ? out.slice(0, 60).trim() : out;
  }
  return undefined;
};

/**
 * Top-level entry point. Detects the store, filters retailer-specific noise,
 * runs the generic parser, then layers any profile-specific overrides.
 */
export const parseReceipt = (text: string, ctx: ParseContext = {}): ParsedReceipt => {
  console.log('[OCR raw text]:', text);
  const profile = detectStoreProfile(text);
  const profileId = profile?.id ?? DEFAULT_PROFILE_ID;
  const profileLabel = profile?.label ?? DEFAULT_PROFILE_LABEL;
  console.log('[OCR profile detected]:', profileId);

  const cleaned = profile ? applyIgnore(text, profile.ignore) : text;
  const base = parseGeneric(cleaned, ctx);
  const overrides = profile?.override ? profile.override(cleaned, ctx, base) : {};
  const merged = mergeTruthy(base, overrides);

  // Supplier resolution: profile-supplied name first, then generic header heuristic.
  let supplier = '';
  if (profile?.supplier) {
    supplier = (typeof profile.supplier === 'function'
      ? profile.supplier(text)
      : profile.supplier) ?? '';
  }
  if (!supplier) {
    supplier = extractSupplierFromHeader(text) ?? '';
  }

  return {
    subtotal: merged.subtotal ?? '',
    tps: merged.tps ?? '',
    tvq: merged.tvq ?? '',
    tvh: merged.tvh ?? '',
    tip: merged.tip ?? '',
    total: merged.total ?? '',
    noTax: merged.noTax ?? false,
    supplier,
    profileId,
    profileLabel,
  };
};

/** Canadian tax rates by province code — used for client-side auto-calc.
 * An entry with an empty object ({}) means the province is explicitly non-taxable. */
export const PROVINCE_TAXES: Record<string, { tps?: number; tvq?: number; tvh?: number }> = {
  QC:          { tps: 0.05,  tvq: 0.09975 },
  'NON TAX-QC': {},                               // QC — Non-taxable
  ON: { tvh: 0.13 },
  NS: { tvh: 0.15 },
  NB: { tvh: 0.15 },
  NL: { tvh: 0.15 },
  PE: { tvh: 0.15 },
  AB: { tps: 0.05 },
  BC: { tps: 0.05 },
  MB: { tps: 0.05 },
  SK: { tps: 0.05 },
  NT: { tps: 0.05 },
  NU: { tps: 0.05 },
  YT: { tps: 0.05 },
};
