"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    () => typeof window === "undefined" || window.navigator.onLine,
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="no-print fixed inset-x-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-[var(--warning-soft)]0/10 px-4 py-3 text-sm font-medium text-amber-400 shadow-lg shadow-amber-500/5 backdrop-blur-xl">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Anda sedang offline. Data terbaru mungkin belum tersinkron dan aksi server tidak akan
        tersimpan sampai koneksi kembali.
      </span>
    </div>
  );
}
