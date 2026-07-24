# syntax=docker/dockerfile:1
# 비드메이트 프론트엔드 — 멀티스테이지 빌드
# 최종 이미지엔 "실행에 필요한 것"만 남긴다(소스코드·빌드도구·devDeps 제외).

# ---- 1) deps : 의존성 설치만 (package 파일이 안 바뀌면 이 레이어는 캐시 재사용) ----
FROM node:22-alpine AS deps
# alpine에서 일부 네이티브 모듈이 glibc를 찾을 때 필요
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2) builder : 앱 빌드 ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* 는 빌드 시점에 번들에 박힌다 → 런타임 주입으로는 절대 안 들어간다.
# 그래서 빌드 인자로 받아 ENV로 세워둔 뒤 next build를 돌린다.
# (유저풀/클라이언트 ID는 브라우저에 노출되는 공개 식별자라 비밀값이 아니다)
ARG NEXT_PUBLIC_COGNITO_USER_POOL_ID
ARG NEXT_PUBLIC_COGNITO_CLIENT_ID
ENV NEXT_PUBLIC_COGNITO_USER_POOL_ID=$NEXT_PUBLIC_COGNITO_USER_POOL_ID
ENV NEXT_PUBLIC_COGNITO_CLIENT_ID=$NEXT_PUBLIC_COGNITO_CLIENT_ID

# API_BASE_URL 은 서버에서만 쓰므로 런타임에 주입한다 → 여기 필요 없음.
RUN npm run build

# ---- 3) runner : 실행 전용 최소 이미지 ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 보안: root가 아닌 전용 유저로 실행
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 산출물은 public/ 과 .next/static 을 포함하지 않으므로 따로 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# 컨테이너 외부에서 접속하려면 0.0.0.0 바인딩 필수(기본 localhost면 밖에서 못 붙음)
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
