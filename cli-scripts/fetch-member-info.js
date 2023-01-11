require('dotenv').config();

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parse } = require('date-fns');
const { format, utcToZonedTime } = require('date-fns-tz');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const pluralize = require('pluralize');

function getCell (row, cellName) {
  const rawCell = row[cellName];

  return rawCell ? rawCell.trim() : null;
}

function parseDate (date) {
  if (!date) {
    return null;
  }

  // Dates in the spreadsheet are specified as either M/D/YYYY or just YYYY
  let parsed;

  if (date.match(/^\d{4}$/)) {
    parsed = parse(date, 'yyyy', new Date());
  } else {
    parsed = parse(date, 'M/d/yyyy', new Date());
  }

  return format(utcToZonedTime(parsed, 'UTC'), 'yyyy-MM-dd');
}

function getCurrentRank (rankNo) {
  switch (rankNo) {
    case '0': return null;
    case '1': return 'Shodan';
    case '2': return 'Nidan';
    case '3': return 'Sandan';
    case '4': return 'Yondan';
    case '5': return 'Godan';
    case '6': return 'Rokudan';
  }
}

function getRanks ({ shodan, nidan, sandan, yondan, godan, rokudan }) {
  const ranks = [];

  if (shodan) {
    ranks.push({ name: 'Shodan', date: parseDate(shodan) });
  }

  if (nidan) {
    ranks.push({ name: 'Nidan', date: parseDate(nidan) });
  }

  if (sandan) {
    ranks.push({ name: 'Sandan', date: parseDate(sandan) });
  }

  if (yondan) {
    ranks.push({ name: 'Yondan', date: parseDate(yondan) });
  }

  if (godan) {
    ranks.push({ name: 'Godan', date: parseDate(godan) });
  }

  if (rokudan) {
    ranks.push({ name: 'Rokudan', date: parseDate(rokudan) });
  }

  return ranks;
}

async function getBasicInfo (doc) {
  const mainSheet = doc.sheetsByTitle.Root;
  const paymentSheet = doc.sheetsByTitle['Member Payment History'];

  const mainRows = await mainSheet.getRows();
  const paymentRows = await paymentSheet.getRows();

  // We generate a CSV of members with missing member numbers.
  const missingIds = [];
  // We get basic info for each member, keyed by their member number (id).
  const basicInfo = mainRows.reduce((acc, row) => {
    const id = getCell(row, 'Member ID');
    const firstName = getCell(row, 'First Name');
    const lastName = getCell(row, 'Last Name');

    try {
      const joined = getCell(row, 'Activation Date');
      const dojo = getCell(row, 'School Name');
      // We do NOT save member emails to yaml, but we use them to match against
      // the payment history.
      const email = getCell(row, 'Email Address');
      // When figuring out member rank, we first look in their rank history,
      // which is generated from these columns.
      const shodan = getCell(row, 'Shodan');
      const nidan = getCell(row, 'Nidan');
      const sandan = getCell(row, 'Sandan');
      const yondan = getCell(row, 'Yondan');
      const godan = getCell(row, 'Godan');
      const rokudan = getCell(row, 'Rokudan');
      // If they don't have any dates for their ranks, we also attempt to
      // manually get their current rank from this column. These include older
      // members who tested for rank before we took records.
      const currentRank = getCurrentRank(getCell(row, 'Current Rank'));
      // Certain members are exempt from dues. They are considered always active.
      const exemption = getCell(row, 'Exemption');

      if (!id) {
        console.error(`No id for: ${firstName} ${lastName}`);
        missingIds.push({ firstName, lastName, dojo });
        return acc;
      }

      if (!lastName) {
        console.error(`No last name for: ${firstName} (${id})`);
        missingIds.push({ firstName, id, dojo });
        return acc;
      }

      acc[id] = {
        id,
        firstName,
        lastName,
        joined: parseDate(joined),
        dojo,
        email,
        ...currentRank && { manualCurrentRank: currentRank },
        isExemptFromDues: exemption === 'TRUE',
        ranks: getRanks({ shodan, nidan, sandan, yondan, godan, rokudan })
      };
      return acc;
    } catch (e) {
      console.error(`Error parsing data for member "${firstName} ${lastName}" (${id}): ${e.message}`);
      process.exit(1);
    }
  }, {});

  // Once we have the basic info, we can parse the payments sheet to determine
  // if they're active members.
  const activeMembers = paymentRows.reduce((acc, row) => {
    const email = getCell(row, 'Email');

    try {
      const currentYear = (new Date()).getFullYear();
      const year = getCell(row, currentYear);

      if (!email) {
        // Ignore empty rows and the Totals row.
        return acc;
      }

      acc[email] = !!year;
      return acc;
    } catch (e) {
      console.error(`Error parsing activity for member "${email}": ${e.message}`);
      process.exit(1);
    }
  }, {});

  // Set isActive on each member, based on the payment history
  // (and if they're exempt).
  return Object.entries(basicInfo).reduce((acc, [id, member]) => {
    let isActive = false;

    if (member.isExemptFromDues) {
      isActive = true;
    } else {
      isActive = !!activeMembers[member.email];
    }

    // Don't include this data in the generated yaml.
    delete member.email;
    delete member.isExemptFromDues;

    acc[id] = {
      ...member,
      isActive
    };

    return acc;
  }, {});
}

async function main () {
  console.log('Fetching member data...');
  let memberSpreadsheet;

  try {
    memberSpreadsheet = new GoogleSpreadsheet('1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo');

    await memberSpreadsheet.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });

    await memberSpreadsheet.loadInfo();
  } catch (e) {
    console.error(`Error accessing member spreadsheet: ${e.message}`);
    process.exit(1);
  }

  // Get basic info from the 'USFBD Member List.xlsx' spreadsheet.
  const basicInfo = await getBasicInfo(memberSpreadsheet);

  // TODO: Get seminar and taikai info from the 'Seminar/Testing History' spreadsheet.

  // Combine the info and write to yaml files.
  Object.entries(basicInfo).forEach(([id, member]) => {
    const memberYaml = yaml.dump(member);

    try {
      fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'members', `${id}.yml`), memberYaml);
    } catch (e) {
      console.error(`Error writing yaml for member ${id}: ${e.message}`);
      process.exit(1);
    }
  });

  const memberCount = Object.keys(basicInfo).length;

  console.log(`Generated yaml for ${memberCount} ${pluralize('member', memberCount)}`);
}

main();
