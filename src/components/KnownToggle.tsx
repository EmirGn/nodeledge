"use client";

import { useState } from "react";

export default function KnownToggle({
  topicId,
  nodeId,
  initialKnown,
}: {
  topicId: string;
  nodeId: string;
  initialKnown: boolean;
}) {
  const [known, setKnown] = useState(initialKnown);

  const toggle = async () => {
    const next = !known;
    setKnown(next); // optimistic
    const res = await fetch("/api/known", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, nodeId, known: next }),
    });
    if (!res.ok) setKnown(!next);
  };

  return (
    <button className="chip" onClick={toggle}>
      {known ? "understood ×" : "mark as understood"}
    </button>
  );
}
