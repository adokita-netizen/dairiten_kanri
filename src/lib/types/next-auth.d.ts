import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "OPERATOR" | "AGENCY";
    agencyId: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: "OPERATOR" | "AGENCY";
      agencyId: string | null;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "OPERATOR" | "AGENCY";
    agencyId: string | null;
    userId: string;
  }
}
