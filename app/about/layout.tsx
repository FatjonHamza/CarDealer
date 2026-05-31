import type { ReactNode } from "react";
import { getDict } from "../i18n/server";

// About/Contact are client components (they call useT()), so they can't export
// metadata directly. A tiny server-only layout wrapper sets the page title via
// the parent layout's "KAK | %s" template.
export async function generateMetadata() {
  const dict = await getDict();
  return { title: dict.nav.about };
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
