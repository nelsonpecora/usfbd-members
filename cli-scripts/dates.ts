import { parse, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function parseDate(date: string | null): string | null {
  if (!date) {
    return null;
  }

  // Dates in the spreadsheet are specified as either M/D/YYYY or just YYYY
  let parsed: Date;

  if (date.match(/^\d{4}$/)) {
    parsed = parse(date, "yyyy", new Date());
  } else if (date.match(/\s/)) {
    // Dates that are copy-pasted directly from the signup form look like
    // '12/2/2023 23:39:30'
    parsed = parse(date.split(" ")[0], "M/d/yyyy", new Date());
  } else {
    parsed = parse(date, "M/d/yyyy", new Date());
  }

  return format(toZonedTime(parsed, "UTC"), "yyyy-MM-dd");
}
