"use client";

// 목업 인증 — 상태관리 라이브러리 없이 Context + localStorage로 로그인 상태를 유지한다.
// 실제 백엔드 인증이 붙기 전까지 화면(회원/비회원) 전환 테스트용.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type User = { email: string; company: string };

type StoredAccount = User & { password: string };

// 바로 로그인해 회원 화면을 테스트할 수 있는 기본 목업 계정
export const MOCK_ACCOUNT = {
  email: "test@bidmate.co.kr",
  password: "bidmate1234",
  company: "(주)비드메이트",
} as const;

const USER_KEY = "bidmate_user";
const ACCOUNTS_KEY = "bidmate_accounts";

type LoginResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  /** localStorage 로딩 완료 여부 (초기 깜빡임 방지용) */
  ready: boolean;
  login: (email: string, password: string) => LoginResult;
  signup: (company: string, email: string, password: string) => LoginResult;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** 이메일 중복 여부 (기본 목업 계정 + 가입된 계정 대조). 클라이언트에서만 호출. */
export function isEmailTaken(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (e === MOCK_ACCOUNT.email) return true;
  return readAccounts().some((a) => a.email.toLowerCase() === e);
}

/** 가입 계정 삭제(회원 탈퇴용). 클라이언트에서만 호출. */
export function removeAccount(email: string) {
  const e = email.trim().toLowerCase();
  const next = readAccounts().filter((a) => a.email.toLowerCase() !== e);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // localStorage는 서버 렌더 시점에 존재하지 않으므로, 마운트 후 읽어 state에 반영한다.
  // (렌더 중 읽으면 SSR에서 터짐) — 의도된 패턴이라 규칙 예외 처리
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  };

  const login: AuthContextValue["login"] = (email, password) => {
    const e = email.trim().toLowerCase();
    const matchMock = e === MOCK_ACCOUNT.email && password === MOCK_ACCOUNT.password;
    const account = readAccounts().find((a) => a.email.toLowerCase() === e && a.password === password);
    if (matchMock) {
      persist({ email: MOCK_ACCOUNT.email, company: MOCK_ACCOUNT.company });
      return { ok: true };
    }
    if (account) {
      persist({ email: account.email, company: account.company });
      return { ok: true };
    }
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  };

  const signup: AuthContextValue["signup"] = (company, email, password) => {
    const e = email.trim().toLowerCase();
    const accounts = readAccounts();
    if (e === MOCK_ACCOUNT.email || accounts.some((a) => a.email.toLowerCase() === e)) {
      return { ok: false, error: "이미 가입된 이메일이에요." };
    }
    const next: StoredAccount = { email: email.trim(), company: company.trim(), password };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, next]));
    persist({ email: next.email, company: next.company });
    return { ok: true };
  };

  const logout = () => persist(null);

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
