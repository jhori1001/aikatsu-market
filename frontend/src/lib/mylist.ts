"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * すきなカードリスト。
 *
 * 登録したカードは、見ている人のブラウザの中だけに置く。サーバーにも
 * 当サイトにも送らない（カドソバのマイカードリストと同じ考え方）。
 * 相場を扱わないので枚数は数えず、登録したかどうかの○×だけで足りる。
 */

const KEY = "aikatsu.mylist.v1";
const EVENT = "aikatsu:mylist";

export type MyList = Record<string, true>;

function read(): MyList {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: MyList = {};
    for (const key of Object.keys(parsed as Record<string, unknown>)) {
      out[key] = true;
    }
    return out;
  } catch {
    return {};
  }
}

function write(next: MyList): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できない設定の端末では、その画面の中だけ反映されて終わる
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useMyList() {
  const [items, setItems] = useState<MyList>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);

    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((code: string) => {
    const next = read();
    if (next[code]) delete next[code];
    else next[code] = true;
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((code: string) => {
    const next = read();
    delete next[code];
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write({});
    setItems({});
  }, []);

  return { items, ready, toggle, remove, clear };
}
