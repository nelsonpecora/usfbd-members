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
import { getBasicInfo, getSeminarInfo } from "./google-sheets";
import { mergeInfo } from "./ranks";
import { main } from "./fetch-member-info";

const FIXTURES_DIR = path.join(fileURLToPath(new URL(".", import.meta.url)), "test-fixtures");

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
// Full pipeline
// ---------------------------------------------------------------------------

describe("full pipeline", () => {
  it("generates YAML output matching the expected-member-999 fixture", async () => {
    const { basicInfo } = await getBasicInfo(mockMemberDoc as any);
    const seminarInfo = await getSeminarInfo(mockSeminarDoc as any);
    const combined = mergeInfo("999", basicInfo["999"], seminarInfo);
    const parsed = yaml.load(yaml.dump(combined));

    const expected = yaml.load(
      fs.readFileSync(path.join(FIXTURES_DIR, "expected-member-999.yml"), "utf-8"),
    );

    expect(parsed).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

describe("main", () => {
  beforeEach(() => {
    vi.mocked(GoogleSpreadsheet).mockImplementation(function (
      this: Record<string, unknown>,
      id: string,
    ) {
      const isMemberSheet = id === "1adUo2bdlwqEGoPT3zGYxkD7HsHTRPGTITFRLGkJlVoo";
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
