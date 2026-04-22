import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { tgId: string };
    // Must match the augmentation in src/auth/middleware.ts
    user: { tgId: bigint; isAdmin: boolean };
  }
}
