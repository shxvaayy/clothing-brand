"use client";

import { useState } from "react";

const DEVICES = [
  { key: "mobile", label: "Mobile", width: 390 },
  { key: "tablet", label: "Tablet", width: 768 },
  { key: "desktop", label: "Desktop", width: 1280 },
] as const;

export default function PreviewFrameSwitcher({ src }: { src: string }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]>(DEVICES[2]);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {DEVICES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDevice(d)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium ${
              device.key === d.key ? "bg-ink-800 text-white" : "border border-cream-300 bg-white text-ink-600"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto border border-cream-300 bg-ink-900/5 p-4">
        <iframe
          src={src}
          title="Product preview"
          style={{ width: device.width, maxWidth: "100%" }}
          className="mx-auto block h-[75vh] border border-cream-300 bg-white shadow-lg"
        />
      </div>
    </div>
  );
}
