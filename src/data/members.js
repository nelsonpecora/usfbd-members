const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { isDate } = require('date-fns');

function sortDate (a, b) {
  // Lexical sort on dates, as they might just be months or years
  const aDate = isDate(a.date) ? a.date.toISOString() : `${a.date}`;
  const bDate = isDate(b.date) ? b.date.toISOString() : `${b.date}`;

  return bDate > aDate ? 1 : -1;
}

module.exports = () => {
  const members = fs.readdirSync(path.join(__dirname, 'members'));

  return members.reduce((acc, filepath) => {
    const id = path.basename(filepath, path.extname(filepath));
    const data = yaml.load(fs.readFileSync(path.join(__dirname, 'members', filepath)));

    if (id !== `${data.id}`) {
      throw new Error(`Cannot fetch member data for ${id}.yml! Member ID in the data is ${data.id}`);
    }

    const sortedRanks = data.ranks?.sort(sortDate) || [];
    const latestRank = sortedRanks?.[0]?.name;
    const manualCurrentRank = data.manualCurrentRank;
    let currentRank;

    if (latestRank) {
      currentRank = latestRank;
    } else if (manualCurrentRank) {
      currentRank = manualCurrentRank;
    } else {
      currentRank = 'Mudan';
    }

    acc.push({
      // Basic data
      ...data,
      // Computed fields
      name: `${data.firstName} ${data.lastName}`,
      currentRank,
      // Reverse ranks, seminars, taikai
      ranks: sortedRanks || [],
      seminars: data.seminars?.sort(sortDate) || [],
      taikai: data.taikai?.sort(sortDate).map((t) => ({ ...t, wins: t.wins || [] })) || []
    });
    return acc;
  }, []);
};
