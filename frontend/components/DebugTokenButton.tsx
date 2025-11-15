"use client";

import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

export function DebugTokenButton() {
  const handleClick = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const token = await user.getIdToken();

    try {
      await navigator.clipboard.writeText(token);
    } catch {
      // Clipboard copy failed silently
    }

    // Save globally for convenience
    (window as any).trainerToken = token;
  };

  return (
    <button
      className="border px-3 py-1 rounded-md text-sm mt-4"
      onClick={handleClick}
    >
      Log Firebase Token
    </button>
  );
}

