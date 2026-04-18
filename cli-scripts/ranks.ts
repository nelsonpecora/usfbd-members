import { parseISO, isAfter } from "date-fns";
import type { Rank } from "../src/utils/member-types";
import { parseDate } from "./dates";
import type { SeminarEntry } from "./seminars";
import type { TaikaiEntry } from "./taikai";

export type TestEntry = {
  name: string | null;
  date: string | null;
};

export type MemberSeminarInfo = {
  seminars: SeminarEntry[];
  taikai: TaikaiEntry[];
  testing: TestEntry[];
};

export type BasicMember = {
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

export type RankInputs = {
  shodan: string | null;
  nidan: string | null;
  sandan: string | null;
  yondan: string | null;
  godan: string | null;
  rokudan: string | null;
};

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

export function getRanks({
  shodan,
  nidan,
  sandan,
  yondan,
  godan,
  rokudan,
}: RankInputs): Rank[] {
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

export function parseTest({
  date,
  note,
}: {
  date: string | null;
  note: string | null;
}): TestEntry {
  return {
    name: note,
    date,
  };
}

export function deduplicateTaikai(
  taikai: TaikaiEntry[],
  additionalTaikaiInfo: TaikaiEntry[],
): TaikaiEntry[] {
  const merged = new Map<string, TaikaiEntry>();

  for (const entry of [...taikai, ...additionalTaikaiInfo]) {
    const existing = merged.get(entry.name);

    if (existing) {
      const existingWinNames = new Set(existing.wins.map((w) => w.name));
      const newWins = entry.wins.filter((w) => !existingWinNames.has(w.name));
      existing.wins = [...existing.wins, ...newWins].sort(
        (a, b) => (a.place ?? Infinity) - (b.place ?? Infinity),
      );
    } else {
      merged.set(entry.name, {
        ...entry,
        wins: [...entry.wins].sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity)),
      });
    }
  }

  return Array.from(merged.values());
}

export function mergeInfo(
  id: string,
  member: BasicMember,
  seminarInfo: Record<string, MemberSeminarInfo>,
  additionalSeminarInfo: Record<string, SeminarEntry[]>,
  additionalTaikaiInfo: Record<string, TaikaiEntry[]>,
): BasicMember {
  const memberSeminarInfo = seminarInfo[id];
  const memberAdditionalSeminarInfo = additionalSeminarInfo[id];
  const memberAdditionalTaikaiInfo = additionalTaikaiInfo[id];

  if (!memberSeminarInfo) {
    return member;
  }

  const { seminars, taikai, testing } = memberSeminarInfo;

  member.seminars = seminars;
  member.taikai = taikai;

  // If the member has submitted additional seminar or taikai info, merge it into the member data
  if (memberAdditionalSeminarInfo) {
    member.seminars = [...member.seminars, ...memberAdditionalSeminarInfo];
  }
  member.seminars = member.seminars.sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );

  if (memberAdditionalTaikaiInfo) {
    member.taikai = deduplicateTaikai(
      member.taikai,
      memberAdditionalTaikaiInfo,
    );
  }
  member.taikai = member.taikai.sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );

  // Find any rank tests that are missing from the member data and add them
  testing.forEach((test) => {
    const existingRank = member.ranks.find((r) => r.name === test.name);

    if (!existingRank) {
      member.ranks.push({ name: test.name!, date: test.date });
    } else {
      // If the rank is already there, compare the dates and assume the OLDER date is correct.
      const rankDate = parseISO(existingRank.date as string);
      const testDate = parseISO(test.date!);

      existingRank.date = isAfter(rankDate, testDate)
        ? test.date
        : existingRank.date;
    }
  });

  return member;
}
