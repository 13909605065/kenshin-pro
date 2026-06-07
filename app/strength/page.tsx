"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StrengthRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/gym"); }, [router]);
  return null;
}
