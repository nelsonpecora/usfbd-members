import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import pluralize from "pluralize";

import {
  getBasicInfo,
  getSeminarInfo,
  getAdditionalSeminarInfo,
  getAdditionalTaikaiInfo,
  loadMemberSpreadsheet,
  loadSeminarSpreadsheet,
  loadSeminarSubmissionSpreadsheet,
  loadTaikaiSubmissionSpreadsheet,
} from "./google-sheets";
import { mergeInfo } from "./ranks";

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

export async function main(): Promise<void> {
  console.log("Fetching member data...");
  const memberSpreadsheet = await loadMemberSpreadsheet();
  const seminarSpreadsheet = await loadSeminarSpreadsheet();
  const seminarSubmissionSpreadsheet = await loadSeminarSubmissionSpreadsheet();
  const taikaiSubmissionSpreadsheet = await loadTaikaiSubmissionSpreadsheet();

  const { basicInfo, missingIds } = await getBasicInfo(memberSpreadsheet);
  const seminarInfo = await getSeminarInfo(seminarSpreadsheet);
  const additionalSeminarInfo = await getAdditionalSeminarInfo(
    seminarSubmissionSpreadsheet,
  );
  const additionalTaikaiInfo = await getAdditionalTaikaiInfo(
    taikaiSubmissionSpreadsheet,
  );

  Object.entries(basicInfo).forEach(([id, member]) => {
    const combinedInfo = mergeInfo(
      id,
      member,
      seminarInfo,
      additionalSeminarInfo,
      additionalTaikaiInfo,
    );

    const memberYaml = yaml.dump(combinedInfo);

    try {
      fs.writeFileSync(
        path.join(ROOT, "src", "members", `${id}.yml`),
        memberYaml,
      );
    } catch (e) {
      console.error(
        `Error writing yaml for member ${id}: ${(e as Error).message}`,
      );
      process.exit(1);
    }
  });

  let missingFile = "id,firstName,lastName,dojo\n";

  missingIds.forEach(({ id, firstName, lastName, dojo }) => {
    missingFile += `${id || ""},${firstName || ""},${lastName || ""},${dojo || ""}\n`;
  });

  fs.writeFileSync(path.join(ROOT, "missing_ids.csv"), missingFile);

  const memberCount = Object.keys(basicInfo).length;
  const missingIdsCount = Object.keys(missingIds).length;

  console.log(
    `Generated yaml for ${memberCount} ${pluralize("member", memberCount)}`,
  );
  console.log(
    `Generated missing_ids.csv for ${missingIdsCount} ${pluralize("member", missingIdsCount)}`,
  );
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
