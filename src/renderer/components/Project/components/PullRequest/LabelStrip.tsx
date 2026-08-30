import { Tooltip } from '@blueprintjs/core';
import { type CSSProperties, type FC, useLayoutEffect, useRef, useState } from 'react';
import { cn } from 'renderer/utils/cn';

type Label = { color: string; id: number; name: string };

const pillClass = cn(
  'rounded-full border px-2 py-px text-[10px] shrink-0 max-w-[160px] truncate',
  'border-[color-mix(in_srgb,var(--label)_45%,transparent)]',
  'text-[color-mix(in_srgb,var(--label)_70%,black)]',
  'dark:text-[color-mix(in_srgb,var(--label)_80%,white)]'
);

const pillStyle = (color: string) => ({ '--label': `#${color}` }) as CSSProperties;

// Inline label pills that adapt to the width they're given: only whole labels
// that fully fit are shown; the rest collapse into a "+N" pill that lists them
// (as colored pills) on hover. A ResizeObserver re-fits on any width change, so
// the row never shows a half-clipped label.
export const LabelStrip: FC<{ labels: Label[] }> = ({ labels }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(labels.length);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const pills = Array.from(wrap.querySelectorAll<HTMLElement>('[data-pill]'));
      // Force every pill visible so their laid-out positions are real, read the
      // rects, then release back to React's `hidden` control.
      pills.forEach((p) => (p.style.display = 'inline-flex'));
      const { right } = wrap.getBoundingClientRect();
      const plusW = 52; // room reserved for the "+N" pill when we hide any

      let fit = pills.length;
      for (let i = 0; i < pills.length; i += 1) {
        // Reserve space for the +N pill whenever hiding here would leave any
        // label out (i.e. this is not the last label).
        const limit = right - (i < pills.length - 1 ? plusW : 0);
        if (pills[i].getBoundingClientRect().right > limit) {
          fit = i;
          break;
        }
      }
      pills.forEach((p) => (p.style.display = ''));
      setCount(fit);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    return () => ro.disconnect();
  }, [labels]);

  return (
    <div
      className="flex flex-1 items-center gap-1.5 min-w-0 overflow-hidden"
      ref={wrapRef}
    >
      {labels.map((label, i) => (
        <div
          className={pillClass}
          data-pill
          hidden={i >= count}
          key={label.id}
          style={pillStyle(label.color)}
          title={label.name}
        >
          {label.name}
        </div>
      ))}

      {count < labels.length && (
        <Tooltip
          content={
            <div className="flex flex-col items-start gap-1.5 py-0.5">
              {labels.slice(count).map((label) => (
                <div
                  className={cn(pillClass, 'max-w-none')}
                  key={label.id}
                  style={pillStyle(label.color)}
                >
                  {label.name}
                </div>
              ))}
            </div>
          }
          placement="bottom"
        >
          <div className="rounded-full border border-bp-gray-4/40 px-2 py-px text-[10px] shrink-0 text-bp-gray-3">
            +{labels.length - count}
          </div>
        </Tooltip>
      )}
    </div>
  );
};
