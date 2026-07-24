"use client";

// 인증 — AWS Cognito 기반.
// 비밀번호는 Cognito가 보관하고 우리 서버는 보지 않는다. 로그인 성공 시 받은 ID 토큰으로
// 백엔드 /me를 호출해 company_id(회사 식별자)를 확보한다.
//
// 화면들이 쓰는 User 형태({email, company})는 그대로 유지해 기존 코드가 깨지지 않게 한다.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  authErrorMessage,
  confirmSignUp as cognitoConfirm,
  deleteCurrentUser,
  getIdToken,
  resendCode as cognitoResend,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
} from "@/lib/cognito";

export type User = {
  email: string;
  company: string;
  /** 백엔드가 부여한 회사 식별자 — 회사별 데이터의 키 */
  companyId: string;
};

/** 개발용 테스트 계정 (Cognito에 실제로 존재) */
export const MOCK_ACCOUNT = {
  email: "dev@bidmate.co.kr",
  password: "BidmateDev!2026",
  company: "(주)비드메이트",
} as const;

type Result = { ok: true } | { ok: false; error: string };
/** 가입은 이메일 인증코드 단계가 남으므로 별도 결과 타입 */
type SignupResult = { ok: true; needsConfirm: true } | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  /** 세션 확인 완료 여부 (초기 깜빡임 방지용) */
  ready: boolean;
  login: (email: string, password: string) => Promise<Result>;
  signup: (company: string, email: string, password: string) => Promise<SignupResult>;
  confirmSignup: (email: string, code: string) => Promise<Result>;
  resendCode: (email: string) => Promise<Result>;
  logout: () => void;
  deleteAccount: () => Promise<Result>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** ID 토큰으로 백엔드 /me 호출 → 회사 정보. Next 서버가 백엔드로 중계한다. */
async function fetchMe(idToken: string): Promise<User | null> {
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      company_id: string;
      email: string | null;
      name: string | null;
    };
    return {
      email: data.email ?? "",
      company: data.name ?? "",
      companyId: data.company_id,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  /** 현재 Cognito 세션이 있으면 /me로 사용자 정보를 채운다 */
  const syncFromSession = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return null;
    return fetchMe(token);
  }, []);

  // 새로고침 후에도 로그인 유지 — Cognito가 저장한 세션을 복원한다.
  useEffect(() => {
    let alive = true;
    syncFromSession()
      .then((u) => {
        if (alive) setUser(u);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [syncFromSession]);

  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      const token = await cognitoSignIn(email, password);
      const me = await fetchMe(token);
      if (!me) return { ok: false, error: "회사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." };
      setUser(me);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  const signup: AuthContextValue["signup"] = async (company, email, password) => {
    try {
      await cognitoSignUp(email, password, company);
      // 가입만으로는 로그인되지 않는다 — 메일로 온 코드 확인이 남았다.
      return { ok: true, needsConfirm: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  const confirmSignup: AuthContextValue["confirmSignup"] = async (email, code) => {
    try {
      await cognitoConfirm(email, code);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  const resendCode: AuthContextValue["resendCode"] = async (email) => {
    try {
      await cognitoResend(email);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  const logout = () => {
    cognitoSignOut();
    setUser(null);
  };

  const deleteAccount: AuthContextValue["deleteAccount"] = async () => {
    try {
      await deleteCurrentUser();
      setUser(null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, ready, login, signup, confirmSignup, resendCode, logout, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
