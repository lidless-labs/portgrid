"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "portgrid-device-order";

export function useDeviceOrder() {
  const [deviceOrder, setDeviceOrder] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDeviceOrder(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load device order:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when order changes
  const updateOrder = useCallback((newOrder: number[]) => {
    setDeviceOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch (e) {
      console.error("Failed to save device order:", e);
    }
  }, []);

  // Reset to default (alphabetical) order
  const resetOrder = useCallback(() => {
    setDeviceOrder([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to reset device order:", e);
    }
  }, []);

  return {
    deviceOrder,
    updateOrder,
    resetOrder,
    isLoaded,
  };
}
