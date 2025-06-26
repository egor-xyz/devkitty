declare module '*.mp3';
declare module '*.ogg';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg' {
  import type React from 'react';
  const SVG: React.VFC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}
