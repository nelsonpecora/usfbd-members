const { parseISO } = require('date-fns');
const { isEligibleToTest } = require('./testing');

describe('isEligibleToTest', () => {
  // Note: In the test data, seminars and taikai use mock values.
  // Instead of objects, they are just numbered lists for ease of reading.
  const currentDate = parseISO('2020-01-01T00:00:00.000Z');
  const lastYear = parseISO('2019-12-30T00:00:00.000Z');
  const overOneYearAgo = parseISO('2018-12-30T00:00:00.000Z');
  const overTwoYearsAgo = parseISO('2017-12-30T00:00:00.000Z');
  const overThreeYearsAgo = parseISO('2016-12-30T00:00:00.000Z');
  const overFourYearsAgo = parseISO('2015-12-30T00:00:00.000Z');

  it('returns false for godan', () => {
    expect(isEligibleToTest({
      currentRank: 'Godan',
      ranks: [{ date: currentDate }]
    })).toBe(false);
  });

  it('returns false for shodan if not enough years', () => {
    expect(isEligibleToTest({
      currentRank: 'Mudan',
      joined: lastYear,
      seminars: [1, 2, 3, 4, 5]
    }, currentDate)).toBe(false);
  });

  it('returns false for shodan if not enough seminars', () => {
    expect(isEligibleToTest({
      currentRank: 'Mudan',
      joined: overOneYearAgo,
      seminars: [1]
    }, currentDate)).toBe(false);
  });

  it('returns false for nidan if not enough years', () => {
    expect(isEligibleToTest({
      currentRank: 'Shodan',
      joined: overTwoYearsAgo,
      ranks: [{ date: lastYear }],
      seminars: [1, 2, 3, 4, 5, 6, 7]
    }, currentDate)).toBe(false);
  });

  it('returns false for nidan if not enough seminars', () => {
    expect(isEligibleToTest({
      currentRank: 'Shodan',
      joined: overTwoYearsAgo,
      ranks: [{ date: overTwoYearsAgo }],
      seminars: [1, 2, 3, 4, 5]
    }, currentDate)).toBe(false);
  });

  it('returns false for sandan if not enough taikai', () => {
    expect(isEligibleToTest({
      currentRank: 'Nidan',
      joined: overTwoYearsAgo,
      ranks: [{ date: overTwoYearsAgo }],
      seminars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      taikai: [1]
    }, currentDate)).toBe(false);
  });

  it('returns true for min shodan', () => {
    expect(isEligibleToTest({
      currentRank: 'Mudan',
      joined: overOneYearAgo,
      seminars: [1, 2, 3]
    }, currentDate)).toBe(true);
  });

  it('returns true for min nidan', () => {
    expect(isEligibleToTest({
      currentRank: 'Shodan',
      ranks: [{ date: overOneYearAgo }],
      seminars: [1, 2, 3, 4, 5, 6]
    }, currentDate)).toBe(true);
  });

  it('returns true for min sandan', () => {
    expect(isEligibleToTest({
      currentRank: 'Nidan',
      ranks: [{ date: overTwoYearsAgo }],
      seminars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      taikai: [1, 2]
    }, currentDate)).toBe(true);
  });

  it('returns true for min yondan', () => {
    expect(isEligibleToTest({
      currentRank: 'Sandan',
      ranks: [{ date: overThreeYearsAgo }],
      seminars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      taikai: [1, 2, 3]
    }, currentDate)).toBe(true);
  });

  it('returns true for min godan', () => {
    expect(isEligibleToTest({
      currentRank: 'Yondan',
      ranks: [{ date: overFourYearsAgo }],
      seminars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    }, currentDate)).toBe(true);
  });
});
