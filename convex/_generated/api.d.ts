/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cardQueue from "../cardQueue.js";
import type * as http from "../http.js";
import type * as normaliser_actions from "../normaliser/actions.js";
import type * as normaliser_adapters_dummyjson from "../normaliser/adapters/dummyjson.js";
import type * as normaliser_adapters_types from "../normaliser/adapters/types.js";
import type * as normaliser_config from "../normaliser/config.js";
import type * as products from "../products.js";
import type * as swipes from "../swipes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cardQueue: typeof cardQueue;
  http: typeof http;
  "normaliser/actions": typeof normaliser_actions;
  "normaliser/adapters/dummyjson": typeof normaliser_adapters_dummyjson;
  "normaliser/adapters/types": typeof normaliser_adapters_types;
  "normaliser/config": typeof normaliser_config;
  products: typeof products;
  swipes: typeof swipes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
