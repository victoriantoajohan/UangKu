export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/wallets/:path*",
    "/budgets/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
