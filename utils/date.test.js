const { parseFuzzyDate, formatFuzzyDate } = require('./date');
const { parseISO } = require('date-fns');

describe('date utils', () => {
  const date = parseISO('1970-01-01T00:00:00.000Z');
  const withDay = {
    hasYear: true,
    hasMonth: true,
    hasDay: true,
    val: date
  };
  const withMonth = {
    hasYear: true,
    hasMonth: true,
    hasDay: false,
    val: date
  };
  const withYear = {
    hasYear: true,
    hasMonth: false,
    hasDay: false,
    val: date
  };
  const formatDay = 'Jan 1st, 1970';
  const formatMonth = 'January 1970';
  const formatYear = '1970';

  describe('parseFuzzyDate', () => {
    it('parses yaml date object', () => {
      expect(parseFuzzyDate(date)).toEqual(withDay);
    });

    it('parses yaml string', () => {
      expect(parseFuzzyDate('1970-01')).toEqual(withMonth);
    });

    it('parses yaml number', () => {
      expect(parseFuzzyDate(1970)).toEqual(withYear);
    });

    it('throws error if invalid date', () => {
      expect(() => parseFuzzyDate('abc')).toThrow('Cannot parse date: "abc"');
    });
  });

  describe('formatFuzzyDate', () => {
    it('formates dates with days', () => {
      expect(formatFuzzyDate(withDay)).toEqual(formatDay);
    });

    it('formates dates with month', () => {
      expect(formatFuzzyDate(withMonth)).toEqual(formatMonth);
    });

    it('formates dates with year', () => {
      expect(formatFuzzyDate(withYear)).toEqual(formatYear);
    });
  });
});
