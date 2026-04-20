import { getCurrentRank, getRanks, parseTest, mergeInfo, deduplicateTaikai } from "./ranks";

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
    const result = mergeInfo("1", { ...baseMember }, {}, {}, {});
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

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, {});
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

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, {});
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

    const result = mergeInfo("1", memberWithRank, seminarInfo, {}, {});
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

    const result = mergeInfo("1", memberWithRank, seminarInfo, {}, {});
    expect(result.ranks[0].date).toBe("2015-01-01");
  });

  it("appends additional seminars to existing seminars, sorted oldest first", () => {
    const seminarInfo = {
      "1": {
        seminars: [{ name: "Workshop B", date: "2017-06-01" }],
        taikai: [],
        testing: [],
      },
    };
    const additionalSeminarInfo = {
      "1": [{ name: "Workshop A", date: "2016-01-01" }],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, additionalSeminarInfo, {});
    expect(result.seminars).toEqual([
      { name: "Workshop A", date: "2016-01-01" },
      { name: "Workshop B", date: "2017-06-01" },
    ]);
  });

  it("sorts seminars from seminarInfo oldest first", () => {
    const seminarInfo = {
      "1": {
        seminars: [
          { name: "Workshop C", date: "2019-03-01" },
          { name: "Workshop A", date: "2016-01-01" },
          { name: "Workshop B", date: "2017-06-01" },
        ],
        taikai: [],
        testing: [],
      },
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, {});
    expect(result.seminars!.map((s) => s.name)).toEqual(["Workshop A", "Workshop B", "Workshop C"]);
  });

  it("ignores additionalSeminarInfo for other member ids", () => {
    const seminarInfo = {
      "1": { seminars: [{ name: "Workshop A", date: "2016-01-01" }], taikai: [], testing: [] },
    };
    const additionalSeminarInfo = {
      "2": [{ name: "Workshop B", date: "2017-06-01" }],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, additionalSeminarInfo, {});
    expect(result.seminars).toEqual([{ name: "Workshop A", date: "2016-01-01" }]);
  });

  it("merges additional taikai into existing taikai, sorted oldest first", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [{ name: "Regional 2021", date: "2021-09-01", wins: [] }],
        testing: [],
      },
    };
    const additionalTaikaiInfo = {
      "1": [{ name: "Nationals 2020", date: "2020-06-01", wins: [] }],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, additionalTaikaiInfo);
    expect(result.taikai!.map((t) => t.name)).toEqual(["Nationals 2020", "Regional 2021"]);
  });

  it("sorts taikai from seminarInfo oldest first", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [
          { name: "Regional 2022", date: "2022-03-01", wins: [] },
          { name: "Nationals 2020", date: "2020-06-01", wins: [] },
          { name: "Spring 2019", date: "2019-04-01", wins: [] },
        ],
        testing: [],
      },
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, {});
    expect(result.taikai!.map((t) => t.name)).toEqual([
      "Spring 2019",
      "Nationals 2020",
      "Regional 2022",
    ]);
  });

  it("deduplicates taikai and merges wins when additional taikai overlaps", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [
          { name: "Nationals 2020", date: "2020-06-01", wins: [{ place: 1, name: "Kata" }] },
        ],
        testing: [],
      },
    };
    const additionalTaikaiInfo = {
      "1": [
        { name: "Nationals 2020", date: "2020-06-01", wins: [{ place: 2, name: "Tameshigiri" }] },
      ],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, additionalTaikaiInfo);
    expect(result.taikai).toHaveLength(1);
    expect(result.taikai![0].wins).toHaveLength(2);
  });

  it("does not deduplicate taikai of the same name if dates are different", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [
          { name: "Tri State Taikai", date: "2020-06-01", wins: [{ place: 1, name: "Kata" }] },
        ],
        testing: [],
      },
    };
    const additionalTaikaiInfo = {
      "1": [
        { name: "Tri State Taikai", date: "2021-06-01", wins: [{ place: 2, name: "Tameshigiri" }] },
      ],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, additionalTaikaiInfo);
    expect(result.taikai).toEqual([
      { name: "Tri State Taikai", date: "2020-06-01", wins: [{ place: 1, name: "Kata" }] },
      { name: "Tri State Taikai", date: "2021-06-01", wins: [{ place: 2, name: "Tameshigiri" }] },
    ]);
  });

  it("ignores additionalTaikaiInfo for other member ids", () => {
    const seminarInfo = {
      "1": {
        seminars: [],
        taikai: [{ name: "Nationals 2020", date: "2020-06-01", wins: [] }],
        testing: [],
      },
    };
    const additionalTaikaiInfo = {
      "2": [{ name: "Regional 2021", date: "2021-09-01", wins: [] }],
    };

    const result = mergeInfo("1", { ...baseMember }, seminarInfo, {}, additionalTaikaiInfo);
    expect(result.taikai).toHaveLength(1);
    expect(result.taikai![0].name).toBe("Nationals 2020");
  });
});

describe("deduplicateTaikai", () => {
  it("returns first array unchanged when second is empty", () => {
    const taikai = [{ name: "Spring Taikai 2020", date: "2020-04-01", wins: [] }];
    expect(deduplicateTaikai(taikai, [])).toEqual(taikai);
  });

  it("returns second array unchanged when first is empty", () => {
    const additional = [{ name: "Fall Taikai 2021", date: "2021-10-01", wins: [] }];
    expect(deduplicateTaikai([], additional)).toEqual(additional);
  });

  it("combines non-overlapping entries", () => {
    const taikai = [{ name: "Spring Taikai 2020", date: "2020-04-01", wins: [] }];
    const additional = [{ name: "Fall Taikai 2021", date: "2021-10-01", wins: [] }];
    const result = deduplicateTaikai(taikai, additional);
    expect(result).toHaveLength(2);
  });

  it("deduplicates entries with the same name", () => {
    const taikai = [{ name: "Nationals 2022", date: "2022-06-01", wins: [] }];
    const additional = [{ name: "Nationals 2022", date: "2022-06-01", wins: [] }];
    const result = deduplicateTaikai(taikai, additional);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Nationals 2022");
  });

  it("merges wins from duplicate entries, sorted by place", () => {
    const taikai = [
      { name: "Nationals 2022", date: "2022-06-01", wins: [{ place: 2, name: "Tameshigiri" }] },
    ];
    const additional = [
      { name: "Nationals 2022", date: "2022-06-01", wins: [{ place: 1, name: "Kata" }] },
    ];
    const result = deduplicateTaikai(taikai, additional);
    expect(result[0].wins).toEqual([
      { place: 1, name: "Kata" },
      { place: 2, name: "Tameshigiri" },
    ]);
  });

  it("sorts wins by place on a non-duplicate entry", () => {
    const taikai = [
      {
        name: "Nationals 2022",
        date: "2022-06-01",
        wins: [
          { place: 3, name: "Kihon" },
          { place: 1, name: "Kata" },
          { place: 2, name: "Tameshigiri" },
        ],
      },
    ];
    const result = deduplicateTaikai(taikai, []);
    expect(result[0].wins.map((w) => w.place)).toEqual([1, 2, 3]);
  });

  it("does not duplicate wins that appear in both arrays", () => {
    const win = { place: 1, name: "Kata" };
    const taikai = [{ name: "Nationals 2022", date: "2022-06-01", wins: [win] }];
    const additional = [{ name: "Nationals 2022", date: "2022-06-01", wins: [win] }];
    const result = deduplicateTaikai(taikai, additional);
    expect(result[0].wins).toHaveLength(1);
  });
});
