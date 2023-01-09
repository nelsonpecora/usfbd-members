const { isDate, parseISO } = require('date-fns');
const { format, utcToZonedTime } = require('date-fns-tz');

function parseFuzzyDate (val) {
  if (isDate(val)) {
    // Real date object from yaml. This happens when it's specified
    // as 'YYYY-MM-DD'
    return {
      hasYear: true,
      hasMonth: true,
      hasDay: true,
      val
    };
  }

  // If specified as 'YYYY-MM' it will be a string in yaml
  // If specified as 'YYYY' it will be a number in yaml
  // In both cases, convert to string
  const strVal = `${val}`;

  if (strVal.match(/\d{4}-\d{2}/)) {
    // YYYY-MM only
    return {
      hasYear: true,
      hasMonth: true,
      hasDay: false,
      val: parseISO(strVal + 'Z')
    };
  } else if (strVal.match(/\d{4}/)) {
    // YYYY only
    return {
      hasYear: true,
      hasMonth: false,
      hasDay: false,
      val: parseISO(strVal + 'Z')
    };
  } else {
    throw new Error(`Cannot parse date: "${val}"`);
  }
}

function formatFuzzyDate ({ hasMonth, hasDay, val }) {
  val = utcToZonedTime(val, 'UTC');

  if (hasDay) {
    return format(val, 'MMM do, yyyy');
  } else if (hasMonth) {
    return format(val, 'MMMM yyyy');
  } else {
    // Year only
    return format(val, 'yyyy');
  }
}

module.exports.parseFuzzyDate = parseFuzzyDate;
module.exports.formatFuzzyDate = formatFuzzyDate;
