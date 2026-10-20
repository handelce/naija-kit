import { copyFileSync } from "node:fs";

// The package ships the repository's licence; keeping one source avoids drift.
copyFileSync("../../LICENSE", "LICENSE");
