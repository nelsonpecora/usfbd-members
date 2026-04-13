import sanitize from "./sanitize";

describe("sanitize", () => {
  it("lowercases input", () => {
    expect(sanitize("HELLO")).toBe("hello");
  });

  it("removes spaces", () => {
    expect(sanitize("John Smith")).toBe("johnsmith");
  });

  it("removes numbers", () => {
    expect(sanitize("abc123")).toBe("abc");
  });

  it("removes punctuation", () => {
    expect(sanitize("O'Brien")).toBe("obrien");
  });

  it("removes hyphens", () => {
    expect(sanitize("Mary-Jane")).toBe("maryjane");
  });

  it("handles already-sanitized input", () => {
    expect(sanitize("johnsmith")).toBe("johnsmith");
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });

  it("strips all non-letter characters", () => {
    expect(sanitize("!@#$%^&*()")).toBe("");
  });
});
