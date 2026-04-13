import cyrb53 from "./hash";

describe("cyrb53", () => {
  it("returns a number", () => {
    expect(typeof cyrb53("hello")).toBe("number");
  });

  it("is deterministic", () => {
    expect(cyrb53("hello")).toBe(cyrb53("hello"));
  });

  it("returns known values", () => {
    expect(cyrb53("")).toBe(3338908027751811);
    expect(cyrb53("hello")).toBe(4625896200565286);
    expect(cyrb53("johnsmith")).toBe(7456020736114741);
  });

  it("produces different output for different inputs", () => {
    expect(cyrb53("hello")).not.toBe(cyrb53("world"));
    expect(cyrb53("a")).not.toBe(cyrb53("b"));
  });

  it("seed changes the output", () => {
    expect(cyrb53("hello", 1)).toBe(6922249475667011);
    expect(cyrb53("hello", 1)).not.toBe(cyrb53("hello", 0));
  });

  it("default seed is 0", () => {
    expect(cyrb53("hello")).toBe(cyrb53("hello", 0));
  });
});
