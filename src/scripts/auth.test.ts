// @vitest-environment jsdom
import { checkCurrentPage } from "./auth";

function setupMemberPage(memberId: string) {
  Object.defineProperty(window, "location", {
    value: { pathname: `/member/${memberId}/` },
    writable: true,
    configurable: true,
  });
  document.body.innerHTML = `
    <div class="loading show"></div>
    <div class="logged-out"></div>
    <div class="logged-in"></div>
    <button id="logout-btn"></button>
  `;
}

function setupIndexPage() {
  Object.defineProperty(window, "location", {
    value: { pathname: "/" },
    writable: true,
    configurable: true,
  });
  document.body.innerHTML = `
    <div class="logged-out"><form id="login-form"></form></div>
    <div class="logged-in"><a href="">member link</a></div>
    <button class="logout-btn"></button>
  `;
}

describe("checkCurrentPage — member page", () => {
  const memberId = "123";
  const hashValue = 99999;

  beforeEach(() => {
    window.hashes = { [memberId]: hashValue };
    setupMemberPage(memberId);
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("shows logged-in content when auth matches", () => {
    window.sessionStorage.setItem("auth", String(hashValue));
    checkCurrentPage();
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(false);
    expect(document.querySelector(".loading")!.classList.contains("show")).toBe(false);
  });

  it("shows logged-out content when auth is missing", () => {
    checkCurrentPage();
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(false);
    expect(document.querySelector(".loading")!.classList.contains("show")).toBe(false);
  });

  it("shows logged-out content when auth is wrong", () => {
    window.sessionStorage.setItem("auth", String(hashValue + 1));
    checkCurrentPage();
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(false);
  });
});

describe("checkCurrentPage — index page", () => {
  const memberId = "456";
  const hashValue = 88888;

  beforeEach(() => {
    window.hashes = { [memberId]: hashValue };
    setupIndexPage();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("shows logged-in content and sets member link when auth matches", () => {
    window.sessionStorage.setItem("auth", String(hashValue));
    checkCurrentPage();
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(false);
    const link = document.querySelector<HTMLAnchorElement>(".logged-in a")!;
    expect(link.href).toContain(`/member/${memberId}.html`);
  });

  it("shows logged-out form when no auth", () => {
    checkCurrentPage();
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(false);
  });

  it("shows logged-out form when auth does not match any member", () => {
    window.sessionStorage.setItem("auth", "00000");
    checkCurrentPage();
    expect(document.querySelector(".logged-out")!.classList.contains("show")).toBe(true);
    expect(document.querySelector(".logged-in")!.classList.contains("show")).toBe(false);
  });
});
