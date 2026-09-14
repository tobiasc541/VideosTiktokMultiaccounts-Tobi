"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CreatorPromoEntry() {
  const pathname = usePathname();
  if (pathname !== "/login") return null;
  return <Link href="/creadores" className="creatorPromoEntry">✦ Solicitar código promocional</Link>;
}
