import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe slice of the Auth.js config. It contains no database or Node-only
 * imports so it can be evaluated inside Next.js middleware.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
      }

      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as { name?: string; image?: string };
        if (patch.name) token.name = patch.name;
        if (patch.image) token.picture = patch.image;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
