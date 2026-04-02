import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { upsertUserFromIdentity } from "@/lib/authz";

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";

const providers = [];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      checks: ["state"],
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code, metadata) {
      console.error("NextAuth error", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth warn", code);
    },
    debug(code, metadata) {
      console.log("NextAuth debug", code, metadata);
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const email = user?.email ?? token.email;
      if (!email) {
        return token;
      }

      token.email = email;
      token.name = user?.name ?? token.name;
      token.picture = user?.image ?? token.picture;

      if (trigger === "update" && session) {
        const updatedNickname =
          typeof (session as { nickname?: unknown }).nickname === "string"
            ? (session as { nickname?: string }).nickname?.trim()
            : undefined;
        if (updatedNickname !== undefined) {
          token.nickname = updatedNickname;
          token.hasNickname = Boolean(updatedNickname);
        }
      }

      if (!token.userId || user || trigger === "signIn") {
        try {
          const syncedUser = await upsertUserFromIdentity({
            email,
            name: user?.name ?? token.name,
            image: user?.image ?? (typeof token.picture === "string" ? token.picture : null),
          });

          token.userId = syncedUser.id;
          token.role = syncedUser.role;
          token.name = syncedUser.name;
          token.nickname = syncedUser.nickname;
          token.hasNickname = Boolean(syncedUser.nickname);
          token.nicknameOnboardingSeen = Boolean(syncedUser.nicknameOnboardingSeen);
          token.picture = syncedUser.image;
        } catch (error) {
          console.error("Auth user sync failed during jwt callback", error);
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return url;
        }
      } catch {}

      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.nickname = token.nickname ?? null;
        session.user.hasNickname = Boolean(token.hasNickname);
        session.user.nicknameOnboardingSeen = Boolean(token.nicknameOnboardingSeen);
        session.user.image = typeof token.picture === "string" ? token.picture : null;
      }

      return session;
    },
  },
};
