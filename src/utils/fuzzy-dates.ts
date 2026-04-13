import { isDate, parseISO, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type FuzzyDate = {
  hasYear: boolean;
  hasMonth: boolean;
  hasDay: boolean;
  val: Date;
};

export function parseFuzzyDate(val: Date | string | number): FuzzyDate {
  if (isDate(val)) {
    return {
      hasYear: true,
      hasMonth: true,
      hasDay: true,
      val: val as Date,
    };
  }

  // If specified as 'YYYY-MM' it will be a string in yaml
  // If specified as 'YYYY' it will be a number in yaml
  // In both cases, convert to string
  const strVal = `${val}`;

  if (strVal.match(/\d{4}-\d{2}-\d{2}/)) {
    // YYYY-MM-DD (quoted in yaml)
    return {
      hasYear: true,
      hasMonth: true,
      hasDay: true,
      val: parseISO(strVal + "Z"),
    };
  } else if (strVal.match(/\d{4}-\d{2}/)) {
    // YYYY-MM only
    return {
      hasYear: true,
      hasMonth: true,
      hasDay: false,
      val: parseISO(strVal + "Z"),
    };
  } else if (strVal.match(/\d{4}/)) {
    // YYYY only
    return {
      hasYear: true,
      hasMonth: false,
      hasDay: false,
      val: parseISO(strVal + "Z"),
    };
  } else {
    throw new Error(`Cannot parse date: "${val}"`);
  }
}

export function formatFuzzyDate({ hasMonth, hasDay, val }: FuzzyDate): string {
  const zoned: Date = toZonedTime(val, "UTC");

  if (hasDay) {
    return format(zoned, "MMM do, yyyy");
  } else if (hasMonth) {
    return format(zoned, "MMMM yyyy");
  } else {
    // Year only
    return format(zoned, "yyyy");
  }
}
