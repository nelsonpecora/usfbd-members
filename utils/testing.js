const { addYears, isAfter } = require('date-fns');
const { parseFuzzyDate } = require('./date');

const SHODAN = 'SHODAN';
const NIDAN = 'NIDAN';
const SANDAN = 'SANDAN';
const YONDAN = 'YONDAN';
const GODAN = 'GODAN';

const eligibility = {
  MUDAN: {
    next: SHODAN
  },
  SHODAN: {
    years: 1,
    seminars: 3,
    next: NIDAN
  },
  NIDAN: {
    years: 1,
    seminars: 6,
    next: SANDAN
  },
  SANDAN: {
    years: 2,
    seminars: 10,
    taikai: 2,
    next: YONDAN
  },
  YONDAN: {
    years: 3,
    seminars: 14,
    taikai: 3,
    next: GODAN
  },
  GODAN: {
    years: 4,
    seminars: 16
    // No next rank
  },
  ROKUDAN: {
    // No info here
  }
};

function isEligibleToTest (member, today = new Date()) {
  const memberRank = member.currentRank.toUpperCase();
  const rawLastDate = member.ranks?.[0]?.date || member.joined;

  // If we don't know any date info, we can't tell folks they're eligible to test
  if (!rawLastDate) return false;

  const lastDate = parseFuzzyDate(rawLastDate);
  const nextRank = eligibility[memberRank].next;

  // Member is already yondan, they'll know when they're ready
  if (!nextRank) return false;

  const { years, seminars, taikai } = eligibility[nextRank];

  let yearsOk = false;
  let seminarsOk = false;
  let taikaiOk = !taikai;

  if (isAfter(today, addYears(lastDate.val, years))) {
    yearsOk = true;
  }

  if ((member.seminars?.length || 0) >= seminars) {
    seminarsOk = true;
  }

  if ((member.taikai?.length || 0) >= (taikai || 0)) {
    taikaiOk = true;
  }

  return yearsOk && seminarsOk && taikaiOk;
}

module.exports.isEligibleToTest = isEligibleToTest;
