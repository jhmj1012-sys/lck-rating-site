import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import type { StoreShape, StoredUser, UserRole } from "@/lib/domain";
import { createId, mutateStore, readStore } from "@/lib/store";

const nicknamePattern = /^[A-Za-z0-9가-힣_-]{2,16}$/;
export const GUEST_USER_COOKIE = "gg_guest_id";
const LOL_NICKNAME_WORDS = [
  "칼날부리",
  "피바라기",
  "내셔남작",
  "붉은망치",
  "정글시야",
  "용한타",
  "바론콜",
  "포탑철거",
  "미니언웨이브",
  "오브젝트각",
  "전령타이밍",
  "한타집중",
  "밴픽메모",
  "로밍각",
  "라인주도권",
  "후반캐리",
  "용타이머",
  "교전복기",
  "강타각",
  "역전각",
] as const;

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRole(email: string): UserRole {
  return getAdminEmails().includes(email.toLowerCase()) ? "admin" : "user";
}

export function normalizeNickname(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function validateNickname(input: string) {
  const nickname = normalizeNickname(input);

  if (!nicknamePattern.test(nickname)) {
    throw new Error("닉네임은 2~16자, 한글/영문/숫자/밑줄(_)과 하이픈(-)만 사용할 수 있습니다.");
  }

  return nickname;
}

function ensureUniqueNickname(store: StoreShape, nickname: string, excludeUserId?: string) {
  const duplicated = store.users.find(
    (user) => user.nickname?.toLowerCase() === nickname.toLowerCase() && user.id !== excludeUserId,
  );

  if (duplicated) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }
}

export async function upsertUserFromIdentity(identity: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  return mutateStore(async (store) => {
    const now = new Date().toISOString();
    const email = identity.email.toLowerCase();
    const existing = store.users.find((user) => user.email.toLowerCase() === email);

    if (existing) {
      existing.name = identity.name?.trim() || existing.name || email.split("@")[0];
      existing.image = identity.image ?? existing.image ?? null;
      existing.role = existing.role === "admin" ? "admin" : resolveRole(email);
      if (typeof existing.nicknameOnboardingSeen !== "boolean") {
        existing.nicknameOnboardingSeen = false;
      }
      if (!existing.nickname) {
        existing.nickname = createRandomLolNickname(store, existing.id);
        existing.nicknameOnboardingSeen = true;
        existing.nicknameUpdatedAt = now;
      }
      existing.updatedAt = now;
      return existing;
    }

    const created: StoredUser = {
      id: createId(store, "users", "user"),
      email,
      name: identity.name?.trim() || email.split("@")[0],
      nickname: createRandomLolNickname(store),
      nicknameOnboardingSeen: true,
      nicknameUpdatedAt: now,
      bio: null,
      image: identity.image ?? null,
      role: resolveRole(email),
      selectedProfileTheme: null,
      createdAt: now,
      updatedAt: now,
    };

    store.users.push(created);
    return created;
  });
}

export async function updateUserNickname(userId: string, rawNickname: string) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const nickname = validateNickname(rawNickname);
    ensureUniqueNickname(store, nickname, userId);

    const now = new Date().toISOString();
    user.nickname = nickname;
    user.nicknameOnboardingSeen = true;
    user.nicknameUpdatedAt = now;
    user.updatedAt = now;
    return user;
  });
}

export async function markNicknameOnboardingSeen(userId: string) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    if (!user.nicknameOnboardingSeen) {
      user.nicknameOnboardingSeen = true;
      user.updatedAt = new Date().toISOString();
    }

    return user;
  });
}

export async function getUserById(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  const store = await readStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    const email = session?.user?.email;
    if (!email) {
      return null;
    }

    return upsertUserFromIdentity({
      email,
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
    });
  }

  return getUserById(userId);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user;
}

export async function requireNamedUser() {
  const user = await requireUser();
  if (!user.nickname) {
    throw new Error("닉네임을 먼저 설정해 주세요.");
  }

  return user;
}

function hasNicknameConflict(store: StoreShape, nickname: string, excludeUserId?: string) {
  return store.users.some(
    (user) => user.nickname?.toLowerCase() === nickname.toLowerCase() && user.id !== excludeUserId,
  );
}

function randomNumberSuffix() {
  return String(Math.floor(Math.random() * 90) + 10);
}

function createRandomLolNickname(store: StoreShape, excludeUserId?: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const word = LOL_NICKNAME_WORDS[Math.floor(Math.random() * LOL_NICKNAME_WORDS.length)];
    const candidate = `${word}${randomNumberSuffix()}`;
    if (!hasNicknameConflict(store, candidate, excludeUserId)) {
      return candidate;
    }
  }

  const fallback = `소환사${Date.now().toString().slice(-4)}`;
  if (!hasNicknameConflict(store, fallback, excludeUserId)) {
    return fallback;
  }
  return `소환사${Date.now().toString().slice(-3)}${Math.floor(Math.random() * 10)}`;
}

export async function resolveUserOrGuest(guestToken?: string | null) {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return { user: currentUser, isGuest: false as const, guestToken: null as string | null };
  }

  const normalizedToken =
    typeof guestToken === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(guestToken)
      ? guestToken
      : crypto.randomUUID().replace(/-/g, "");
  const guestEmail = `guest_${normalizedToken}@guest.local`;

  const guestUser = await mutateStore(async (store) => {
    const existing = store.users.find((user) => user.email.toLowerCase() === guestEmail.toLowerCase());
    if (existing) {
      if (!existing.nickname) {
        existing.nickname = `게스트${normalizedToken.slice(0, 4)}`;
      }
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const now = new Date().toISOString();
    const created: StoredUser = {
      id: createId(store, "users", "user"),
      email: guestEmail,
      name: `게스트${normalizedToken.slice(0, 4)}`,
      nickname: `게스트${normalizedToken.slice(0, 4)}`,
      nicknameOnboardingSeen: true,
      nicknameUpdatedAt: now,
      bio: null,
      image: null,
      role: "user",
      selectedProfileTheme: null,
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(created);
    return created;
  });

  return { user: guestUser, isGuest: true as const, guestToken: normalizedToken };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return user;
}
