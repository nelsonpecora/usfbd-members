process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.com";
process.env.GOOGLE_PRIVATE_KEY = "test-private-key";

vi.mock("dotenv/config");
vi.mock("google-auth-library", () => ({
  JWT: vi.fn().mockImplementation(function () {}),
}));
vi.mock("google-spreadsheet", () => ({
  GoogleSpreadsheet: vi.fn(),
}));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      writeFileSync: vi.fn(),
    },
  };
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { GoogleSpreadsheet } from "google-spreadsheet";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  parseDate,
  getCurrentRank,
  getCell,
  getRanks,
  parseSeminar,
  parseTaikaiWin,
  parseAndMergeTaikai,
  parseTest,
  mergeInfo,
  getBasicInfo,
  getSeminarInfo,
  main,
} from "./fetch-member-info";

const FIXTURES_DIR = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "test-fixtures",
);

function makeRow(
  data: Record<string, string | undefined>,
): GoogleSpreadsheetRow {
  return { get: (key: string) => data[key] } as unknown as GoogleSpreadsheetRow;
}

function makeSheet(rows: GoogleSpreadsheetRow[]) {
  return { getRows: vi.fn().mockResolvedValue(rows) };
}

function makeDoc(sheetsByTitle: Record<string, ReturnType<typeof makeSheet>>) {
  return { loadInfo: vi.fn().mockResolvedValue(undefined), sheetsByTitle };
}

// ---------------------------------------------------------------------------
// Shared fixture data for integration tests
// ---------------------------------------------------------------------------

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
// Unit tests
// ---------------------------------------------------------------------------

describe("parseDate", () => {
  it("returns null for null input", () => {
    expect(parseDate(null)).toBeNull();
  });

  it("parses M/D/YYYY format", () => {
    expect(parseDate("3/20/2015")).toBe("2015-03-20");
  });

  it("parses single-digit month and day", () => {
    expect(parseDate("1/5/2020")).toBe("2020-01-05");
  });

  it("parses YYYY-only format", () => {
    expect(parseDate("2010")).toBe("2010-01-01");
  });

  it("parses timestamp with space (signup form format)", () => {
    expect(parseDate("12/2/2023 23:39:30")).toBe("2023-12-02");
  });
});

describe("getCurrentRank", () => {
  it("returns null for 0", () => {
    expect(getCurrentRank("0")).toBeNull();
  });

  it("returns null for null", () => {
    expect(getCurrentRank(null)).toBeNull();
  });

  it("returns null for unknown value", () => {
    expect(getCurrentRank("7")).toBeNull();
  });

  it.each([
    ["1", "Shodan"],
    ["2", "Nidan"],
    ["3", "Sandan"],
    ["4", "Yondan"],
    ["5", "Godan"],
    ["6", "Rokudan"],
  ] as const)("returns %s → %s", (input, expected) => {
    expect(getCurrentRank(input)).toBe(expected);
  });
});

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

describe("getRanks", () => {
  it("returns empty array when all null", () => {
    expect(
      getRanks({
        shodan: null,
        nidan: null,
        sandan: null,
        yondan: null,
        godan: null,
        rokudan: null,
      }),
    ).toEqual([]);
  });

  it("includes only provided ranks in order", () => {
    const result = getRanks({
      shodan: "1/1/2010",
      nidan: "2/2/2012",
      sandan: null,
      yondan: null,
      godan: null,
      rokudan: null,
    });

    expect(result).toEqual([
      { name: "Shodan", date: "2010-01-01" },
      { name: "Nidan", date: "2012-02-02" },
    ]);
  });

  it("includes all ranks when all provided", () => {
    const result = getRanks({
      shodan: "1/1/2010",
      nidan: "1/1/2012",
      sandan: "1/1/2015",
      yondan: "1/1/2018",
      godan: "1/1/2022",
      rokudan: "1/1/2026",
    });

    expect(result).toHaveLength(6);
    expect(result.map((r) => r.name)).toEqual([
      "Shodan",
      "Nidan",
      "Sandan",
      "Yondan",
      "Godan",
      "Rokudan",
    ]);
  });
});

describe("parseSeminar", () => {
  it("returns seminar with all fields", () => {
    expect(
      parseSeminar({
        event: "East Dojo",
        date: "2016-04-10",
        note: "Spring Seminar",
        instructor: "Smith Sensei",
      }),
    ).toEqual({
      name: "Spring Seminar",
      date: "2016-04-10",
      location: "East Dojo",
      instructor: "Smith Sensei",
    });
  });

  it("omits location when event is null", () => {
    const result = parseSeminar({
      event: null,
      date: "2016-04-10",
      note: "Workshop",
      instructor: null,
    });
    expect(result).not.toHaveProperty("location");
    expect(result).not.toHaveProperty("instructor");
  });

  it("omits instructor when null", () => {
    const result = parseSeminar({
      event: "Dojo A",
      date: "2016-04-10",
      note: "Class",
      instructor: null,
    });
    expect(result).not.toHaveProperty("instructor");
    expect(result).toHaveProperty("location", "Dojo A");
  });
});

describe("parseTaikaiWin", () => {
  it("parses place and name", () => {
    expect(parseTaikaiWin("1:Open Division")).toEqual({
      place: 1,
      name: "Open Division",
    });
  });

  it("trims whitespace around colon", () => {
    expect(parseTaikaiWin("2 : Kata Division")).toEqual({
      place: 2,
      name: "Kata Division",
    });
  });
});

describe("parseAndMergeTaikai", () => {
  it("creates a new taikai entry", () => {
    const result = parseAndMergeTaikai([], {
      event: "Nationals",
      date: "2017-11-12",
      taikaiLocation: "West Dojo",
      taikaiYear: "2017",
      win1: "1:Open",
      win2: null,
      win3: null,
      win4: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "Nationals",
      date: "2017-11-12",
      location: "West Dojo",
      wins: [{ place: 1, name: "Open" }],
    });
  });

  it("merges wins into existing taikai with same name and year", () => {
    const existing = parseAndMergeTaikai([], {
      event: "Nationals",
      date: "2017-11-12",
      taikaiLocation: "West Dojo",
      taikaiYear: "2017",
      win1: "1:Open",
      win2: null,
      win3: null,
      win4: null,
    });

    const result = parseAndMergeTaikai(existing, {
      event: "Nationals",
      date: "2017-11-12",
      taikaiLocation: "West Dojo",
      taikaiYear: "2017",
      win1: "2:Kata",
      win2: null,
      win3: null,
      win4: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0].wins).toEqual([
      { place: 1, name: "Open" },
      { place: 2, name: "Kata" },
    ]);
  });

  it("adds a second taikai entry for different year", () => {
    const existing = parseAndMergeTaikai([], {
      event: "Nationals",
      date: "2016-11-12",
      taikaiLocation: null,
      taikaiYear: "2016",
      win1: "1:Open",
      win2: null,
      win3: null,
      win4: null,
    });

    const result = parseAndMergeTaikai(existing, {
      event: "Nationals",
      date: "2017-11-12",
      taikaiLocation: null,
      taikaiYear: "2017",
      win1: "1:Open",
      win2: null,
      win3: null,
      win4: null,
    });

    expect(result).toHaveLength(2);
  });

  it("omits location when taikaiLocation is null", () => {
    const result = parseAndMergeTaikai([], {
      event: "Regionals",
      date: "2017-05-01",
      taikaiLocation: null,
      taikaiYear: "2017",
      win1: null,
      win2: null,
      win3: null,
      win4: null,
    });

    expect(result[0]).not.toHaveProperty("location");
  });
});

describe("parseTest", () => {
  it("returns test entry", () => {
    expect(parseTest({ date: "2015-03-20", note: "Shodan" })).toEqual({
      name: "Shodan",
      date: "2015-03-20",
    });
  });

  it("handles null values", () => {
    expect(parseTest({ date: null, note: null })).toEqual({
      name: null,
      date: null,
    });
  });
});

describe("mergeInfo", () => {
  const baseMember = {
    id: "1",
    firstName: "Alice",
    lastName: "Smith",
    joined: "2010-01-01",
    dojo: "Test Dojo",
    isActive: true,
    ranks: [{ name: "Shodan", date: "2015-03-20" }],
  };

  it("returns member unchanged when no seminar info", () => {
    const result = mergeInfo("1", { ...baseMember }, {});
    expect(result).toEqual(baseMember);
  });

  it("attaches seminars and taikai", () => {
    const seminarInfo = {
      "1": {
        seminars: [{ name: "Workshop", date: "2016-01-01" }],
        taikai: [],
        testing: [],
      },
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo);
    expect(result.seminars).toEqual([{ name: "Workshop", date: "2016-01-01" }]);
  });

  it("adds missing rank from testing history", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [],
        testing: [{ name: "Nidan", date: "2018-06-15" }],
      },
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo);
    expect(result.ranks).toContainEqual({ name: "Nidan", date: "2018-06-15" });
  });

  it("keeps older date when testing date is later than rank date", () => {
    const memberWithRank = {
      ...baseMember,
      ranks: [{ name: "Shodan", date: "2015-01-01" }],
    };
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [],
        testing: [{ name: "Shodan", date: "2015-06-01" }],
      },
    };

    const result = mergeInfo("1", memberWithRank, seminarInfo);
    expect(result.ranks[0].date).toBe("2015-01-01");
  });

  it("replaces rank date when testing date is earlier", () => {
    const memberWithRank = {
      ...baseMember,
      ranks: [{ name: "Shodan", date: "2015-06-01" }],
    };
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [],
        testing: [{ name: "Shodan", date: "2015-01-01" }],
      },
    };

    const result = mergeInfo("1", memberWithRank, seminarInfo);
    expect(result.ranks[0].date).toBe("2015-01-01");
  });
});

// ---------------------------------------------------------------------------
// Integration tests: getBasicInfo
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
      ...Object.fromEntries(
        [
          "Member ID",
          "First Name",
          "Last Name",
          "Activation Date",
          "School Name",
        ].map((k) => [
          k,
          {
            "Member ID": "888",
            "First Name": "Exempt",
            "Last Name": "Person",
            "Activation Date": "1/1/2000",
            "School Name": "Dojo",
          }[k],
        ]),
      ),
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
    expect(missingIds[0]).toMatchObject({
      firstName: "Ghost",
      lastName: "Person",
    });
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
// Integration tests: getSeminarInfo
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
    expect(info["999"].testing[0]).toEqual({
      name: "Shodan",
      date: "2015-03-20",
    });
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
    const noIdRow = makeRow({
      "Member Number": "#N/A",
      Action: "Seminar Class",
      Date: "1/1/2020",
    });
    const doc = makeDoc({ Sheet1: makeSheet([noIdRow]) });
    const info = await getSeminarInfo(doc as any);
    expect(Object.keys(info)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Complex integration test: full pipeline → matches fixture
// ---------------------------------------------------------------------------

describe("full pipeline", () => {
  it("generates YAML output matching the expected-member-999 fixture", async () => {
    const { basicInfo } = await getBasicInfo(mockMemberDoc as any);
    const seminarInfo = await getSeminarInfo(mockSeminarDoc as any);
    const combined = mergeInfo("999", basicInfo["999"], seminarInfo);
    const parsed = yaml.load(yaml.dump(combined));

    const expected = yaml.load(
      fs.readFileSync(
        path.join(FIXTURES_DIR, "expected-member-999.yml"),
        "utf-8",
      ),
    );

    expect(parsed).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// main() smoke test
// ---------------------------------------------------------------------------

describe("main", () => {
  beforeEach(() => {
    vi.mocked(GoogleSpreadsheet).mockImplementation(function (
      this: Record<string, unknown>,
      id: string,
    ) {
      const isMemberSheet =
        id === "1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo";
      Object.assign(this, isMemberSheet ? mockMemberDoc : mockSeminarDoc);
    } as any);
    vi.mocked(fs.writeFileSync).mockReset();
  });

  it("writes a YAML file for each member and a missing_ids CSV", async () => {
    await main();

    const calls = vi.mocked(fs.writeFileSync).mock.calls;
    const memberCall = calls.find(([p]) => String(p).endsWith("999.yml"));
    const csvCall = calls.find(([p]) => String(p).endsWith("missing_ids.csv"));

    expect(memberCall).toBeDefined();
    expect(csvCall).toBeDefined();
  });

  it("writes valid YAML containing expected member fields", async () => {
    await main();

    const calls = vi.mocked(fs.writeFileSync).mock.calls;
    const memberCall = calls.find(([p]) => String(p).endsWith("999.yml"));
    const writtenYaml = memberCall![1] as string;
    const parsed = yaml.load(writtenYaml) as Record<string, unknown>;

    expect(parsed.id).toBe("999");
    expect(parsed.firstName).toBe("Test");
    expect(parsed.lastName).toBe("Member");
    expect(parsed.isActive).toBe(true);
  });
});
