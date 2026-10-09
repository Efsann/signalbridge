/**
 * Normalization utilities for multilingual complaint text
 * Handles Azerbaijani (ə, ı, ö, ü, ç, ş, ğ), Russian (Cyrillic), and English.
 */

/**
 * Normalizes text for comparison and substring grounding checks.
 * Strips superfluous whitespace, normalizes Unicode decomposition,
 * and folds case while preserving Azerbaijani characters.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("az")
    .replace(/[\u2018\u2019`´]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips punctuation and excessive spaces for flexible substring checking.
 */
export function stripPunctuation(text: string): string {
  return normalizeText(text).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Validates whether an evidence phrase is grounded as a substring of the masked text.
 * Checks direct normalized match, or boundary-relaxed match.
 */
export function isEvidenceGrounded(evidencePhrase: string, maskedText: string): boolean {
  if (!evidencePhrase || !maskedText) return false;

  const normEvidence = normalizeText(evidencePhrase);
  const normMasked = normalizeText(maskedText);

  if (normEvidence.length === 0) return false;

  // Direct normalized substring check
  if (normMasked.includes(normEvidence)) {
    return true;
  }

  // Punctuation-stripped check if quotes or trailing dots caused minor discrepancy
  const cleanEvidence = stripPunctuation(evidencePhrase);
  const cleanMasked = stripPunctuation(maskedText);

  if (cleanEvidence.length > 2 && cleanMasked.includes(cleanEvidence)) {
    return true;
  }

  return false;
}
