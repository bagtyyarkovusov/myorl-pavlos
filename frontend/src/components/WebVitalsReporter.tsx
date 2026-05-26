"use client";

import { useCallback, useEffect, useRef } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";

import { getSessionId } from "@/lib/search/session";

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 5;

interface VitalEntry {
  metric: string;
  value: number;
  path: string;
  locale: string;
  device_type: string;
  session_id: string;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getLocaleFromPath(): string {
  const seg = window.location.pathname.split("/").filter(Boolean);
  const first = seg[0] ?? "";
  return first === "el" || first === "ru" ? first : "el";
}

function sendBatch(entries: VitalEntry[]): void {
  if (entries.length === 0) return;

  const body = JSON.stringify({ metrics: entries });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/web-vitals", blob);
  } else {
    fetch("/api/web-vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export default function WebVitalsReporter() {
  const bufferRef = useRef<VitalEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef("");

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (bufferRef.current.length === 0) return;
    sendBatch(bufferRef.current);
    bufferRef.current = [];
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const addMetric = (metric: Metric) => {
      if (!sessionIdRef.current) {
        sessionIdRef.current = getSessionId();
      }
      if (!sessionIdRef.current) return;

      const entry: VitalEntry = {
        metric: metric.name,
        value: metric.value,
        path: window.location.pathname,
        locale: getLocaleFromPath(),
        device_type: getDeviceType(),
        session_id: sessionIdRef.current,
      };

      // Deduplicate by metric name — keep the latest value.
      // CLS accumulates, LCP may update when a larger candidate is found.
      const idx = bufferRef.current.findIndex((e) => e.metric === entry.metric);
      if (idx >= 0) {
        bufferRef.current[idx] = entry;
      } else {
        bufferRef.current.push(entry);
      }

      if (bufferRef.current.length >= MAX_BATCH_SIZE) {
        flush();
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, FLUSH_INTERVAL_MS);
    };

    onCLS(addMetric);
    onFCP(addMetric);
    onINP(addMetric);
    onLCP(addMetric);
    onTTFB(addMetric);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [flush]);

  return null;
}
