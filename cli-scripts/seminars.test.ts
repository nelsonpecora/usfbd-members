import { parseSeminar } from "./seminars";

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
