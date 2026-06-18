"use client";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const slow = pathname === "/app";
  return (
    <div key={pathname} className={slow ? "page-anim page-anim--slow" : "page-anim"}>
      {children}
    </div>
  );
}
