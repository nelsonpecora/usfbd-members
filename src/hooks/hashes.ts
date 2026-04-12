import { defineHooks } from "vitto";

import type { Member } from "../scripts/types";

import hash from "../scripts/hash";
import sanitize from "../scripts/sanitize";
import getMembers from "./members";

const members = getMembers();

type Hashes = Record<string, number>;

export function getHashes() {
  return members.reduce((acc: Hashes, member: Member) => {
    const id = member.id;
    const firstName = sanitize(member.firstName);
    const lastName = sanitize(member.lastName);

    acc[id] = hash(`${firstName}${lastName}`);
    return acc;
  }, {});
}

export default defineHooks("hashes", () => {
  return JSON.stringify(getHashes());
});
