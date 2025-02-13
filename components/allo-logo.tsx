"use client";

import { cn } from "@/lib/utils";
import SVG from 'react-inlinesvg';

const removeFillAttributes = (code: string) => code.replace(/fill=".*?"/g, '');

interface AlloLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function AlloLogo({ width = 218, height = 175, className }: AlloLogoProps) {
  return (
    <SVG
      src="/allo.svg"
      width={width}
      height={height}
      className={cn("[&>path]:fill-brand-blue", className)}
      preProcessor={removeFillAttributes}
      cacheRequests={true}
    />
  );
}
