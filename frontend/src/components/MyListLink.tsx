"use client";

import Link from "next/link";
import { useMyList } from "@/lib/mylist";

export function MyListLink() {
  const { items, ready } = useMyList();
  const count = Object.keys(items).length;

  return (
    <Link href="/mylist" className="mylist-link">
      <span aria-hidden="true">♡</span> すきなカード
      {ready && count > 0 ? <span className="mylist-count">{count}</span> : null}
    </Link>
  );
}
