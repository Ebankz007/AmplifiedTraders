#!/usr/bin/env node
/**
 * CI gate for the deploy.
 *
 * Prints exactly one word:
 *   GREEN    - every CI check for this commit passed
 *   RED      - a check failed, was cancelled, or timed out
 *   PENDING  - a check exists but has not finished yet
 *   NONE     - the commit has no check runs at all (CI has not started)
 *   UNKNOWN  - GitHub could not be reached (network, rate limit, 5xx)
 *
 * The deploy script refuses a RED commit. It waits out PENDING/NONE for a
 * while, because the cron poll usually fires before the workflow has had a
 * chance to start. UNKNOWN is fail-OPEN: GitHub being unreachable must not
 * stop the site from deploying, but it is logged loudly.
 *
 * Only hits the API when there is a new commit to deploy, so the unauthenticated
 * rate limit (60/hour) is never a practical constraint.
 */
import https from "node:https";

const REPO = process.env.AT_REPO ?? "Ebankz007/AmplifiedTraders";
const sha = process.argv[2];

if (!sha) {
  console.log("UNKNOWN");
  process.exit(0);
}

/** @returns {Promise<string>} one of GREEN | RED | PENDING | NONE | UNKNOWN */
function checkRuns(sha) {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`;
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };

    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "amplifiedtraders-deploy",
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            // 403 = rate limited, 404 = unknown commit. Either way we cannot
            // prove anything; the caller decides what to do with UNKNOWN.
            done("UNKNOWN");
            return;
          }
          let runs;
          try {
            runs = JSON.parse(body).check_runs ?? [];
          } catch {
            done("UNKNOWN");
            return;
          }
          if (!Array.isArray(runs) || runs.length === 0) {
            done("NONE");
            return;
          }
          const finished = runs.every(
            (r) => r.status === "completed" && r.conclusion === "success",
          );
          if (finished) {
            done("GREEN");
            return;
          }
          const anyUnfinished = runs.some((r) => r.status !== "completed");
          done(anyUnfinished ? "PENDING" : "RED");
        });
      },
    );

    req.setTimeout(15000, () => {
      req.destroy();
      done("UNKNOWN");
    });
    req.on("error", () => done("UNKNOWN"));
  });
}

checkRuns(sha)
  .then((v) => {
    console.log(v);
    process.exit(0);
  })
  .catch(() => {
    console.log("UNKNOWN");
    process.exit(0);
  });
