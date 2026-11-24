// Shared API contracts are introduced as features are implemented.
// Do not duplicate backend database models here. Contracts must stay
// independent of both the frontend and backend implementations.

export const API_VERSION = "v1";

export * from "./lease/index.js";
export * from "./finance/index.js";
export * from "./tenant/index.js";
export * from "./maintenance/index.js";
