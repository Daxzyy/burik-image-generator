"use client";

import dynamic from "next/dynamic";

const BurikApp = dynamic(() => import("@/src/components/BurikApp"), {
  ssr: false,
});

export default function Home() {
  return <BurikApp />;
}
