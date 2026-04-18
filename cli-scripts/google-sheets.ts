import type {
  GoogleSpreadsheetRow,
  GoogleSpreadsheet as GoogleSpreadsheetType,
} from "google-spreadsheet";

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { parseDate } from "./dates";
import { getCurrentRank, getRanks } from "./ranks";
import type { BasicMember, MemberSeminarInfo } from "./ranks";
import { parseSeminar, type SeminarEntry } from "./seminars";
import {
  parseAndMergeTaikai,
  parseAndMergeAdditionalTaikai,
  type TaikaiEntry,
} from "./taikai";
import { parseTest } from "./ranks";

export type MissingId = {
  id?: string;
  firstName?: string;
  lastName?: string;
  dojo?: string | null;
};

export function makeAuth() {
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

export async function getBasicInfo(doc: GoogleSpreadsheetType): Promise<{
  basicInfo: Record<string, BasicMember>;
  missingIds: MissingId[];
}> {
  const mainSheet = doc.sheetsByTitle["Root"];
  const paymentSheet = doc.sheetsByTitle["Member Payment History"];

  const mainRows = await mainSheet.getRows();
  const paymentRows = await paymentSheet.getRows();

  const missingIds: MissingId[] = [];
  const basicInfo = mainRows.reduce(
    (acc: Record<string, BasicMember>, row: GoogleSpreadsheetRow) => {
      const id = getCell(row, "Member ID");
      const firstName = getCell(row, "First Name");
      const lastName = getCell(row, "Last Name");

      if (!id && !firstName && !lastName) return acc;

      try {
        const joined = getCell(row, "Activation Date");
        const dojo = getCell(row, "School Name");
        const shodan = getCell(row, "Shodan");
        const nidan = getCell(row, "Nidan");
        const sandan = getCell(row, "Sandan");
        const yondan = getCell(row, "Yondan");
        const godan = getCell(row, "Godan");
        const rokudan = getCell(row, "Rokudan");
        const currentRank = getCurrentRank(getCell(row, "Current Rank"));
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

  const activeMembers = paymentRows.reduce(
    (acc: Record<string, boolean>, row: GoogleSpreadsheetRow) => {
      const id = getCell(row, "Member Number");

      try {
        const currentYear = new Date().getFullYear();
        const year = getCell(row, currentYear);

        if (!id) {
          return acc;
        }

        acc[id] = year !== null;
        return acc;
      } catch (e) {
        console.error(
          `Error parsing activity for member "${id}": ${(e as Error).message}`,
        );
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  const returnedInfo = Object.entries(basicInfo).reduce(
    (acc: Record<string, BasicMember>, [id, member]: [string, BasicMember]) => {
      let isActive = false;

      if (member.isExemptFromDues) {
        isActive = true;
      } else {
        isActive = !!activeMembers[id];
      }

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

export async function getSeminarInfo(
  doc: GoogleSpreadsheetType,
): Promise<Record<string, MemberSeminarInfo>> {
  const sheet = doc.sheetsByTitle["Sheet1"];
  const rows = await sheet.getRows();

  const info = rows.reduce(
    (acc: Record<string, MemberSeminarInfo>, row: GoogleSpreadsheetRow) => {
      const id = getCell(row, "Member Number");

      if (!id || id === "#N/A") {
        return acc;
      }

      try {
        const event = getCell(row, "Event");
        const rawDate = getCell(row, "Date");
        const type = getCell(row, "Action");
        const note = getCell(row, "Notes");
        const instructor = getCell(row, "Instructors");
        const isPassingTest =
          getCell(row, "Testing Pass/Fail", "")!.toLowerCase() === "yes";
        const taikaiLocation = getCell(row, "Taikai Location");
        const taikaiYear = getCell(row, "Year");
        const win1 = getCell(row, "Taikai Win1");
        const win2 = getCell(row, "Taikai Win2");
        const win3 = getCell(row, "Taikai Win3");
        const win4 = getCell(row, "Taikai Win4");
        const date = parseDate(rawDate);

        acc[id] = acc[id] || {
          seminars: [],
          taikai: [],
          testing: [],
        };

        if (type === "Seminar Class") {
          acc[id].seminars.push(
            parseSeminar({ event, date, note, instructor }),
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
        console.error(
          `Error parsing seminar data for member ${id}: ${(e as Error).message}`,
        );
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  return info;
}

export async function getAdditionalSeminarInfo(
  doc: GoogleSpreadsheetType,
): Promise<Record<string, SeminarEntry[]>> {
  const sheet = doc.sheetsByTitle["Form Responses 1"];
  const rows = await sheet.getRows();

  const info = rows.reduce(
    (acc: Record<string, SeminarEntry[]>, row: GoogleSpreadsheetRow) => {
      // Ignore any rows that have not been confirmed by the USFBD
      const confirmed = getCell(row, "Confirmed by USFBD");
      if (confirmed !== "TRUE") {
        return acc;
      }

      // Ignore any empty rows without a USFBD Member ID
      const id = getCell(row, "USFBD Member ID");

      if (!id) {
        return acc;
      }

      try {
        const event = getCell(row, "Seminar Name");
        const rawDate = getCell(row, "Seminar Date");
        const location = getCell(row, "Seminar Location (usually dojo name)");
        const instructor = getCell(row, "Seminar Instructor");
        const date = parseDate(rawDate);

        acc[id] = acc[id] || [];

        acc[id].push(parseSeminar({ event, date, note: location, instructor }));

        return acc;
      } catch (e) {
        console.error(
          `Error parsing seminar data for member ${id}: ${(e as Error).message}`,
        );
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  return info;
}

export async function getAdditionalTaikaiInfo(
  doc: GoogleSpreadsheetType,
): Promise<Record<string, TaikaiEntry[]>> {
  const sheet = doc.sheetsByTitle["Form Responses 1"];
  const rows = await sheet.getRows();

  const info = rows.reduce(
    (acc: Record<string, TaikaiEntry[]>, row: GoogleSpreadsheetRow) => {
      // Ignore any rows that have not been confirmed by the USFBD
      const confirmed = getCell(row, "Confirmed by USFBD");
      if (confirmed !== "TRUE") {
        return acc;
      }

      // Ignore any empty rows without a USFBD Member ID
      const id = getCell(row, "USFBD Member ID");

      if (!id) {
        return acc;
      }

      try {
        const event = getCell(row, "Taikai Name");
        const rawDate = getCell(row, "Taikai Date");
        const taikaiLocation = getCell(row, "Taikai Location");
        const taikaiEvent = getCell(row, "What was the event?");
        const taikaiPlace = getCell(row, "How did you place?");
        const date = parseDate(rawDate);

        acc[id] = acc[id] || [];

        acc[id] = parseAndMergeAdditionalTaikai(acc[id], {
          event,
          date,
          taikaiLocation,
          taikaiEvent,
          taikaiPlace,
        });

        return acc;
      } catch (e) {
        console.error(
          `Error parsing taikai data for member ${id}: ${(e as Error).message}`,
        );
        process.exit(1);
        return acc;
      }
    },
    {},
  );

  return info;
}

// https://docs.google.com/spreadsheets/d/1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo/edit#gid=218421591
export async function loadMemberSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let memberSpreadsheet: GoogleSpreadsheetType;

  try {
    memberSpreadsheet = new GoogleSpreadsheet(
      "1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo",
      makeAuth(),
    );
    await memberSpreadsheet.loadInfo();
  } catch (e) {
    console.error(
      `Error accessing member spreadsheet: ${(e as Error).message}`,
    );
    process.exit(1);
  }

  return memberSpreadsheet!;
}

// https://docs.google.com/spreadsheets/d/1WCKWlFMDnDGkq2ir4JBHKfP3Ufr3bhK-z67vDqWSzHA/edit#gid=0
export async function loadSeminarSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let seminarSpreadsheet: GoogleSpreadsheetType;

  try {
    seminarSpreadsheet = new GoogleSpreadsheet(
      "1WCKWlFMDnDGkq2ir4JBHKfP3Ufr3bhK-z67vDqWSzHA",
      makeAuth(),
    );
    await seminarSpreadsheet.loadInfo();
  } catch (e) {
    console.error(
      `Error accessing seminar spreadsheet: ${(e as Error).message}`,
    );
    process.exit(1);
  }

  return seminarSpreadsheet!;
}

// https://docs.google.com/spreadsheets/d/1IYnmim70tAS-EElV6kpKO-TqDTrOA5Ngz3RD6hsa5R0/edit?usp=sharing
export async function loadSeminarSubmissionSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let seminarSubmissionSpreadsheet: GoogleSpreadsheetType;

  try {
    seminarSubmissionSpreadsheet = new GoogleSpreadsheet(
      "1IYnmim70tAS-EElV6kpKO-TqDTrOA5Ngz3RD6hsa5R0",
      makeAuth(),
    );
    await seminarSubmissionSpreadsheet.loadInfo();
  } catch (e) {
    console.error(
      `Error accessing seminar submission spreadsheet: ${(e as Error).message}`,
    );
    process.exit(1);
  }

  return seminarSubmissionSpreadsheet!;
}

// https://docs.google.com/spreadsheets/d/1tFS50eilueZRANeeZizy08es4_yXxKkcQDeG6UOkefU/edit?usp=sharing
export async function loadTaikaiSubmissionSpreadsheet(): Promise<GoogleSpreadsheetType> {
  let taikaiSubmissionSpreadsheet: GoogleSpreadsheetType;

  try {
    taikaiSubmissionSpreadsheet = new GoogleSpreadsheet(
      "1tFS50eilueZRANeeZizy08es4_yXxKkcQDeG6UOkefU",
      makeAuth(),
    );
    await taikaiSubmissionSpreadsheet.loadInfo();
  } catch (e) {
    console.error(
      `Error accessing taikai submission spreadsheet: ${(e as Error).message}`,
    );
    process.exit(1);
  }

  return taikaiSubmissionSpreadsheet!;
}
