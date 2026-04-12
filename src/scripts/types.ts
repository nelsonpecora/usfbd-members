export type FuzzyDate = {
  hasYear: boolean;
  hasMonth: boolean;
  hasDay: boolean;
  val: Date;
};

export type Rank = {
  name: string;
  date: string | Date | null;
};

export type Seminar = {
  name: string | null;
  date: string | null;
  location?: string;
  instructor?: string;
};

export type TaikaiWin = {
  place: number;
  name: string;
};

export type Taikai = {
  name: string;
  date: string | null;
  location?: string;
  wins: TaikaiWin[];
};

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  currentRank: string;
  joined?: string | Date | null;
  isActive: boolean;
  manualCurrentRank?: string;
  ranks: Rank[];
  seminars: Seminar[];
  taikai: Taikai[];
};
