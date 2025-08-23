import React, { useState } from "react";

interface DebugInfoProps {
  debugInfo: string[];
  isVisible?: boolean;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({
  debugInfo,
  isVisible = false,
}) => {
  const [expanded, setExpanded] = useState(isVisible);

  if (!debugInfo.length) return null;

  return (
    <div
      style={{
        marginTop: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#000",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          border: "none",
          borderRadius: "8px 8px 0 0",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        Debug Info ({debugInfo.length} entries) {expanded ? "▼" : "▶"}
      </button>

      {expanded && (
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "10px",
            backgroundColor: "#000",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
        >
          {debugInfo.map((info, index) => (
            <div key={index} style={{ marginBottom: "2px" }}>
              {info}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
