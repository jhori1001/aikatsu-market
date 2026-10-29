"use client";

import { useEffect, useRef, useState } from "react";

/** これ以上動かしたら「スライドさせた」とみなす距離（px）。
 *  押したつもりの微妙な手ぶれでリンクが無効にならないよう余裕を持たせる。 */
const DRAG_THRESHOLD = 6;

/**
 * 横スクロールの並び。
 *
 * 指で触れる端末はそのままスワイプできる。マウスはスクロールバーを隠して
 * いるため掴む場所が無いので、押したまま左右に動かすと動くようにする。
 * 端にいないときだけ矢印も出す（どちらでも動かせる）。
 */
export function Carousel({
  children,
  /** 1枚ずつ止めたい並びに "snap-one" を渡す */
  variant,
}: {
  children: React.ReactNode;
  variant?: "snap-one";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  /** 下に出す帯。つまみの幅と位置（どちらも全体に対する割合） */
  const [bar, setBar] = useState<{ width: number; left: number } | null>(null);

  // 押した位置と、そのときのスクロール量
  const startX = useRef(0);
  const startScroll = useRef(0);
  // 押しているだけの状態と、実際に動かしている状態は分ける
  const pressed = useRef(false);
  const dragging = useRef(false);
  // スライドさせたあとの指離しでリンクを開かないようにするための印
  const moved = useRef(false);
  const clearTimer = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  function update() {
    const el = ref.current;
    if (!el) return;
    // 端数の丸めでボタンが消えないよう、1pxの余裕を見る
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);

    // 動かせる幅が無いときは帯を出さない（出すと、動かせそうに見えてしまう）
    const hidden = el.scrollWidth - el.clientWidth;
    if (hidden <= 1) {
      setBar(null);
      return;
    }
    // つまみの幅は「見えている割合」。短いほど、まだ先があると伝わる。
    // 細くなりすぎると見失うので下限を置く
    const width = Math.max(14, (el.clientWidth / el.scrollWidth) * 100);
    const progress = Math.min(1, Math.max(0, el.scrollLeft / hidden));
    setBar({ width, left: progress * (100 - width) });
  }

  /** スクロール中に毎回状態を更新すると重いので、1フレームに1回にまとめる。 */
  function updateSoon() {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      update();
    });
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  function scrollBy(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    // 1画面ぶんより少し少なく動かす。次に何があるか見えたままになる
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // 指はブラウザ標準のスワイプに任せる。ここで横取りすると
    // 縦スクロールまで拾ってしまい、ページが動かなくなる。
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    // ここではまだ掴まない。押しただけの状態を覚えておく
    pressed.current = true;
    dragging.current = false;
    moved.current = false;
    startX.current = e.clientX;
    startScroll.current = el.scrollLeft;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!pressed.current || !el) return;
    const dx = e.clientX - startX.current;

    // 実際に動かし始めてから掴む。押した瞬間に掴むと、離したときの
    // クリックが中のボタンに届かなくなる（「詳細を見る」が効かなくなった）。
    if (!dragging.current) {
      if (Math.abs(dx) <= DRAG_THRESHOLD) return;
      dragging.current = true;
      moved.current = true;
      el.setPointerCapture(e.pointerId);
      // 引っぱっている間は吸い付きを切る。付けたままだとブラウザが
      // 定位置へ戻そうとして、指の動きと喧嘩してカクつく。
      el.classList.add("dragging");
    }
    el.scrollLeft = startScroll.current - dx;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!pressed.current || !el) return;
    pressed.current = false;
    if (!dragging.current) return;
    dragging.current = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // 離した時点で吸い付きを戻す。いちばん近い1枚へ滑らかに寄る
    el.classList.remove("dragging");

    // 指を離した直後の click を1回だけ止めたい。
    // ただしドラッグが並びの外で終わると click 自体が飛んでこないので、
    // 印を消す役目をそれに任せると、次に押したカードまで開かなくなる
    // （前にこれで詰まった）。必ず自分で消す。
    if (moved.current) {
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => {
        moved.current = false;
        clearTimer.current = null;
      }, 0);
    }
  }

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!moved.current) return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="carousel">
      <div
        className={`rank-carousel ${variant ?? ""}`}
        ref={ref}
        onScroll={updateSoon}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {/* 横に動かせることを、動かす前に知らせるための帯。
          スクロールバーは隠しているので、代わりにこれが位置を示す */}
      {bar ? (
        <div className="carousel-bar" aria-hidden="true">
          <span
            className="carousel-bar-thumb"
            style={{ width: `${bar.width}%`, left: `${bar.left}%` }}
          />
        </div>
      ) : null}

      {!atStart ? (
        <button
          type="button"
          className="carousel-nav prev"
          onClick={() => scrollBy(-1)}
          aria-label="前へ"
        >
          ‹
        </button>
      ) : null}
      {!atEnd ? (
        <button
          type="button"
          className="carousel-nav next"
          onClick={() => scrollBy(1)}
          aria-label="次へ"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
