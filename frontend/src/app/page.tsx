import Link from "next/link";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="home-hero">
      <h1 className="page-title">{SITE.name}</h1>
      <p className="page-sub">{SITE.tagline}</p>
      <Link href="/cards" className="primary home-cta">
        カード図鑑を見る
      </Link>
    </div>
  );
}
