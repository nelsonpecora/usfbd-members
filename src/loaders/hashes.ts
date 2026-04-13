import type { Member } from "../utils/member-types";

import hash from "../utils/hash";
import sanitize from "../utils/sanitize";
import getMembers from "./members";

const members = getMembers();

type Hashes = Record<string, number>;

export async function getHashes() {
  return members.reduce((acc: Hashes, member: Member) => {
    const id = member.id;
    const firstName = sanitize(member.firstName);
    const lastName = sanitize(member.lastName);

    acc[id] = hash(`${firstName}${lastName}`);
    return acc;
  }, {});
}
