import { defineConfig } from "vite";
import vitto from "vitto";

import hashesHook from "./src/hooks/hashes";
import { isEligibleToTest } from "./src/filters/testing-eligibility";
import { fuzzydate } from "./src/filters/fuzzydate";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    vitto({
      minify: isProduction,
      enableSearchIndex: false,
      metadata: {
        siteName: "US Federation of Battodo",
        siteUrl: "https://members.usbattodo.com",
        siteDesc: "Member Portal for the US Federation of Battodo",
        siteLogo:
          "http://static1.squarespace.com/static/5a502616f14aa1f1cef463d0/t/5a5027e89140b76bbf72bd16/1515202538090/logo_black.png?format=1500w",
        siteFavicon:
          "https://images.squarespace-cdn.com/content/v1/5a502616f14aa1f1cef463d0/1516143421771-U3POAL1DO95GQWOF9SQ7/favicon.ico",
        title: "Members",
      },
      hooks: {
        index: hashesHook,
        "not-found": hashesHook,
        members: {},
      },
      ventoOptions: {
        // @ts-expect-error vitto doesn't expose this correctly in its types
        filters: {
          isEligibleToTest,
          fuzzydate,
        },
      },
    }),
  ],
  build: {
    minify: isProduction,
    chunkSizeWarningLimit: 1024 * 4,
    reportCompressedSize: false,
    emptyOutDir: true,
    manifest: true,
    outDir: "build",
  },
});
