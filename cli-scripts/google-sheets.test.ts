import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  getCell,
  getBasicInfo,
  getSeminarInfo,
  getAdditionalSeminarInfo,
  getAdditionalTaikaiInfo,
} from "./google-sheets";

function makeRow(data: Record<string, string | undefined>): GoogleSpreadsheetRow {
  return { get: (key: string) => data[key] } as unknown as GoogleSpreadsheetRow;
}

function makeSheet(rows: GoogleSpreadsheetRow[]) {
  return { getRows: vi.fn().mockResolvedValue(rows) };
}

function makeDoc(sheetsByTitle: Record<string, ReturnType<typeof makeSheet>>) {
  return { loadInfo: vi.fn().mockResolvedValue(undefined), sheetsByTitle };
}

const CURRENT_YEAR = String(new Date().getFullYear());

const memberRow = makeRow({
  "Member ID": "999",
  "First Name": "Test",
  "Last Name": "Member",
  "Activation Date": "5/15/2010",
  "School Name": "Test Dojo",
  Shodan: "3/20/2015",
  Nidan: "6/15/2018",
  Sandan: undefined,
  Yondan: undefined,
  Godan: undefined,
  Rokudan: undefined,
  "Current Rank": "0",
  Exemption: undefined,
});

const paymentRow = makeRow({ "Member Number": "999", [CURRENT_YEAR]: "paid" });

const seminarRow = makeRow({
  "Member Number": "999",
  Event: "East Dojo",
  Date: "4/10/2016",
  Action: "Seminar Class",
  Notes: "Spring Seminar",
  Instructors: "Smith Sensei",
  "Testing Pass/Fail": "",
  "Taikai Location": undefined,
  Year: undefined,
  "Taikai Win1": undefined,
  "Taikai Win2": undefined,
  "Taikai Win3": undefined,
  "Taikai Win4": undefined,
});

const tournamentRow = makeRow({
  "Member Number": "999",
  Event: "National Championship",
  Date: "11/12/2017",
  Action: "Tournament",
  Notes: undefined,
  Instructors: undefined,
  "Testing Pass/Fail": "",
  "Taikai Location": "West Dojo",
  Year: "2017",
  "Taikai Win1": "1:Open Division",
  "Taikai Win2": "2:Kata Division",
  "Taikai Win3": undefined,
  "Taikai Win4": undefined,
});

const testingRow = makeRow({
  "Member Number": "999",
  Event: undefined,
  Date: "3/20/2015",
  Action: "Testing",
  Notes: "Shodan",
  Instructors: undefined,
  "Testing Pass/Fail": "yes",
  "Taikai Location": undefined,
  Year: undefined,
  "Taikai Win1": undefined,
  "Taikai Win2": undefined,
  "Taikai Win3": undefined,
  "Taikai Win4": undefined,
});

const mockMemberDoc = makeDoc({
  Root: makeSheet([memberRow]),
  "Member Payment History": makeSheet([paymentRow]),
});

const mockSeminarDoc = makeDoc({
  Sheet1: makeSheet([seminarRow, tournamentRow, testingRow]),
});

// ---------------------------------------------------------------------------
// getCell
// ---------------------------------------------------------------------------

describe("getCell", () => {
  it("returns trimmed value", () => {
    const row = makeRow({ Name: "  Alice  " });
    expect(getCell(row, "Name")).toBe("Alice");
  });

  it("returns null when cell is undefined", () => {
    const row = makeRow({});
    expect(getCell(row, "Missing")).toBeNull();
  });

  it("returns custom fallback when cell is undefined", () => {
    const row = makeRow({});
    expect(getCell(row, "Missing", "default")).toBe("default");
  });

  it("returns null when cell is empty string", () => {
    const row = makeRow({ Name: "" });
    expect(getCell(row, "Name")).toBeNull();
  });

  it("accepts numeric column keys", () => {
    const row = makeRow({ "2025": "paid" });
    expect(getCell(row, 2025)).toBe("paid");
  });
});

// ---------------------------------------------------------------------------
// getBasicInfo
// ---------------------------------------------------------------------------

describe("getBasicInfo", () => {
  it("parses a member row into BasicMember shape", async () => {
    const { basicInfo } = await getBasicInfo(mockMemberDoc as any);
    expect(basicInfo["999"]).toMatchObject({
      id: "999",
      firstName: "Test",
      lastName: "Member",
      joined: "2010-05-15",
      dojo: "Test Dojo",
    });
  });

  it("marks member as active when payment row has current year", async () => {
    const { basicInfo } = await getBasicInfo(mockMemberDoc as any);
    expect(basicInfo["999"].isActive).toBe(true);
  });

  it("marks member as inactive when no payment row", async () => {
    const doc = makeDoc({
      Root: makeSheet([memberRow]),
      "Member Payment History": makeSheet([]),
    });

    const { basicInfo } = await getBasicInfo(doc as any);
    expect(basicInfo["999"].isActive).toBe(false);
  });

  it("marks exempt member as always active regardless of payment", async () => {
    const exemptRow = makeRow({
      "Member ID": "888",
      "First Name": "Exempt",
      "Last Name": "Person",
      "Activation Date": "1/1/2000",
      "School Name": "Dojo",
      Shodan: undefined,
      Nidan: undefined,
      Sandan: undefined,
      Yondan: undefined,
      Godan: undefined,
      Rokudan: undefined,
      "Current Rank": "0",
      Exemption: "TRUE",
    });

    const doc = makeDoc({
      Root: makeSheet([exemptRow]),
      "Member Payment History": makeSheet([]),
    });

    const { basicInfo } = await getBasicInfo(doc as any);
    expect(basicInfo["888"].isActive).toBe(true);
  });

  it("does not include isExemptFromDues in output", async () => {
    const { basicInfo } = await getBasicInfo(mockMemberDoc as any);
    expect(basicInfo["999"]).not.toHaveProperty("isExemptFromDues");
  });

  it("adds to missingIds when id is absent", async () => {
    const noIdRow = makeRow({ "First Name": "Ghost", "Last Name": "Person" });
    const doc = makeDoc({
      Root: makeSheet([noIdRow]),
      "Member Payment History": makeSheet([]),
    });

    const { missingIds } = await getBasicInfo(doc as any);
    expect(missingIds).toHaveLength(1);
    expect(missingIds[0]).toMatchObject({ firstName: "Ghost", lastName: "Person" });
  });

  it("adds to missingIds when last name is absent", async () => {
    const noLastRow = makeRow({ "Member ID": "777", "First Name": "NoLast" });
    const doc = makeDoc({
      Root: makeSheet([noLastRow]),
      "Member Payment History": makeSheet([]),
    });

    const { missingIds } = await getBasicInfo(doc as any);
    expect(missingIds).toHaveLength(1);
    expect(missingIds[0]).toMatchObject({ id: "777", firstName: "NoLast" });
  });

  it("adds to missingIds on duplicate id", async () => {
    const dupRow = makeRow({
      "Member ID": "999",
      "First Name": "Dup",
      "Last Name": "User",
      "Activation Date": "1/1/2020",
      "School Name": "Dojo",
      Shodan: undefined,
      Nidan: undefined,
      Sandan: undefined,
      Yondan: undefined,
      Godan: undefined,
      Rokudan: undefined,
      "Current Rank": "0",
      Exemption: undefined,
    });

    const doc = makeDoc({
      Root: makeSheet([memberRow, dupRow]),
      "Member Payment History": makeSheet([paymentRow]),
    });

    const { missingIds, basicInfo } = await getBasicInfo(doc as any);
    expect(missingIds).toHaveLength(1);
    expect(Object.keys(basicInfo)).toHaveLength(1);
    expect(basicInfo["999"].firstName).toBe("Test");
  });

  it("skips entirely empty rows", async () => {
    const emptyRow = makeRow({});
    const doc = makeDoc({
      Root: makeSheet([emptyRow, memberRow]),
      "Member Payment History": makeSheet([paymentRow]),
    });

    const { basicInfo, missingIds } = await getBasicInfo(doc as any);
    expect(Object.keys(basicInfo)).toHaveLength(1);
    expect(missingIds).toHaveLength(0);
  });

  it("sets manualCurrentRank when Current Rank column is non-zero", async () => {
    const rankedRow = makeRow({
      "Member ID": "500",
      "First Name": "Senior",
      "Last Name": "Member",
      "Activation Date": "1/1/2005",
      "School Name": "Dojo",
      Shodan: undefined,
      Nidan: undefined,
      Sandan: undefined,
      Yondan: undefined,
      Godan: undefined,
      Rokudan: undefined,
      "Current Rank": "3",
      Exemption: undefined,
    });

    const doc = makeDoc({
      Root: makeSheet([rankedRow]),
      "Member Payment History": makeSheet([]),
    });

    const { basicInfo } = await getBasicInfo(doc as any);
    expect(basicInfo["500"].manualCurrentRank).toBe("Sandan");
  });
});

// ---------------------------------------------------------------------------
// getSeminarInfo
// ---------------------------------------------------------------------------

describe("getSeminarInfo", () => {
  it("parses seminar class rows", async () => {
    const info = await getSeminarInfo(mockSeminarDoc as any);
    expect(info["999"].seminars).toHaveLength(1);
    expect(info["999"].seminars[0]).toEqual({
      name: "Spring Seminar",
      date: "2016-04-10",
      location: "East Dojo",
      instructor: "Smith Sensei",
    });
  });

  it("parses tournament rows", async () => {
    const info = await getSeminarInfo(mockSeminarDoc as any);
    expect(info["999"].taikai).toHaveLength(1);
    expect(info["999"].taikai[0]).toMatchObject({
      name: "National Championship",
      date: "2017-11-12",
      location: "West Dojo",
    });
    expect(info["999"].taikai[0].wins).toEqual([
      { place: 1, name: "Open Division" },
      { place: 2, name: "Kata Division" },
    ]);
  });

  it("parses passing test rows", async () => {
    const info = await getSeminarInfo(mockSeminarDoc as any);
    expect(info["999"].testing).toHaveLength(1);
    expect(info["999"].testing[0]).toEqual({ name: "Shodan", date: "2015-03-20" });
  });

  it("ignores failing test rows", async () => {
    const failRow = makeRow({
      "Member Number": "999",
      Event: undefined,
      Date: "3/20/2015",
      Action: "Testing",
      Notes: "Nidan",
      Instructors: undefined,
      "Testing Pass/Fail": "no",
      "Taikai Location": undefined,
      Year: undefined,
      "Taikai Win1": undefined,
      "Taikai Win2": undefined,
      "Taikai Win3": undefined,
      "Taikai Win4": undefined,
    });

    const doc = makeDoc({ Sheet1: makeSheet([failRow]) });
    const info = await getSeminarInfo(doc as any);
    expect(info["999"]?.testing ?? []).toHaveLength(0);
  });

  it("skips rows with missing or invalid member number", async () => {
    const noIdRow = makeRow({ "Member Number": "#N/A", Action: "Seminar Class", Date: "1/1/2020" });
    const doc = makeDoc({ Sheet1: makeSheet([noIdRow]) });
    const info = await getSeminarInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getAdditionalSeminarInfo
// ---------------------------------------------------------------------------

describe("getAdditionalSeminarInfo", () => {
  function makeAdditionalSeminarRow(overrides: Record<string, string | undefined> = {}) {
    return makeRow({
      "Confirmed by USFBD": "TRUE",
      "USFBD Member ID": "999",
      "Seminar Name": "National Seminar",
      "Seminar Date": "6/1/2023",
      "Seminar Location (usually dojo name)": "Spring Workshop",
      "Seminar Instructor": "Hanshi Jones",
      ...overrides,
    });
  }

  it("parses a confirmed seminar row", async () => {
    const doc = makeDoc({ "Form Responses 1": makeSheet([makeAdditionalSeminarRow()]) });
    const info = await getAdditionalSeminarInfo(doc as any);

    expect(info["999"]).toHaveLength(1);
    expect(info["999"][0]).toEqual({
      name: "Spring Workshop",
      date: "2023-06-01",
      location: "National Seminar",
      instructor: "Hanshi Jones",
    });
  });

  it("skips unconfirmed rows", async () => {
    const row = makeAdditionalSeminarRow({ "Confirmed by USFBD": "FALSE" });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalSeminarInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });

  it("skips rows with no USFBD Member ID", async () => {
    const row = makeAdditionalSeminarRow({ "USFBD Member ID": undefined });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalSeminarInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });

  it("accumulates multiple seminars for the same member", async () => {
    const row1 = makeAdditionalSeminarRow({ "Seminar Name": "Seminar A" });
    const row2 = makeAdditionalSeminarRow({ "Seminar Name": "Seminar B" });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row1, row2]) });
    const info = await getAdditionalSeminarInfo(doc as any);

    expect(info["999"]).toHaveLength(2);
    expect(info["999"].map((s) => s.location)).toEqual(["Seminar A", "Seminar B"]);
  });

  it("omits instructor when not provided", async () => {
    const row = makeAdditionalSeminarRow({ "Seminar Instructor": undefined });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalSeminarInfo(doc as any);

    expect(info["999"][0]).not.toHaveProperty("instructor");
  });
});

// ---------------------------------------------------------------------------
// getAdditionalTaikaiInfo
// ---------------------------------------------------------------------------

describe("getAdditionalTaikaiInfo", () => {
  function makeAdditionalTaikaiRow(overrides: Record<string, string | undefined> = {}) {
    return makeRow({
      "Confirmed by USFBD": "TRUE",
      "USFBD Member ID": "999",
      "Taikai Name": "Spring Cup",
      "Taikai Date": "5/10/2023",
      "Taikai Location": "West Dojo",
      "What was the event?": "Open Division",
      "How did you place?": "1st Place",
      ...overrides,
    });
  }

  it("parses a confirmed taikai row with a win", async () => {
    const doc = makeDoc({ "Form Responses 1": makeSheet([makeAdditionalTaikaiRow()]) });
    const info = await getAdditionalTaikaiInfo(doc as any);

    expect(info["999"]).toHaveLength(1);
    expect(info["999"][0]).toEqual({
      name: "Spring Cup",
      date: "2023-05-10",
      location: "West Dojo",
      wins: [{ place: 1, name: "Open Division" }],
    });
  });

  it("skips unconfirmed rows", async () => {
    const row = makeAdditionalTaikaiRow({ "Confirmed by USFBD": "FALSE" });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalTaikaiInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });

  it("skips rows with no USFBD Member ID", async () => {
    const row = makeAdditionalTaikaiRow({ "USFBD Member ID": undefined });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalTaikaiInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });

  it("merges multiple rows for the same taikai into one entry", async () => {
    const row1 = makeAdditionalTaikaiRow({ "What was the event?": "Open Division", "How did you place?": "1st Place" });
    const row2 = makeAdditionalTaikaiRow({ "What was the event?": "Kata Division", "How did you place?": "2nd Place" });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row1, row2]) });
    const info = await getAdditionalTaikaiInfo(doc as any);

    expect(info["999"]).toHaveLength(1);
    expect(info["999"][0].wins).toEqual([
      { place: 1, name: "Open Division" },
      { place: 2, name: "Kata Division" },
    ]);
  });

  it("creates separate entries for different taikai", async () => {
    const row1 = makeAdditionalTaikaiRow({ "Taikai Name": "Spring Cup", "Taikai Date": "5/10/2023" });
    const row2 = makeAdditionalTaikaiRow({ "Taikai Name": "Fall Cup", "Taikai Date": "10/15/2023" });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row1, row2]) });
    const info = await getAdditionalTaikaiInfo(doc as any);

    expect(info["999"]).toHaveLength(2);
    expect(info["999"].map((t) => t.name)).toEqual(["Spring Cup", "Fall Cup"]);
  });

  it("creates an entry with no wins when event and place are absent", async () => {
    const row = makeAdditionalTaikaiRow({
      "What was the event?": undefined,
      "How did you place?": undefined,
    });
    const doc = makeDoc({ "Form Responses 1": makeSheet([row]) });
    const info = await getAdditionalTaikaiInfo(doc as any);

    expect(info["999"][0].wins).toHaveLength(0);
  });
});
