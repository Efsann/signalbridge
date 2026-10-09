/**
 * PII Masking utility
 * Runs before EVERY model call to guarantee user privacy.
 * Masks:
 * 1. Emails -> [EMAIL]
 * 2. FIN (Azerbaijan National ID) + 7 chars -> [ID]
 * 3. 13-19 digit sequences (payment cards) -> [CARD]
 * 4. Phone numbers (Azerbaijan mobile & fixed, international) -> [PHONE]
 */

export interface MaskResult {
  maskedText: string;
  hasMaskedData: boolean;
  counts: {
    email: number;
    id: number;
    card: number;
    phone: number;
  };
}

export function maskPII(rawText: string): MaskResult {
  if (!rawText) {
    return {
      maskedText: "",
      hasMaskedData: false,
      counts: { email: 0, id: 0, card: 0, phone: 0 },
    };
  }

  let text = rawText;
  let emailCount = 0;
  let idCount = 0;
  let cardCount = 0;
  let phoneCount = 0;

  // 1. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  text = text.replace(emailRegex, () => {
    emailCount++;
    return "[EMAIL]";
  });

  // 2. FIN codes: "FIN" followed by optional punctuation/whitespace and exactly 7 alphanumeric chars
  const finRegex = /\b(?:FIN|fin|Fin)[\s:№#-]*([A-Za-z0-9]{7})\b/g;
  text = text.replace(finRegex, () => {
    idCount++;
    return "[ID]";
  });

  // 3. Card sequences: 13-19 digits with optional spaces or hyphens
  // We match digit clusters where total digit count is between 13 and 19
  text = text.replace(
    /\b(?:\d[ -]*?){13,19}\b/g,
    (match) => {
      const pureDigits = match.replace(/\D/g, "");
      if (pureDigits.length >= 13 && pureDigits.length <= 19) {
        cardCount++;
        return "[CARD]";
      }
      return match;
    }
  );

  // 4. Phone numbers
  // Azerbaijani standard patterns:
  // +994 (50/51/55/70/77/99/10/12/etc) XXX XX XX
  // 050/051/055/070/077/099/010/012 XXX XX XX
  // 012-498-23-45
  // Also generic international format: +XXX XX XXX XX XX or similar
  const azPhoneRegex =
    /(?:\+?994[\s.-]*)?(?:\(?0?(?:12|50|51|55|70|77|99|10|60)\)?[\s.-]*)\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/g;

  text = text.replace(azPhoneRegex, () => {
    phoneCount++;
    return "[PHONE]";
  });

  // Generic secondary phone regex for 7-digit local Baku numbers or international numbers
  // e.g. 012-498-23-45, +1-800-555-0199, (012) 490 12 34
  const generalPhoneRegex =
    /(?:\+?\d{1,3}[\s.-]*)?(?:\(\d{2,4}\)[\s.-]*|\b0\d{2,3}[\s.-]*)\d{3}[\s.-]*\d{2,4}\b/g;

  text = text.replace(generalPhoneRegex, (match) => {
    // avoid re-replacing tags or isolated small numbers
    if (match.includes("[CARD]") || match.includes("[ID]") || match.includes("[EMAIL]")) {
      return match;
    }
    const pureDigits = match.replace(/\D/g, "");
    if (pureDigits.length >= 7 && pureDigits.length <= 15) {
      phoneCount++;
      return "[PHONE]";
    }
    return match;
  });

  // Standalone 7-digit local numbers with dashes e.g., 498-23-45
  const localBakuDashPhone = /\b\d{3}-\d{2}-\d{2}\b/g;
  text = text.replace(localBakuDashPhone, () => {
    phoneCount++;
    return "[PHONE]";
  });

  const hasMaskedData =
    emailCount > 0 || idCount > 0 || cardCount > 0 || phoneCount > 0;

  return {
    maskedText: text,
    hasMaskedData,
    counts: {
      email: emailCount,
      id: idCount,
      card: cardCount,
      phone: phoneCount,
    },
  };
}
