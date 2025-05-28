import { NextRequest, NextResponse } from "next/server";
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import createNextIntlMiddleware from "next-intl/middleware";

import { DEFAULT_LOCALE, LOCALES } from "./constants/locale";
import { COOKIE_ORGANIZATION_CODE } from "./constants/storage";
import { getOrganizationCodeFromPathname } from "./utils/auth";
import logger from "./utils/logger";

const PRIVATE_PAGES = ["/orgs", "/users"];

/**
 * Internationalization middleware
 */
const intlMiddleware = createNextIntlMiddleware({
  // A list of all locales that are supported
  locales: LOCALES,

  // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
  defaultLocale: DEFAULT_LOCALE,
});

/**
 * NextAuth middleware
 */
const authMiddleware = withAuth(
  (req: NextRequestWithAuth) => {
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => token !== null,
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

type NextAuthMiddleware = (request: NextRequest) => NextResponse | Promise<NextResponse>;

/**
 * Combines authentication and internationalization middlewares based on the requested pathname.
 *
 * @param {NextRequest} req - The Next.js request object.
 * @returns {Promise<NextResponse>} The Next.js response object after processing the middleware tasks.
 */
export default async function middleware(req: NextRequest) {
  const start = Date.now();
  const { pathname, searchParams } = req.nextUrl;
  let res: NextResponse | undefined;
  const privatePathnameRegex = RegExp(`^(/(${LOCALES.join("|")}))?(${PRIVATE_PAGES.join("|")}).*$`, "i");
  if (privatePathnameRegex.test(pathname)) {
    const nextAuthRes = (authMiddleware as NextAuthMiddleware)(req);
    res = nextAuthRes instanceof Promise ? await nextAuthRes : nextAuthRes;
  } else {
    res = intlMiddleware(req);
  }

  // Extract organization code from the pathname and set it as a cookie in the response
  const orgCode = getOrganizationCodeFromPathname(pathname);
  if (res.cookies && orgCode) {
    res.cookies.set(COOKIE_ORGANIZATION_CODE, orgCode);
  }

  const duration = Date.now() - start;
  const url = pathname + (searchParams.size > 0 ? `?${searchParams.toString()}` : "");
  logger.info(`[${new Date(start).toISOString()}] ${req.method} ${url} (${duration} ms) ${res.status}`);
  return res;
}

export const config = {
  // https://github.com/lodash/lodash/issues/5525
  // https://nextjs.org/docs/messages/edge-dynamic-code-evaluation
  // FIXED: Dynamic Code Evaluation (e. g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime
  unstable_allowDynamic: ["**/node_modules/lodash/_root.js"],

  // Skip all paths that should not be internationalized. This example skips
  // certain folders and all pathnames with a dot (e.g. favicon.ico)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
