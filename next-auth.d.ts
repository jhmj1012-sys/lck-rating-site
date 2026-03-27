import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: "user" | "admin";
      name?: string | null;
      nickname?: string | null;
      hasNickname?: boolean;
      nicknameOnboardingSeen?: boolean;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "user" | "admin";
    nickname?: string | null;
    hasNickname?: boolean;
    nicknameOnboardingSeen?: boolean;
  }
}
