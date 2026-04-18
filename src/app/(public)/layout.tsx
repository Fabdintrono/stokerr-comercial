import { ReactNode } from "react";

// Public pages (cocina, mesa) — no auth required, no sidebar
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
