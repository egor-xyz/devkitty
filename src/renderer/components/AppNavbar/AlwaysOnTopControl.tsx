import { Button, Popover, Slider } from '@blueprintjs/core';
import { useEffect, useRef, useState } from 'react';
import { usePinnedAppearance } from 'renderer/hooks/usePinnedAppearance';
import {
  WINDOW_OPACITY_MAX,
  WINDOW_OPACITY_MIN,
  WINDOW_OPACITY_STEP,
  type WindowOpacity
} from 'types/window';

import { PinIcon } from './NavIcons';

const HOVER_CLOSE_DELAY = 200;
const opacityToPercent = (opacity: WindowOpacity) => Math.round(opacity * 100);
const percentToOpacity = (percent: number): WindowOpacity => percent / 100;
const percentLabel = (percent: number) => `${percent}%`;

export const AlwaysOnTopControl = () => {
  const {
    alwaysOnTop,
    initialize,
    opacity,
    setOpacity,
    togglePin
  } = usePinnedAppearance();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const draggingRef = useRef(false);
  const releaseGuardRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    void initialize();

    return () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    };
  }, [initialize]);

  useEffect(() => {
    if (!alwaysOnTop) setPopoverOpen(false);
  }, [alwaysOnTop]);

  const changeOpacity = (percent: number) => {
    setOpacity(percentToOpacity(percent));
  };

  const beginSliderInteraction = (event: { target: EventTarget }) => {
    if (!(event.target instanceof Element) || !event.target.closest('.bp6-slider')) return;

    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    draggingRef.current = true;
    releaseGuardRef.current = false;
    closeRequestedRef.current = false;
    setPopoverOpen(true);
  };

  const finishSliderInteraction = () => {
    draggingRef.current = false;
    releaseGuardRef.current = true;
    releaseTimerRef.current = setTimeout(() => {
      releaseGuardRef.current = false;
      if (closeRequestedRef.current) setPopoverOpen(false);
    }, HOVER_CLOSE_DELAY);
  };

  const handlePopoverInteraction = (nextOpen: boolean) => {
    if (nextOpen) {
      closeRequestedRef.current = false;
      setPopoverOpen(true);
    } else if (draggingRef.current || releaseGuardRef.current) {
      closeRequestedRef.current = true;
    } else {
      setPopoverOpen(false);
    }
  };

  const opacitySlider = (
    <div
      className="w-56 px-4 py-3"
      onMouseDownCapture={beginSliderInteraction}
      onTouchStartCapture={beginSliderInteraction}
    >
      <div className="mb-3 flex items-center justify-between gap-4 text-sm font-semibold">
        <span>Window opacity</span>
        <span className="tabular-nums">{percentLabel(opacityToPercent(opacity))}</span>
      </div>

      <Slider
        handleHtmlProps={{
          'aria-label': 'Window opacity'
        }}
        labelRenderer={false}
        max={opacityToPercent(WINDOW_OPACITY_MAX)}
        min={opacityToPercent(WINDOW_OPACITY_MIN)}
        onChange={changeOpacity}
        onRelease={finishSliderInteraction}
        stepSize={opacityToPercent(WINDOW_OPACITY_STEP)}
        value={opacityToPercent(opacity)}
      />

      <div className="mt-1 flex justify-between text-xs text-bp-gray-1 dark:text-bp-gray-4">
        <span>{percentLabel(opacityToPercent(WINDOW_OPACITY_MIN))}</span>
        <span>{percentLabel(opacityToPercent(WINDOW_OPACITY_MAX))}</span>
      </div>

    </div>
  );

  return (
    <Popover
      content={opacitySlider}
      disabled={!alwaysOnTop}
      hoverCloseDelay={HOVER_CLOSE_DELAY}
      hoverOpenDelay={300}
      interactionKind="hover"
      isOpen={alwaysOnTop && popoverOpen}
      minimal
      modifiers={{
        flip: { enabled: false },
        offset: { enabled: true, options: { offset: [0, 8] } }
      }}
      onInteraction={handlePopoverInteraction}
      placement="bottom"
    >
      <Button
        aria-label="Toggle always on top"
        aria-pressed={alwaysOnTop}
        icon={(
          <PinIcon
            size={16}
            style={alwaysOnTop ? { color: '#F5854A' } : undefined}
          />
        )}
        minimal
        onClick={togglePin}
      />
    </Popover>
  );
};
