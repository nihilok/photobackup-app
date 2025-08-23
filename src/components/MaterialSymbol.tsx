import React from "react";
import "material-symbols/outlined.css";

interface MaterialSymbolProps {
  icon: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  filled?: boolean;
}

export const MaterialSymbol: React.FC<MaterialSymbolProps> = ({
  icon,
  size = 24,
  color,
  className = "",
  style = {},
  filled = false,
}) => {
  const symbolStyle: React.CSSProperties = {
    fontSize: typeof size === "number" ? `${size}px` : size,
    color,
    fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
    verticalAlign: "middle",
    display: "inline-flex",
    alignItems: "center",
    ...style,
  };

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={symbolStyle}
    >
      {icon}
    </span>
  );
};
