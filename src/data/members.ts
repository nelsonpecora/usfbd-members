import type { Member, Rank, Seminar, Taikai, TaikaiWin } from "../../utils/types";

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { isDate } from "date-fns";

type RawMemberData = {
  id: string | number;
  firstName: string;
  lastName: string;
  ranks?: Array<{ name: string; date: string | Date | null }>;
  manualCurrentRank?: string;
  seminars?: Seminar[];
  taikai?: Array<{
    name: string;
    date: string | null;
    location?: string;
    wins?: TaikaiWin[];
  }>;
};

type DateSortable = { date: string | Date | null };

function sortDate(a: DateSortable, b: DateSortable): number {
  // Lexical sort on dates, as they might just be months or years
  const aDate = isDate(a.date) ? (a.date as Date).toISOString() : `${a.date}`;
  const bDate = isDate(b.date) ? (b.date as Date).toISOString() : `${b.date}`;

  return bDate > aDate ? 1 : -1;
}

export default function getMembers(): Member[] {
  const members = fs.readdirSync(path.join(__dirname, "members"));

  return members.reduce((acc: Member[], filepath: string) => {
    const id = path.basename(filepath, path.extname(filepath));
    const data = yaml.load(
      fs.readFileSync(path.join(__dirname, "members", filepath), "utf8"),
    ) as RawMemberData;

    if (id !== `${data.id}`) {
      throw new Error(
        `Cannot fetch member data for ${id}.yml! Member ID in the data is ${data.id}`,
      );
    }

    const sortedRanks: Rank[] = data.ranks?.sort(sortDate) || [];
    const latestRank = sortedRanks?.[0]?.name;
    const manualCurrentRank = data.manualCurrentRank;
    let currentRank: string;

    if (latestRank) {
      currentRank = latestRank;
    } else if (manualCurrentRank) {
      currentRank = manualCurrentRank;
    } else {
      currentRank = "Mudan";
    }

    const sortedTaikai: Taikai[] = (data.taikai?.sort(sortDate) || []).map((t) => ({
      ...t,
      wins: t.wins || [],
    }));

    acc.push({
      // Basic data
      ...data,
      // Computed fields
      name: `${data.firstName} ${data.lastName}`,
      currentRank,
      isActive: false, // set by hashes.js consumer
      // Reverse ranks, seminars, taikai
      ranks: sortedRanks,
      seminars: data.seminars?.sort(sortDate) || [],
      taikai: sortedTaikai,
    });
    return acc;
  }, []);
}
