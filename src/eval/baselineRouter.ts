/**
 * Keyword Baseline Router (Stage 4)
 * Represents a reasonably strong "today's approach" rule-based proxy router.
 * Features:
 * - Azerbaijani-aware normalization (az-locale lowercase, optional diacritic folding: ə→e, ı→i, ö→o, ü→u, ç→c, ş→s, ğ→g)
 * - Unicode-aware word boundary regexes (supports Cyrillic and Azerbaijani letters)
 * - At least 8 keyword/regex patterns per category covering Azerbaijani, Russian, and English
 * - Rule scoring and tie-breaking
 * - District extraction across Baku districts
 * - Routing to department via TELECOM_CATEGORIES
 */

import { CategoryId, District, Department } from "../types";
import { TELECOM_CATEGORIES } from "../sectors/telecom";

export interface BaselineRouteResult {
  category: CategoryId;
  district: District;
  department: Department;
  needs_manual_review: boolean;
  confidence: number;
  matched_rules: string[];
}

/**
 * Normalizes text for keyword matching.
 * Returns both locale-lowercased version and diacritic-folded version.
 */
export function normalizeForBaseline(text: string): { original: string; folded: string } {
  if (!text) return { original: "", folded: "" };
  const original = text.normalize("NFKC").toLocaleLowerCase("az").replace(/\s+/g, " ").trim();
  const folded = original
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g");
  return { original, folded };
}

/**
 * Helper to build Unicode-aware keyword regex that correctly handles
 * Azerbaijani letters (ə, ı, etc.), Russian Cyrillic, and English.
 */
function kw(patternStr: string): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${patternStr})(?:[^\\p{L}\\p{N}]|$)`, "iu");
}

interface CategoryRule {
  pattern: RegExp;
  label: string;
  weight: number;
}

// At least 8 keyword/regex rules per category covering AZ, RU, and EN
export const BASELINE_RULES: Record<CategoryId, CategoryRule[]> = {
  internet_outage: [
    { pattern: kw("internet\\s+k[eə]silib|internet\\s+yoxdur|optik\\s+k[eə]silib"), label: "az_internet_down", weight: 3 },
    { pattern: kw("modemd[eə]\\s+q[ıi]rm[ıi]z[ıi]|los\\s+(?:i[sş][ıi]q|yan[ıi]r)|q[ıi]rm[ıi]z[ıi]\\s+i[sş][ıi]q"), label: "az_los_red_light", weight: 3 },
    { pattern: kw("kabel\\s+q[ıi]r[ıi]l[ıi]b|optik\\s+x[eə]tt\\s+qopub|rabit[eə]\\s+tamamil[eə]\\s+itib"), label: "az_cable_cut", weight: 3 },
    { pattern: kw("internet\\s+i[sş]l[eə]mir|ba[gğ]lant[ıi]\\s+yoxdur"), label: "az_no_connection", weight: 2 },
    { pattern: kw("нет\\s+интернета|интернет\\s+пропал|интернет\\s+отключен"), label: "ru_no_internet", weight: 3 },
    { pattern: kw("красная\\s+лампочка|горит\\s+los|обрыв\\s+кабеля|обрыв\\s+оптики"), label: "ru_cable_los", weight: 3 },
    { pattern: kw("не\\s+работает\\s+интернет|полное\\s+отсутствие\\s+сети"), label: "ru_not_working", weight: 2 },
    { pattern: kw("internet\\s+(?:is\\s+)?down|no\\s+internet|total\\s+outage|red\\s+los\\s+light"), label: "en_outage_los", weight: 3 },
    { pattern: kw("fiber\\s+(?:cable\\s+)?cut|optical\\s+line\\s+broken|no\\s+connection"), label: "en_fiber_cut", weight: 3 },
  ],

  internet_slow_quality: [
    { pattern: kw("s[uü]r[eə]t\\s+(?:cox\\s+)?z[eə]if|s[uü]r[eə]t\\s+a[sş]a[gğ][ıi]|internet\\s+donur"), label: "az_speed_slow", weight: 3 },
    { pattern: kw("yava[sş]\\s+i[sş]l[eə]yir|video\\s+a[cç][ıi]lm[ıi]r|donmalar\\s+ba[sş]\\s+verir"), label: "az_buffering", weight: 2 },
    { pattern: kw("y[uü]ks[eə]k\\s+ping|ping\\s+[cç]ox|paket\\s+itkisi|packet\\s+loss"), label: "az_high_ping", weight: 3 },
    { pattern: kw("speedtest|s[uü]r[eə]t\\s+testi|mbps\\s+d[uü][sş][uü]b"), label: "az_speedtest_low", weight: 2 },
    { pattern: kw("низкая\\s+скорость|интернет\\s+тормозит|медленный\\s+интернет"), label: "ru_slow_speed", weight: 3 },
    { pattern: kw("высокий\\s+пинг|потери\\s+пакетов|видео\\s+лагает|зависает"), label: "ru_ping_lag", weight: 3 },
    { pattern: kw("скорость\\s+упала|страницы\\s+еле\\s+грузятся"), label: "ru_speed_drop", weight: 2 },
    { pattern: kw("slow\\s+internet|very\\s+slow\\s+speed|buffering|speed\\s+dropped"), label: "en_slow_speed", weight: 3 },
    { pattern: kw("high\\s+ping|packet\\s+loss|high\\s+latency|lagging\\s+connection"), label: "en_ping_lag", weight: 3 },
  ],

  fixed_phone_outage: [
    { pattern: kw("[sş][eə]h[eə]r\\s+telefonu|stasionar\\s+telefon|ev\\s+telefonu"), label: "az_fixed_phone_mention", weight: 2 },
    { pattern: kw("dudok\\s+g[eə]lmir|siqnal\\s+yoxdur|telefon\\s+x[eə]tti\\s+i[sş]l[eə]mir"), label: "az_no_dialtone", weight: 3 },
    { pattern: kw("telefon\\s+x[eə]ttind[eə]\\s+k[uü]y|ats\\s+x[eə]tti|dudok\\s+yoxdur"), label: "az_phone_static", weight: 3 },
    { pattern: kw("городской\\s+телефон|стационарный\\s+телефон|домашний\\s+телефон"), label: "ru_fixed_phone", weight: 2 },
    { pattern: kw("нет\\s+гудка|телефон\\s+не\\s+работает|шум\\s+в\\s+трубке|линия\\s+молчит"), label: "ru_no_dialtone", weight: 3 },
    { pattern: kw("кабель\\s+атс|отключен\\s+городской"), label: "ru_ats_cable", weight: 2 },
    { pattern: kw("landline|fixed\\s+phone|home\\s+phone|pstn\\s+line"), label: "en_fixed_phone", weight: 2 },
    { pattern: kw("no\\s+dial\\s+tone|phone\\s+line\\s+dead|static\\s+noise\\s+on\\s+line"), label: "en_no_dialtone", weight: 3 },
  ],

  mobile_service_quality: [
    { pattern: kw("mobil\\s+[sş][eə]b[eə]k[eə]|anten\\s+yoxdur|siqnal\\s+tutmur"), label: "az_no_cellular_bars", weight: 3 },
    { pattern: kw("4g\\s+i[sş]l[eə]mir|lte\\s+itir|mobil\\s+internet\\s+i[sş]l[eə]mir"), label: "az_4g_lte_issue", weight: 3 },
    { pattern: kw("dan[ıi][sş][ıi]q\\s+k[eə]silir|z[eə]ng\\s+[cç]atm[ıi]r|z[eə]ng\\s+q[ıi]r[ıi]l[ıi]r"), label: "az_call_drop", weight: 3 },
    { pattern: kw("нет\\s+мобильной\\s+связи|плохой\\s+сигнал\\s+сотовой|не\\s+ловит\\s+сеть"), label: "ru_cellular_poor", weight: 3 },
    { pattern: kw("4g\\s+не\\s+работает|lte\\s+пропадает|обрывается\\s+звонок"), label: "ru_drop_call_4g", weight: 3 },
    { pattern: kw("сим\\s+карта\\s+не\\s+ловит|слабый\\s+сигнал|нет\\s+антенны"), label: "ru_sim_signal", weight: 2 },
    { pattern: kw("no\\s+mobile\\s+signal|cellular\\s+coverage|weak\\s+reception|dropped\\s+call"), label: "en_cellular_reception", weight: 3 },
    { pattern: kw("4g\\s+lte\\s+not\\s+working|mobile\\s+data\\s+drops|no\\s+bars"), label: "en_mobile_data", weight: 3 },
  ],

  service_center_conduct: [
    { pattern: kw("xidm[eə]t\\s+m[eə]rk[eə]zi|filial|ofis[eə]|m[uü][sş]t[eə]ri\\s+xidm[eə]ti"), label: "az_branch_mention", weight: 2 },
    { pattern: kw("kobud\\s+r[eə]ftar|[eə]m[eə]kda[sş]\\s+h[oö]rm[eə]tsiz|t[eə]hqir|q[ıi][sş]q[ıi]rd[ıi]"), label: "az_rude_staff", weight: 3 },
    { pattern: kw("n[oö]vb[eə]d[eə]\\s+saatlarla|[eə]riz[eə]ni\\s+q[eə]bul\\s+etm[eə]di|ba[sş]dan\\s+el[eə]di"), label: "az_branch_queue_reject", weight: 3 },
    { pattern: kw("грубость|хамство|сотрудник\\s+отделения|в\\s+офисе\\s+нахамили"), label: "ru_rude_branch", weight: 3 },
    { pattern: kw("очередь\\s+в\\s+сервис|отказались\\s+обслуживать|невежливый\\s+персонал"), label: "ru_branch_conduct", weight: 3 },
    { pattern: kw("жалоба\\s+на\\s+работника|сервисный\\s+центр\\s+демотел"), label: "ru_staff_complaint", weight: 2 },
    { pattern: kw("rude\\s+staff|disrespectful\\s+agent|unprofessional\\s+employee"), label: "en_rude_staff", weight: 3 },
    { pattern: kw("service\\s+center\\s+branch|hours\\s+in\\s+queue|refused\\s+service"), label: "en_branch_queue", weight: 3 },
  ],

  tariff_billing: [
    { pattern: kw("balans(?:dan)?\\s+pul\\s+[cç][ıi]x[ıi]l[ıi]b|art[ıi]q\\s+pul\\s+tutulub|qanunsuz\\s+silinm[eə]"), label: "az_billing_overcharge", weight: 3 },
    { pattern: kw("tarif\\s+qiym[eə]ti|abun[eə]\\s+haqq[ıi]\\s+iki\\s+d[eə]f[eə]|hesab-faktura"), label: "az_tariff_fee", weight: 3 },
    { pattern: kw("[oö]d[eə]ni[sş]\\s+[cç]atmad[ıi]|pul\\s+k[oö][cç]m[eə]yib|borc\\s+d[uü]zg[uü]n\\s+deyil"), label: "az_payment_dispute", weight: 3 },
    { pattern: kw("списали\\s+деньги|лишнее\\s+списание|неправильный\\s+баланс"), label: "ru_billing_overcharge", weight: 3 },
    { pattern: kw("ошибка\\s+в\\s+тарифе|двойное\\s+списание|счет\\s+завышен|неверный\\s+долг"), label: "ru_tariff_double", weight: 3 },
    { pattern: kw("оплата\\s+не\\s+дошла|деньги\\s+не\\s+поступили"), label: "ru_payment_missing", weight: 3 },
    { pattern: kw("overcharged|incorrect\\s+balance|double\\s+charge|billing\\s+error"), label: "en_overcharged", weight: 3 },
    { pattern: kw("unexpected\\s+deduction|tariff\\s+dispute|unauthorized\\s+charge"), label: "en_unauthorized_fee", weight: 3 },
  ],

  number_portability: [
    { pattern: kw("n[oö]mr[eə]\\s+da[sş][ıi]nmas[ıi]|mnp|ba[sş]qa\\s+operatora\\s+ke[cç]id"), label: "az_mnp_mention", weight: 3 },
    { pattern: kw("da[sş][ıi]nma\\s+imtina|n[oö]mr[eə]mi\\s+k[oö][cç][uü]r[eə]\\s+bilmir[eə]m|portasiya"), label: "az_porting_stuck", weight: 3 },
    { pattern: kw("da[sş][ıi]nma\\s+statusu|n[oö]mr[eə]\\s+transferi"), label: "az_transfer_status", weight: 2 },
    { pattern: kw("перенос\\s+номера|mnp|смена\\s+оператора\\s+с\\s+сохранением"), label: "ru_mnp_porting", weight: 3 },
    { pattern: kw("отказ\\s+в\\s+переносе|не\\s+могу\\s+перенести\\s+номер|задержка\\s+портации"), label: "ru_mnp_delay", weight: 3 },
    { pattern: kw("заявка\\s+на\\s+перенос\\s+номера"), label: "ru_mnp_app", weight: 2 },
    { pattern: kw("number\\s+portability|port(?:ing)?\\s+my\\s+number|mnp\\s+request"), label: "en_porting", weight: 3 },
    { pattern: kw("transfer\\s+phone\\s+number|porting\\s+rejected|port\\s+delay"), label: "en_port_rejected", weight: 3 },
  ],

  other_unclear: [
    { pattern: kw("vakansiya|i[sş][eə]\\s+q[eə]bul|reklam|t[eə][sş][eə]kk[uü]r|salam"), label: "general_inquiry", weight: 1 },
    { pattern: kw("вакансия|работа|спасибо|благодарность|привет"), label: "ru_general_inquiry", weight: 1 },
    { pattern: kw("career|job\\s+application|thank\\s+you|general\\s+info"), label: "en_general_inquiry", weight: 1 },
  ],
};

// District Regex dictionary
const DISTRICT_PATTERNS: Array<{ district: District; pattern: RegExp }> = [
  { district: "Binəqədi", pattern: kw("bin[eə]q[eə]di|binegedi|bil[eə]c[eə]ri|m[eə]h[eə]mm[eə]di") },
  { district: "Nərimanov", pattern: kw("n[eə]rimanov|narimanov|montin") },
  { district: "Nəsimi", pattern: kw("n[eə]simi|nasimi|28\\s+may|kubinka") },
  { district: "Nizami", pattern: kw("nizami|neft[cç]il[eə]r|qara\\s+qarayev|ke[sş]l[eə]") },
  { district: "Pirallahı", pattern: kw("pirallah[ıi]|artyom") },
  { district: "Sabunçu", pattern: kw("sabun[cç]u|sabunchu|bak[ıi]xanov|ma[sş]ta[gğ]a|zabrat") },
  { district: "Səbail", pattern: kw("s[eə]bail|sabail|badamdar|bay[ıi]l|i[cç][eə]ri[sş][eə]h[eə]r") },
  { district: "Suraxanı", pattern: kw("suraxan[ıi]|surakhani|qara[cç]uxur|yeni\\s+g[uü]n[eə][sş]li|hovsan") },
  { district: "Xətai", pattern: kw("x[eə]tai|khatai|əhm[eə]dli|h[eə]zi\\s+aslanov|k[oö]hn[eə]\\s+g[uü]n[eə][sş]li") },
  { district: "Xəzər", pattern: kw("x[eə]z[eə]r|khazar|m[eə]rd[eə]kan|buzovna|bin[eə]|[sş][uü]v[eə]lan") },
  { district: "Yasamal", pattern: kw("yasamal|in[sş]aat[cç][ıi]lar|elml[eə]r|yeni\\s+yasamal") },
  { district: "Qaradağ", pattern: kw("qarada[gğ]|l[oö]kbatan|sahil|puta") },
  { district: "Abşeron–Xırdalan", pattern: kw("ab[sş]eron|x[ıi]rdalan|khirdalan|masaz[ıi]r|saray") },
  { district: "Saatlı", pattern: kw("saatl[ıi]|saatli") },
];

/**
 * Executes the Keyword Baseline Router on a single complaint text.
 */
export function routeWithBaseline(text: string): BaselineRouteResult {
  const { original, folded } = normalizeForBaseline(text);
  const matchedRules: string[] = [];

  const scores: Record<CategoryId, number> = {
    internet_outage: 0,
    internet_slow_quality: 0,
    fixed_phone_outage: 0,
    mobile_service_quality: 0,
    service_center_conduct: 0,
    tariff_billing: 0,
    number_portability: 0,
    other_unclear: 0,
  };

  const categories = Object.keys(BASELINE_RULES) as CategoryId[];
  for (const cat of categories) {
    const rules = BASELINE_RULES[cat] || [];
    for (const rule of rules) {
      if (rule.pattern.test(original) || rule.pattern.test(folded)) {
        scores[cat] += rule.weight;
        matchedRules.push(`${cat}:${rule.label}`);
      }
    }
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory: CategoryId = "other_unclear";
  let tieCount = 0;

  for (const cat of categories) {
    if (cat === "other_unclear") continue;
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      bestCategory = cat;
      tieCount = 1;
    } else if (scores[cat] === maxScore && maxScore > 0) {
      tieCount++;
    }
  }

  // Disambiguation / fallback
  let needsManual = false;
  if (maxScore === 0) {
    bestCategory = "other_unclear";
    needsManual = true;
  } else if (tieCount > 1) {
    // Ambiguous tie between multiple categories -> route to manual review
    bestCategory = "other_unclear";
    needsManual = true;
  }

  // Extract district
  let detectedDistrict: District = "unknown";
  for (const distRule of DISTRICT_PATTERNS) {
    if (distRule.pattern.test(original) || distRule.pattern.test(folded)) {
      detectedDistrict = distRule.district;
      break;
    }
  }

  const department = TELECOM_CATEGORIES[bestCategory]?.department || "Manual Review";
  const confidence = maxScore >= 6 ? 0.9 : maxScore >= 3 ? 0.75 : maxScore > 0 ? 0.6 : 0.2;

  return {
    category: bestCategory,
    district: detectedDistrict,
    department,
    needs_manual_review: needsManual,
    confidence,
    matched_rules: matchedRules,
  };
}
