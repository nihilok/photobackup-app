import React, { useState, useEffect } from "react";

interface DebugInfoProps {
  debugInfo: string[];
  isVisible?: boolean;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({
  debugInfo,
  isVisible = false,
}) => {
  const [expanded, setExpanded] = useState(isVisible);

  useEffect(() => {
    setExpanded(isVisible);
  }, [isVisible]);

  if (!isVisible && debugInfo.length === 0) return null;

  const entryCount = debugInfo.length;

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
        Debug Info ({entryCount} {entryCount === 1 ? "entry" : "entries"}){" "}
        {expanded ? "▼" : "▶"}
      </button>

      {expanded && (
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "10px",
            backgroundColor: "#000",
            color: "#e8e8e8",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
        >
          {entryCount === 0 ? (
            <div style={{ opacity: 0.8 }}>Waiting for logs…</div>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} style={{ marginBottom: "2px" }}>
                {info}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
