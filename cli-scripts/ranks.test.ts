import { getCurrentRank, getRanks, parseTest, mergeInfo } from "./ranks";

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

describe("getRanks", () => {
  it("returns empty array when all null", () => {
    expect(
      getRanks({ shodan: null, nidan: null, sandan: null, yondan: null, godan: null, rokudan: null }),
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

describe("parseTest", () => {
  it("returns test entry", () => {
    expect(parseTest({ date: "2015-03-20", note: "Shodan" })).toEqual({
      name: "Shodan",
      date: "2015-03-20",
    });
  });

  it("handles null values", () => {
    expect(parseTest({ date: null, note: null })).toEqual({ name: null, date: null });
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
