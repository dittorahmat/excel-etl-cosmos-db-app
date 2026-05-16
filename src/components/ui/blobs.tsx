"use client";
import type React from "react";

export function AnimatedBlobs() {
  const blobStyle = {
    "--border-radius": "115% 140% 145% 110% / 125% 140% 110% 125%",
    "--border-width": "1.5vmin",
    aspectRatio: "1",
    display: "block",
    gridArea: "stack",
    backgroundSize: "calc(100% + var(--border-width) * 2)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    border: "var(--border-width) solid transparent",
    borderRadius: "var(--border-radius)",
    filter: "blur(0.5vmin)",
    width: "100%",
    height: "100%",
    position: "absolute",
    inset: "0",
    maskImage: "linear-gradient(white, white), linear-gradient(white, white)",
    maskClip: "padding-box, border-box",
    maskComposite: "exclude",
    WebkitMaskComposite: "xor",
  } as React.CSSProperties;

  const blobs = [
    {
      backgroundColor: "#275598",
      backgroundImage: "linear-gradient(#275598, #4071b8, #275598)",
      transform: "rotate(30deg) scale(1.03)",
      opacity: 0.8,
    },
    {
      backgroundColor: "#ffc600",
      backgroundImage: "linear-gradient(#ffc600, #ffda4d, #ffc600)",
      transform: "rotate(60deg) scale(0.95)",
      opacity: 0.8,
    },
    {
      backgroundColor: "#6bc048",
      backgroundImage: "linear-gradient(#6bc048, #86d465, #6bc048)",
      transform: "rotate(90deg) scale(0.97)",
      opacity: 0.8,
    },
    {
      backgroundColor: "#9f1897",
      backgroundImage: "linear-gradient(#9f1897, #c144b9, #9f1897)",
      transform: "rotate(120deg) scale(1.02)",
      opacity: 0.8,
    },
  ];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none -z-10 w-[150%] h-[150%] max-w-[700px] max-h-[700px]">
      <div 
        className="relative w-[400px] h-[400px] sm:w-[550px] sm:h-[550px]"
        style={{
          animation: "spin 25s linear infinite",
          transformOrigin: "center center"
        }}
      >
        {blobs.map((blob, index) => (
          <span
            key={index}
            style={{
              ...blobStyle,
              ...blob,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
