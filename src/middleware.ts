import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

function getHomeUrl(role: string): string {
  if (role === "SUPER_ADMIN") return "/super-admin/clients";
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/dashboard";
  if (role === "RESTAURANT_MANAGER") return "/restaurant";
  if (role === "CASHIER") return "/pos";
  if (role === "WAITER") return "/waiter";
  return "/business/select-business";
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // Root redirection
    if (path === "/") {
      // Super admin doesn't need business selection
      if (role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin/clients", req.url));
      }
      return NextResponse.redirect(new URL("/business/select-business", req.url));
    }

    // Business selection page is always accessible
    if (path.startsWith("/business")) {
      return NextResponse.next();
    }

    // For non-super-admin accessing warehouse (not pos), check businessId cookie
    // RESTAURANT_MANAGER is excluded — their layout auto-selects the business
    if (role !== "SUPER_ADMIN" && role !== "RESTAURANT_MANAGER" && path.startsWith("/warehouse") && !path.startsWith("/pos")) {
      const businessId = req.cookies.get("businessId")?.value;
      if (!businessId) {
        return NextResponse.redirect(new URL("/business/select-business", req.url));
      }
    }

    // Role-based access control
    const denied =
      (path.startsWith("/super-admin") && role !== "SUPER_ADMIN") ||
      (path.startsWith("/warehouse") && role !== "WAREHOUSE_MANAGER" && role !== "SUPER_ADMIN") ||
      (path.startsWith("/restaurant") && role !== "RESTAURANT_MANAGER" && role !== "CASHIER" && role !== "SUPER_ADMIN") ||
      (path.startsWith("/waiter") && role !== "WAITER" && role !== "RESTAURANT_MANAGER" && role !== "SUPER_ADMIN") ||
      (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN");

    if (denied) {
      return NextResponse.redirect(new URL(getHomeUrl(role), req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|login|register|cocina|mesa).*)",
  ],
};
