"use client";

// AWS Cognito 인증 래퍼 (브라우저 전용).
// 비밀번호는 SRP 방식으로 처리되어 네트워크에 그대로 실리지 않고, 우리 서버는 비밀번호를
// 아예 보지 않는다(Cognito가 보관). 여기서는 토큰 획득까지만 담당하고, 회사 식별(company_id)은
// 백엔드 /me가 결정한다.
//
// 유저풀/클라이언트 ID는 비밀값이 아니다(브라우저에 노출되는 게 정상) → NEXT_PUBLIC_*.

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

export const cognitoConfigured = Boolean(USER_POOL_ID && CLIENT_ID);

function pool(): CognitoUserPool {
  if (!cognitoConfigured) {
    throw new Error("Cognito 설정이 없습니다 (NEXT_PUBLIC_COGNITO_*)");
  }
  return new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });
}

function userOf(email: string): CognitoUser {
  return new CognitoUser({ Username: email.trim(), Pool: pool() });
}

/** Cognito 예외를 사용자에게 보여줄 한국어 문구로 변환 */
export function authErrorMessage(err: unknown): string {
  const e = err as { code?: string; name?: string; message?: string };
  switch (e?.code ?? e?.name) {
    case "NotAuthorizedException":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "UserNotFoundException":
      return "가입되지 않은 이메일이에요.";
    case "UsernameExistsException":
      return "이미 가입된 이메일이에요.";
    case "InvalidPasswordException":
      return "비밀번호가 정책에 맞지 않아요. 대문자·소문자·숫자·특수문자를 포함해 8자 이상이어야 해요.";
    case "CodeMismatchException":
      return "인증코드가 올바르지 않아요.";
    case "ExpiredCodeException":
      return "인증코드가 만료됐어요. 재발송해 주세요.";
    case "UserNotConfirmedException":
      return "이메일 인증이 완료되지 않았어요.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.";
    default:
      return e?.message || "인증 처리 중 문제가 발생했어요.";
  }
}

/** 회원가입. Cognito가 이메일로 인증코드를 보낸다(확인 전까지 로그인 불가). */
export function signUp(email: string, password: string, companyName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attrs = [
      new CognitoUserAttribute({ Name: "email", Value: email.trim() }),
      // 회사명을 표준 속성 name으로 넣어두면 백엔드가 토큰에서 읽어 companies.name에 쓴다.
      new CognitoUserAttribute({ Name: "name", Value: companyName.trim() }),
    ];
    pool().signUp(email.trim(), password, attrs, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** 가입 확인 — 메일로 받은 코드 입력 */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).confirmRegistration(code.trim(), true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** 인증코드 재발송 */
export function resendCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 비밀번호 재설정 1단계 — 등록된 이메일로 인증코드를 보낸다.
 *
 * 백엔드를 거치지 않는다(로그인·회원가입과 동일하게 브라우저가 Cognito를 직접 호출).
 * 풀 설정의 계정 복구 경로가 verified_email이라 별도 설정 없이 동작한다.
 */
export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
      // 코드 발송 성공 시 inputVerificationCode가 호출된다(onSuccess가 아니라).
      inputVerificationCode: () => resolve(),
    });
  });
}

/** 비밀번호 재설정 2단계 — 코드 + 새 비밀번호로 확정. */
export function confirmPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).confirmPassword(code.trim(), newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

/** 비밀번호 변경 — 로그인 상태에서 현재 비밀번호를 알고 바꾼다(재설정과 다른 경로). */
export function changePassword(current: string, next: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = pool().getCurrentUser();
    if (!user) return reject(new Error("로그인 상태가 아닙니다"));
    user.getSession((err: Error | null) => {
      if (err) return reject(err);
      user.changePassword(current, next, (changeErr) =>
        changeErr ? reject(changeErr) : resolve()
      );
    });
  });
}

/** 로그인(SRP). 성공 시 ID 토큰 반환 — 백엔드 호출에 쓴다. */
export function signIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    userOf(email).authenticateUser(
      new AuthenticationDetails({ Username: email.trim(), Password: password }),
      {
        onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
        onFailure: (err) => reject(err),
      }
    );
  });
}

/** 현재 세션의 ID 토큰. 만료됐으면 리프레시 토큰으로 자동 갱신된다. 없으면 null. */
export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!cognitoConfigured) return resolve(null);
    const current = pool().getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err: Error | null, session: { isValid(): boolean; getIdToken(): { getJwtToken(): string } } | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function signOut(): void {
  if (!cognitoConfigured) return;
  pool().getCurrentUser()?.signOut();
}

/** 회원 탈퇴 — Cognito 계정 삭제(로그인 상태여야 함) */
export function deleteCurrentUser(): Promise<void> {
  return new Promise((resolve, reject) => {
    const current = pool().getCurrentUser();
    if (!current) return reject(new Error("로그인 상태가 아닙니다"));
    current.getSession((err: Error | null) => {
      if (err) return reject(err);
      current.deleteUser((delErr) => (delErr ? reject(delErr) : resolve()));
    });
  });
}
