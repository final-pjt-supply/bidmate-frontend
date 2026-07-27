import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://13.125.187.40").replace(/\/+$/, "");
const PROFILE = __ENV.PROFILE || "smoke";
const TARGET = __ENV.TARGET || "health";
const USER_AGENT = "bidmate-k6-frontend-load-test/1.0";

const profiles = {
  smoke: [{ duration: "30s", target: 1 }],
  capacity: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 10 },
    { duration: "30s", target: 30 },
    { duration: "2m", target: 30 },
    { duration: "30s", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
};

if (!profiles[PROFILE]) {
  throw new Error(`Unknown PROFILE=${PROFILE}. Use smoke or capacity.`);
}

if (!["health", "page"].includes(TARGET)) {
  throw new Error(`Unknown TARGET=${TARGET}. Use health or page.`);
}

if (PROFILE === "capacity" && __ENV.ALLOW_LOAD_TEST !== "true") {
  throw new Error("Capacity test is locked. Set ALLOW_LOAD_TEST=true after the execution plan is approved.");
}

export const options = {
  stages: profiles[PROFILE],
  userAgent: USER_AGENT,
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true, delayAbortEval: "30s" }],
    http_req_duration: [{ threshold: "p(95)<2000", abortOnFail: true, delayAbortEval: "30s" }],
    checks: [{ threshold: "rate>0.95", abortOnFail: true, delayAbortEval: "30s" }],
    frontend_iteration_duration: ["p(95)<3000"],
    frontend_asset_failures: ["rate<0.05"],
  },
};

const requestParams = {
  headers: {
    "User-Agent": USER_AGENT,
    "X-Load-Test": "bidmate-frontend",
  },
  timeout: "5s",
};

const iterationDuration = new Trend("frontend_iteration_duration", true);
const assetFailures = new Rate("frontend_asset_failures");
let staticAssetsLoaded = false;

function absoluteUrl(path) {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${BASE_URL}${path}`;
}

function staticAssetUrls(html) {
  const paths = new Set();
  const pattern = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  let match;

  while ((match = pattern.exec(html)) !== null && paths.size < 40) {
    paths.add(match[1].replaceAll("&amp;", "&"));
  }

  return [...paths].map(absoluteUrl);
}

function testHealth() {
  const response = http.get(`${BASE_URL}/health`, {
    ...requestParams,
    tags: { target: "health" },
  });

  check(response, {
    "health returns 200": (res) => res.status === 200,
    "health identifies frontend": (res) => res.body.includes("bidmate-frontend"),
  });
}

function testPage() {
  const page = http.get(`${BASE_URL}/guide`, {
    ...requestParams,
    responseType: "text",
    tags: { target: "guide-html" },
  });

  const pageOk = check(page, {
    "guide returns 200": (res) => res.status === 200,
    "guide returns HTML": (res) => res.headers["Content-Type"]?.includes("text/html") ?? false,
  });

  if (!pageOk) {
    return;
  }

  if (staticAssetsLoaded) {
    return;
  }

  const assets = staticAssetUrls(page.body);
  check(assets, {
    "guide exposes static assets": (urls) => urls.length > 0,
  });

  if (assets.length === 0) {
    return;
  }

  const responses = http.batch(
    assets.map((url) => [
      "GET",
      url,
      null,
      {
        ...requestParams,
        tags: { target: "next-static-asset" },
      },
    ]),
  );

  for (const response of responses) {
    assetFailures.add(response.status !== 200);
  }

  staticAssetsLoaded = responses.every((response) => response.status === 200);
}

export default function frontendLoadTest() {
  const startedAt = Date.now();

  if (TARGET === "health") {
    testHealth();
  } else {
    testPage();
  }

  iterationDuration.add(Date.now() - startedAt);
  sleep(1);
}
