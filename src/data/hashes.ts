import type { Member } from "../../utils/types";

import hash from "../scripts/hash";
import sanitize from "../scripts/sanitize";
import getMembers from "./members";

const members = getMembers();

export default function getHashes(): Record<string | number, number> {
	return members.reduce(
		(acc: Record<string | number, number>, member: Member) => {
			const id = member.id;
			const firstName = sanitize(member.firstName);
			const lastName = sanitize(member.lastName);

			acc[id] = hash(`${firstName}${lastName}`);
			return acc;
		},
		{},
	);
}
