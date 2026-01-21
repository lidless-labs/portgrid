"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "portgrid-port-notes";

type PortNotes = Record<string, string>;

export function usePortNotes() {
  const [notes, setNotes] = useState<PortNotes>({});
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch {
        // Invalid JSON, start fresh
      }
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever notes change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes, mounted]);

  const setNote = useCallback((portId: number, note: string) => {
    setNotes((prev) => {
      if (note.trim() === "") {
        // Remove empty notes
        const { [portId.toString()]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [portId.toString()]: note };
    });
  }, []);

  const getNote = useCallback(
    (portId: number): string => {
      return notes[portId.toString()] || "";
    },
    [notes]
  );

  return { notes, setNote, getNote, mounted };
}
