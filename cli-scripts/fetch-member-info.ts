import type {
  GoogleSpreadsheetRow,
  GoogleSpreadsheet as GoogleSpreadsheetType,
} from "google-spreadsheet";
import type { Rank, TaikaiWin } from "../src/utils/member-types";

import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { parse, parseISO, isAfter, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import pluralize from "pluralize";

// Types used when fetching data from Google sheets.
// These get parsed and formatted as RawMemberData when saving YAML files.
type SeminarEntry = {
  name: string | null;
  date: string | null;
  location?: string;
  instructor?: string;
};

type TaikaiEntry = {
  name: string;
  date: string | null;
  location?: string;
  wins: TaikaiWin[];
};

type TestEntry = {
  name: string | null;
  date: string | null;
};

type MemberSeminarInfo = {
  seminars: SeminarEntry[];
  taikai: TaikaiEntry[];
  testing: TestEntry[];
};

type BasicMember = {
  id: string;
  firstName: string;
  lastName: string;
  joined: string | null;
  dojo: string | null;
  manualCurrentRank?: string;
  isExemptFromDues?: boolean;
  isActive?: boolean;
  ranks: Rank[];
  seminars?: SeminarEntry[];
  taikai?: TaikaiEntry[];
};

type MissingId = {
  id?: string;
  firstName?: string;
  lastName?: string;
  dojo?: string | null;
};

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

function makeAuth() {
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function getCell(
  row: GoogleSpreadsheetRow,
  cellName: string | number,
  fallback: string | null = null,
): string | null {
  const rawCell = row.get(String(cellName)) as string | undefined;

  return rawCell ? rawCell.trim() : fallback;
}

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

export function getCurrentRank(rankNo: string | null): string | null {
  switch (rankNo) {
    case "0":
      return null;
    case "1":
      return "Shodan";
    case "2":
      return "Nidan";
    case "3":
      return "Sandan";
    case "4":
      return "Yondan";
    case "5":
      return "Godan";
    case "6":
      return "Rokudan";
    default:
      return null;
  }
}

type RankInputs = {
  shodan: string | null;
  nidan: string | null;
  sandan: string | null;
  yondan: string | null;
  godan: string | null;
  rokudan: string | null;
};

export function getRanks({ shodan, nidan, sandan, yondan, godan, rokudan }: RankInputs): Rank[] {
  const ranks: Rank[] = [];

  if (shodan) {
    ranks.push({ name: "Shodan", date: parseDate(shodan) });
  }

  if (nidan) {
    ranks.push({ name: "Nidan", date: parseDate(nidan) });
  }

  if (sandan) {
    ranks.push({ name: "Sandan", date: parseDate(sandan) });
  }

  if (yondan) {
    ranks.push({ name: "Yondan", date: parseDate(yondan) });
  }

  if (godan) {
    ranks.push({ name: "Godan", date: parseDate(godan) });
  }

  if (rokudan) {
    ranks.push({ name: "Rokudan", date: parseDate(rokudan) });
  }

  return ranks;
}

export async function getBasicInfo(doc: GoogleSpreadsheetType): Promise<{
  basicInfo: Record<string, BasicMember>;
  missingIds: MissingId[];
}> {
  const mainSheet = doc.sheetsByTitle["Root"];
  const paymentSheet = doc.sheetsByTitle["Member Payment History"];

  const mainRows = await mainSheet.getRows();
  const paymentRows = await paymentSheet.getRows();

  // We generate a CSV of members with missing member numbers.
  const missingIds: MissingId[] = [];
  // We get basic info for each member, keyed by their member number (id).
  const basicInfo = mainRows.reduce(
    (acc: Record<string, BasicMember>, row: GoogleSpreadsheetRow) => {
      const id = getCell(row, "Member ID");
      const firstName = getCell(row, "First Name");
      const lastName = getCell(row, "Last Name");

      // If the row is completely empty, disregard it.
      if (!id && !firstName && !lastName) return acc;

      try {
        const joined = getCell(row, "Activation Date");
        const dojo = getCell(row, "School Name");
        // When figuring out member rank, we first look in their rank history,
        // which is generated from these columns.
        const shodan = getCell(row, "Shodan");
        const nidan = getCell(row, "Nidan");
        const sandan = getCell(row, "Sandan");
        const yondan = getCell(row, "Yondan");
        const godan = getCell(row, "Godan");
        const rokudan = getCell(row, "Rokudan");
        // If they don't have any dates for their ranks, we also attempt to
        // manually get their current rank from this column. These include older
        // members who tested for rank before we took records.
        const currentRank = getCurrentRank(getCell(row, "Current Rank"));
        // Certain members are exempt from dues. They are considered always active.
        const exemption = getCell(row, "Exemption");

        if (!id || Number.isNaN(parseInt(id))) {
          console.error(`No id for: ${firstName} ${lastName}`);
          missingIds.push({
            firstName: firstName ?? undefined,
            lastName: lastName ?? undefined,
            dojo,
          });
          return acc;
        }

        if (!lastName) {
          console.error(`No last name for: ${firstName} (${id})`);
          missingIds.push({ firstName: firstName ?? undefined, id, dojo });
          return acc;
        }

        if (acc[id]) {
          // If the id already exists, we don't add the second person
          console.error(
            `Duplicate id for: ${firstName}  ${lastName} (${id}), is already ${acc[id].firstName} ${acc[id].lastName}`,
          );
          missingIds.push({
            firstName: firstName ?? undefined,
            lastName: lastName ?? undefined,
            id,
            dojo,
          });
          return acc;
        }

        acc[id] = {
          id,
          firstName: firstName!,
          lastName,
          joined: parseDate(joined),
          dojo,
          ...(currentRank && { manualCurrentRank: currentRank }),
          isExemptFromDues: exemption === "TRUE",
          ranks: getRanks({ shodan, nidan, sandan, yondan, godan, rokudan }),
        };
        return acc;
      } catch (e) {
        console.error(
          `Error parsing basic info for member "${firstName} ${lastName}" (${id}): ${(e as Error).message}`,
        );
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  // Once we have the basic info, we can parse the payments sheet to determine
  // if they're active members.
  const activeMembers = paymentRows.reduce(
    (acc: Record<string, boolean>, row: GoogleSpreadsheetRow) => {
      const id = getCell(row, "Member Number");

      try {
        const currentYear = new Date().getFullYear();
        const year = getCell(row, currentYear);

        if (!id) {
          // Ignore empty rows, the Totals row, and rows without any member number
          return acc;
        }

        // If there's anything in the cell (even "0" for folks who don't need to pay dues in a given year)
        // set them as active.
        acc[id] = year !== null;
        return acc;
      } catch (e) {
        console.error(`Error parsing activity for member "${id}": ${(e as Error).message}`);
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  // Set isActive on each member, based on the payment history
  // (and if they're exempt).
  const returnedInfo = Object.entries(basicInfo).reduce(
    (acc: Record<string, BasicMember>, [id, member]: [string, BasicMember]) => {
      let isActive = false;

      if (member.isExemptFromDues) {
        isActive = true;
      } else {
        isActive = !!activeMembers[id];
      }

      // Don't include this data in the generated yaml.
      delete member.isExemptFromDues;

      acc[id] = {
        ...member,
        isActive,
      };

      return acc;
    },
    {},
  );

  return {
    basicInfo: returnedInfo,
    missingIds,
  };
}

export function parseSeminar({
  event,
  date,
  note,
  instructor,
}: {
  event: string | null;
  date: string | null;
  note: string | null;
  instructor: string | null;
}): SeminarEntry {
  return {
    name: note,
    date,
    ...(event && { location: event }),
    ...(instructor && { instructor }),
  };
}

export function parseTaikaiWin(win: string): TaikaiWin {
  const [place, name] = win.split(":");

  return {
    place: parseInt(place.trim()),
    name: name.trim(),
  };
}

export function parseAndMergeTaikai(
  acc: TaikaiEntry[],
  {
    event,
    date,
    taikaiLocation,
    taikaiYear,
    win1,
    win2,
    win3,
    win4,
  }: {
    event: string | null;
    date: string | null;
    taikaiLocation: string | null;
    taikaiYear: string | null;
    win1: string | null;
    win2: string | null;
    win3: string | null;
    win4: string | null;
  },
): TaikaiEntry[] {
  const existingTaikai = acc.find((t) => {
    if (t.name !== event) return false;

    const tDate = new Date(t.date!);
    const tYear = tDate.getFullYear();

    if (tYear !== Number(taikaiYear)) return false;
    return true;
  });
  const wins: TaikaiWin[] = [];

  if (win1) wins.push(parseTaikaiWin(win1));
  if (win2) wins.push(parseTaikaiWin(win2));
  if (win3) wins.push(parseTaikaiWin(win3));
  if (win4) wins.push(parseTaikaiWin(win4));

  if (existingTaikai) {
    // If we've already added this taikai, just add wins
    existingTaikai.wins = existingTaikai.wins.concat(wins);
  } else {
    // Otherwise, add a new taikai
    acc.push({
      name: event!,
      date,
      ...(taikaiLocation && { location: taikaiLocation }),
      wins,
    });
  }

  return acc;
}

export function parseTest({ date, note }: { date: string | null; note: string | null }): TestEntry {
  return {
    name: note,
    date,
  };
}

export async function getSeminarInfo(
  doc: GoogleSpreadsheetType,
): Promise<Record<string, MemberSeminarInfo>> {
  const sheet = doc.sheetsByTitle["Sheet1"];
  const rows = await sheet.getRows();

  // We get seminar and taikai history for each member. Additonally,
  // we get testing history (which we can merge with their ranks in case
  // that data is missing from the member spreadsheet).
  const info = rows.reduce((acc: Record<string, MemberSeminarInfo>, row: GoogleSpreadsheetRow) => {
    const id = getCell(row, "Member Number");

    if (!id || id === "#N/A") {
      // Return early if the ID can't be parsed
      return acc;
    }

    try {
      const event = getCell(row, "Event"); // Either seminar location or taikai name
      const rawDate = getCell(row, "Date");
      const type = getCell(row, "Action");
      // Contains info on seminar name, rank for test
      const note = getCell(row, "Notes");
      const instructor = getCell(row, "Instructors");
      const isPassingTest = getCell(row, "Testing Pass/Fail", "")!.toLowerCase() === "yes";
      // Taikai specific fields
      const taikaiLocation = getCell(row, "Taikai Location");
      const taikaiYear = getCell(row, "Year"); // Used to disambiguate taikai
      const win1 = getCell(row, "Taikai Win1");
      const win2 = getCell(row, "Taikai Win2");
      const win3 = getCell(row, "Taikai Win3");
      const win4 = getCell(row, "Taikai Win4");
      const date = parseDate(rawDate);

      // Set up accumulator for a member
      acc[id] = acc[id] || {
        seminars: [],
        taikai: [],
        testing: [],
      };

      if (type === "Seminar Class") {
        acc[id].seminars.push(
          parseSeminar({
            event,
            date,
            note,
            instructor,
          }),
        );
      } else if (type === "Tournament") {
        acc[id].taikai = parseAndMergeTaikai(acc[id].taikai, {
          event,
          date,
          taikaiLocation,
          taikaiYear,
          win1,
          win2,
          win3,
          win4,
        });
      } else if (type === "Testing" && isPassingTest) {
        acc[id].testing.push(parseTest({ date, note }));
      }

      return acc;
    } catch (e) {
      console.error(`Error parsing seminar data for member ${id}: ${(e as Error).message}`);
      process.exit(1);
      return acc;
    }
  }, {});

  return info;
}

// https://docs.google.com/spreadsheets/d/1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo/edit#gid=218421591
async function loadMemberSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let memberSpreadsheet: GoogleSpreadsheetType;

  try {
    memberSpreadsheet = new GoogleSpreadsheet(
      "1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo",
      makeAuth(),
    );
    await memberSpreadsheet.loadInfo();
  } catch (e) {
    console.error(`Error accessing member spreadsheet: ${(e as Error).message}`);
    process.exit(1);
  }

  return memberSpreadsheet!;
}

// https://docs.google.com/spreadsheets/d/1WCKWlFMDnDGkq2ir4JBHKfP3Ufr3bhK-z67vDqWSzHA/edit#gid=0
async function loadSeminarSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let seminarSpreadsheet: GoogleSpreadsheetType;

  try {
    seminarSpreadsheet = new GoogleSpreadsheet(
      "1WCKWlFMDnDGkq2ir4JBHKfP3Ufr3bhK-z67vDqWSzHA",
      makeAuth(),
    );
    await seminarSpreadsheet.loadInfo();
  } catch (e) {
    console.error(`Error accessing seminar spreadsheet: ${(e as Error).message}`);
    process.exit(1);
  }

  return seminarSpreadsheet!;
}

export function mergeInfo(
  id: string,
  member: BasicMember,
  seminarInfo: Record<string, MemberSeminarInfo>,
): BasicMember {
  const memberSeminarInfo = seminarInfo[id];

  if (!memberSeminarInfo) {
    return member;
  }

  const { seminars, taikai, testing } = memberSeminarInfo;

  // Add seminars and taikai
  member.seminars = seminars;
  member.taikai = taikai;

  // Find any rank tests that are missing from the member data and add them
  testing.forEach((test) => {
    const existingRank = member.ranks.find((r) => r.name === test.name);

    if (!existingRank) {
      // If the rank isn't there, add it
      member.ranks.push({ name: test.name!, date: test.date });
    } else {
      // If the rank is already there, compare the dates and assume the OLDER
      // date is correct.
      const rankDate = parseISO(existingRank.date as string);
      const testDate = parseISO(test.date!);

      existingRank.date = isAfter(rankDate, testDate) ? test.date : existingRank.date;
    }
  });

  return member;
}

export async function main(): Promise<void> {
  console.log("Fetching member data...");
  const memberSpreadsheet = await loadMemberSpreadsheet();
  const seminarSpreadsheet = await loadSeminarSpreadsheet();

  // Get basic info from the 'USFBD Master Member List' spreadsheet.
  const { basicInfo, missingIds } = await getBasicInfo(memberSpreadsheet);

  // Get seminar and taikai info from the 'Seminar/Testing History' spreadsheet.
  const seminarInfo = await getSeminarInfo(seminarSpreadsheet);

  // Combine the info and write to yaml files.
  Object.entries(basicInfo).forEach(([id, member]) => {
    const combinedInfo = mergeInfo(id, member, seminarInfo);

    const memberYaml = yaml.dump(combinedInfo);

    try {
      fs.writeFileSync(path.join(ROOT, "src", "members", `${id}.yml`), memberYaml);
    } catch (e) {
      console.error(`Error writing yaml for member ${id}: ${(e as Error).message}`);
      process.exit(1);
    }
  });

  // Output missing ids into csv file.
  let missingFile = "id,firstName,lastName,dojo\n";

  missingIds.forEach(({ id, firstName, lastName, dojo }) => {
    missingFile += `${id || ""},${firstName || ""},${lastName || ""},${dojo || ""}\n`;
  });

  fs.writeFileSync(path.join(ROOT, "missing_ids.csv"), missingFile);

  const memberCount = Object.keys(basicInfo).length;
  const missingIdsCount = Object.keys(missingIds).length;

  console.log(`Generated yaml for ${memberCount} ${pluralize("member", memberCount)}`);
  console.log(
    `Generated missing_ids.csv for ${missingIdsCount} ${pluralize("member", missingIdsCount)}`,
  );
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
