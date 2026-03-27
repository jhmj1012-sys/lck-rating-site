import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import type { StoreShape, StoredUser, UserRole } from "@/lib/domain";
import { createId, mutateStore, readStore } from "@/lib/store";

const nicknamePattern = /^[A-Za-z0-9가-힣_-]{2,16}$/;

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
      existing.updatedAt = now;
      return existing;
    }

    const created: StoredUser = {
      id: createId(store, "users", "user"),
      email,
      name: identity.name?.trim() || email.split("@")[0],
      nickname: null,
      nicknameOnboardingSeen: false,
      nicknameUpdatedAt: null,
      bio: null,
      image: identity.image ?? null,
      role: resolveRole(email),
      selectedBadge: null,
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
    return null;
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

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return user;
}
