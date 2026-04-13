import formatTaikaiWin from "./format-taikai";

describe("formatTaikaiWin", () => {
  it("returns empty string for empty array", () => {
    expect(formatTaikaiWin([])).toBe("");
  });

  it("formats 1st place", () => {
    expect(formatTaikaiWin([{ place: 1, name: "Spring Taikai" }])).toBe(
      "<strong>1st Place:</strong> Spring Taikai"
    );
  });

  it("formats 2nd place", () => {
    expect(formatTaikaiWin([{ place: 2, name: "Fall Taikai" }])).toBe(
      "<strong>2nd Place:</strong> Fall Taikai"
    );
  });

  it("formats 3rd place", () => {
    expect(formatTaikaiWin([{ place: 3, name: "National Taikai" }])).toBe(
      "<strong>3rd Place:</strong> National Taikai"
    );
  });

  it("formats other place as 'Won'", () => {
    expect(formatTaikaiWin([{ place: 4, name: "Regional Taikai" }])).toBe(
      "<strong>Won:</strong> Regional Taikai"
    );
  });

  it("formats win with no place as 'Won'", () => {
    expect(formatTaikaiWin([{ name: "Open Taikai" }])).toBe(
      "<strong>Won:</strong> Open Taikai"
    );
  });

  it("joins multiple wins with <br />", () => {
    expect(
      formatTaikaiWin([
        { place: 1, name: "Spring Taikai" },
        { place: 2, name: "Fall Taikai" },
        { name: "Open Taikai" },
      ])
    ).toBe(
      "<strong>1st Place:</strong> Spring Taikai<br /><strong>2nd Place:</strong> Fall Taikai<br /><strong>Won:</strong> Open Taikai"
    );
  });
});
