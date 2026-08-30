import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "is_public";

/**
 * Marks a route as public, bypassing the global JWT authentication guard
 * (e.g. register, login, refresh, health).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
