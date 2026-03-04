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
import type * as normaliser_adapters_aliexpress from "../normaliser/adapters/aliexpress.js";
import type * as normaliser_adapters_amazon from "../normaliser/adapters/amazon.js";
import type * as normaliser_adapters_bestbuy from "../normaliser/adapters/bestbuy.js";
import type * as normaliser_adapters_ebay from "../normaliser/adapters/ebay.js";
import type * as normaliser_adapters_etsy from "../normaliser/adapters/etsy.js";
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
  "normaliser/adapters/aliexpress": typeof normaliser_adapters_aliexpress;
  "normaliser/adapters/amazon": typeof normaliser_adapters_amazon;
  "normaliser/adapters/bestbuy": typeof normaliser_adapters_bestbuy;
  "normaliser/adapters/ebay": typeof normaliser_adapters_ebay;
  "normaliser/adapters/etsy": typeof normaliser_adapters_etsy;
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
