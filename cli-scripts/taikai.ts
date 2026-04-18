import type { TaikaiWin } from "../src/utils/member-types";

/** Taikai entry as parsed from the Seminars and Taikai History spreadsheet */
type RawTaikaiEntry = {
  event: string | null;
  date: string | null;
  taikaiLocation: string | null;
  taikaiYear: string | null;
  win1: string | null;
  win2: string | null;
  win3: string | null;
  win4: string | null;
};

export type TaikaiEntry = {
  name: string;
  date: string | null;
  location?: string;
  wins: TaikaiWin[];
};

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
  }: RawTaikaiEntry,
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
    existingTaikai.wins = existingTaikai.wins.concat(wins);
  } else {
    acc.push({
      name: event!,
      date,
      ...(taikaiLocation && { location: taikaiLocation }),
      wins,
    });
  }

  return acc;
}
