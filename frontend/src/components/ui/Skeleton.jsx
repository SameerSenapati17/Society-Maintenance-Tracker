import React from "react";
import { cn } from "../../utils/cn.js";

export default function Skeleton({
  variant = "rectangular", // 'rectangular' | 'text' | 'circular'
  width,
  height,
  className = ""
}) {
  const variantStyles = {
    rectangular: "rounded-lg",
    text: "rounded h-4 w-full",
    circular: "rounded-full"
  };

  const style = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("skeleton", variantStyles[variant] || variantStyles.rectangular, className)}
    />
  );
}

export { Skeleton };
