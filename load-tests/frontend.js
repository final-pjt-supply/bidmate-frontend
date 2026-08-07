import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// 기본 대상은 현재 서비스 도메인. 최초 측정(2026-07-27) 때는 단일 EC2의 공인 IP를
// 직접 때렸으나 그 인스턴스는 이미 사라졌다. 지금 이 주소로 재측정하면 ALB를 거치는
// 현재 구조를 재는 것이라, 2026-07-27 결과와 수치를 직접 비교하면 안 된다.
const BASE_URL = (__ENV.BASE_URL || "https://bidfriend.ai.kr").replace(/\/+$/, "");
const PROFILE = __ENV.PROFILE || "smoke";
const TARGET = __ENV.TARGET || "health";
const USER_AGENT = "bidmate-k6-frontend-load-test/1.0";

const profiles = {
  smoke: [{ duration: "30s", target: 1 }],
  diagnostic: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 30 },
    { duration: "1m", target: 30 },
    { duration: "15s", target: 0 },
  ],
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

if (!["health", "page", "html", "assets"].includes(TARGET)) {
  throw new Error(`Unknown TARGET=${TARGET}. Use health, page, html, or assets.`);
}

if (PROFILE !== "smoke" && __ENV.ALLOW_LOAD_TEST !== "true") {
  throw new Error("Load test is locked. Set ALLOW_LOAD_TEST=true after the execution plan is approved.");
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

function getGuidePage(tag = "guide-html") {
  return http.get(`${BASE_URL}/guide`, {
    ...requestParams,
    responseType: "text",
    tags: { target: tag },
  });
}

function checkGuidePage(page) {
  return check(page, {
    "guide returns 200": (res) => res.status === 200,
    "guide returns HTML": (res) => res.headers["Content-Type"]?.includes("text/html") ?? false,
  });
}

function requestAssets(assets) {
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

  return responses;
}

export function setup() {
  if (TARGET !== "assets") {
    return {};
  }

  const page = getGuidePage("asset-discovery");
  if (!checkGuidePage(page)) {
    throw new Error("Cannot discover assets because /guide is unhealthy.");
  }

  const assets = staticAssetUrls(page.body);
  if (assets.length === 0) {
    throw new Error("No /_next/static assets were discovered from /guide.");
  }

  return { assets };
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

function testHtml() {
  const page = getGuidePage();
  checkGuidePage(page);
}

function testPage() {
  const page = getGuidePage();
  if (!checkGuidePage(page)) {
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

  const responses = requestAssets(assets);
  staticAssetsLoaded = responses.every((response) => response.status === 200);
}

function testAssets(assets) {
  requestAssets(assets);
}

export default function frontendLoadTest(data) {
  const startedAt = Date.now();

  if (TARGET === "health") {
    testHealth();
  } else if (TARGET === "page") {
    testPage();
  } else if (TARGET === "html") {
    testHtml();
  } else {
    testAssets(data.assets);
  }

  iterationDuration.add(Date.now() - startedAt);
  sleep(1);
}
