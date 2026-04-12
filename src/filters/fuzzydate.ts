import { formatFuzzyDate } from "../scripts/fuzzy-dates";

export function fuzzydate(val: Date, hasYear = false, hasMonth = false, hasDay = false) {
  return formatFuzzyDate({ hasYear, hasMonth, hasDay, val });
}
