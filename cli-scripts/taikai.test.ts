import { parseTaikaiWin, parseAndMergeTaikai } from "./taikai";

describe("parseTaikaiWin", () => {
  it("parses place and name", () => {
    expect(parseTaikaiWin("1:Open Division")).toEqual({ place: 1, name: "Open Division" });
  });

  it("trims whitespace around colon", () => {
    expect(parseTaikaiWin("2 : Kata Division")).toEqual({ place: 2, name: "Kata Division" });
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
