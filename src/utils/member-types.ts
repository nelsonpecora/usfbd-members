export type TaikaiWin = {
  place?: number;
  name: string;
};

export type Rank = {
  name: string;
  date: string | null;
};

export type Seminar = {
  name: string;
  date: string;
  location?: string;
  instructor?: string;
};

export type Taikai = {
  name: string;
  date: string | null;
  location?: string;
  wins: TaikaiWin[];
};

/** Parsed member data from loaders/members.ts */
export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dojo: string;
  currentRank: string;
  joined: string | null;
  isActive: boolean;
  manualCurrentRank?: string;
  ranks: Rank[];
  seminars: Seminar[];
  taikai: Taikai[];
};

/** Raw member data from fetch-member-info.ts, this is the format reflected in YAML files. */
export type RawMemberData = {
  id: string;
  firstName: string;
  lastName: string;
  joined: string | null;
  dojo: string;
  isActive: boolean;
  ranks?: Rank[];
  manualCurrentRank?: string;
  seminars?: Seminar[];
  taikai?: Array<{
    name: string;
    date: string | null;
    location?: string;
    wins?: TaikaiWin[];
  }>;
};
