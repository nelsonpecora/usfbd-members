/** Seminar entry as parsed from the Seminars and Taikai History spreadsheet */
type RawSeminarEntry = {
  event: string | null;
  date: string | null;
  note: string | null;
  instructor: string | null;
};

export type SeminarEntry = {
  name: string | null;
  date: string | null;
  location?: string;
  instructor?: string;
};

export function parseSeminar({ event, date, note, instructor }: RawSeminarEntry): SeminarEntry {
  return {
    name: note,
    date,
    ...(event && { location: event }),
    ...(instructor && { instructor }),
  };
}
