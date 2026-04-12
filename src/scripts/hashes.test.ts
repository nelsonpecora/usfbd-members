import { getHashes } from "../hooks/hashes";
import hash from "./hash";
import sanitize from "./sanitize";

vi.mock("./members", () => ({
  default: () => [
    { id: 1, firstName: "John", lastName: "Doe" },
    { id: 2, firstName: "Jane", lastName: "Smith" },
    { id: 3, firstName: "Mary-Anne", lastName: "O'Brien" },
  ],
}));

describe("getHashes", () => {
  it("returns a valid JSON string", () => {
    expect(() => getHashes()).not.toThrow();
  });

  it("contains an entry for each member", () => {
    const result = getHashes();

    expect(Object.keys(result)).toHaveLength(3);
    expect(result).toHaveProperty("1");
    expect(result).toHaveProperty("2");
    expect(result).toHaveProperty("3");
  });

  it("each value is a number", () => {
    const result = getHashes();

    for (const val of Object.values(result)) {
      expect(typeof val).toBe("number");
    }
  });

  it("hash matches cyrb53 of sanitized firstName + lastName", () => {
    const result = getHashes();

    expect(result[1]).toBe(hash(`${sanitize("John")}${sanitize("Doe")}`));
    expect(result[2]).toBe(hash(`${sanitize("Jane")}${sanitize("Smith")}`));
  });

  it("strips special characters from names before hashing", () => {
    const result = getHashes();

    // "Mary-Anne" + "O'Brien" sanitizes to "maryanne" + "obrien"
    expect(result[3]).toBe(hash(`${sanitize("Mary-Anne")}${sanitize("O'Brien")}`));
    expect(result[3]).toBe(hash("maryanneobrien"));
  });

  it("produces different hashes for different names", () => {
    const result = getHashes();

    expect(result[1]).not.toBe(result[2]);
    expect(result[1]).not.toBe(result[3]);
    expect(result[2]).not.toBe(result[3]);
  });
});
