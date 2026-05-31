import type { ReactNode } from "react";
import { getDict } from "../i18n/server";

export async function generateMetadata() {
  const dict = await getDict();
  return { title: dict.nav.contact };
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
