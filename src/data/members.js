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
  const members = fs.readdirSync(__dirname).filter((filepath) => {
    // Ignore non-member files
    return path.extname(filepath) === '.yml' && !['dojos.yml'].includes(filepath);
  });

  return members.reduce((acc, filepath) => {
    const id = path.basename(filepath, path.extname(filepath));
    const data = yaml.load(fs.readFileSync(path.join(__dirname, filepath)));

    if (id !== `${data.id}`) {
      throw new Error(`Cannot fetch member data for ${id}.yml! Member ID in the data is ${data.id}`);
    }

    const sortedRanks = data.ranks.sort(sortDate);

    acc.push({
      // Basic data
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      joined: data.joined,
      dojo: data.dojo,
      // Computed fields
      name: `${data.firstName} ${data.lastName}`,
      currentRank: sortedRanks.length ? sortedRanks[0].name : 'Mudan',
      // Reverse ranks, seminars, taikai
      ranks: sortedRanks || [],
      seminars: data.seminars.sort(sortDate) || [],
      taikai: data.taikai.sort(sortDate).map((t) => ({ ...t, wins: t.wins || [] })) || []
    });
    return acc;
  }, []);
};
