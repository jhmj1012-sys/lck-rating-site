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
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) {
        return token;
      }

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
      token.picture = syncedUser.image;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.nickname = token.nickname ?? null;
        session.user.hasNickname = Boolean(token.hasNickname);
        session.user.image = typeof token.picture === "string" ? token.picture : null;
      }

      return session;
    },
  },
};
