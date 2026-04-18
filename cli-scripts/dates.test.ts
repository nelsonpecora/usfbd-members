import { parseDate } from "./dates";

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
