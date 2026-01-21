"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { DeviceWithPorts, SectionConfig } from "@/types/port";
import { matchesAnyPattern } from "@/lib/utils";

const STORAGE_KEY = "portgrid-device-sections";
const SECTION_ORDER_KEY = "portgrid-section-order";
const DEVICE_ORDER_KEY = "portgrid-section-device-order";

export const UNCATEGORIZED_SECTION = "Uncategorized";

interface StoredAssignments {
  [deviceId: number]: string;  // deviceId -> sectionName
}

interface SectionDeviceOrder {
  [sectionName: string]: number[];  // sectionName -> ordered device IDs
}

export interface DevicesBySection {
  [sectionName: string]: DeviceWithPorts[];
}

export function useDeviceSections(
  devices: DeviceWithPorts[],
  sectionConfigs: SectionConfig[]
) {
  const [manualAssignments, setManualAssignments] = useState<StoredAssignments>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [deviceOrderBySection, setDeviceOrderBySection] = useState<SectionDeviceOrder>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Get all section names (from config + Uncategorized)
  const allSectionNames = useMemo(() => {
    const names = sectionConfigs.map((s) => s.name);
    if (!names.includes(UNCATEGORIZED_SECTION)) {
      names.push(UNCATEGORIZED_SECTION);
    }
    return names;
  }, [sectionConfigs]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedAssignments = localStorage.getItem(STORAGE_KEY);
      if (storedAssignments) {
        setManualAssignments(JSON.parse(storedAssignments));
      }

      const storedSectionOrder = localStorage.getItem(SECTION_ORDER_KEY);
      if (storedSectionOrder) {
        setSectionOrder(JSON.parse(storedSectionOrder));
      }

      const storedDeviceOrder = localStorage.getItem(DEVICE_ORDER_KEY);
      if (storedDeviceOrder) {
        setDeviceOrderBySection(JSON.parse(storedDeviceOrder));
      }
    } catch (e) {
      console.error("Failed to load section data:", e);
    }
    setIsLoaded(true);
  }, []);

  // Determine section for a device (manual > auto-pattern > uncategorized)
  const getDeviceSection = useCallback(
    (device: DeviceWithPorts): string => {
      // Check manual assignment first
      if (manualAssignments[device.device_id]) {
        return manualAssignments[device.device_id];
      }

      // Check auto-assignment patterns
      for (const config of sectionConfigs) {
        if (config.patterns.length > 0) {
          if (
            matchesAnyPattern(device.hostname, config.patterns)
          ) {
            return config.name;
          }
        }
      }

      return UNCATEGORIZED_SECTION;
    },
    [manualAssignments, sectionConfigs]
  );

  // Group devices by section
  const devicesBySection = useMemo((): DevicesBySection => {
    const result: DevicesBySection = {};

    // Initialize all sections
    for (const name of allSectionNames) {
      result[name] = [];
    }

    // Assign devices to sections
    for (const device of devices) {
      const section = getDeviceSection(device);
      if (!result[section]) {
        result[section] = [];
      }
      result[section].push(device);
    }

    // Sort devices within each section by saved order
    for (const sectionName of Object.keys(result)) {
      const order = deviceOrderBySection[sectionName] || [];
      if (order.length > 0) {
        const orderMap = new Map(order.map((id, index) => [id, index]));
        result[sectionName].sort((a, b) => {
          const aOrder = orderMap.get(a.device_id) ?? Infinity;
          const bOrder = orderMap.get(b.device_id) ?? Infinity;
          return aOrder - bOrder;
        });
      }
    }

    return result;
  }, [devices, allSectionNames, getDeviceSection, deviceOrderBySection]);

  // Get ordered section names
  const orderedSections = useMemo(() => {
    if (sectionOrder.length === 0) {
      return allSectionNames;
    }

    // Use saved order, but ensure all sections are included
    const ordered: string[] = [];
    for (const name of sectionOrder) {
      if (allSectionNames.includes(name)) {
        ordered.push(name);
      }
    }
    // Add any new sections not in saved order
    for (const name of allSectionNames) {
      if (!ordered.includes(name)) {
        ordered.push(name);
      }
    }
    return ordered;
  }, [sectionOrder, allSectionNames]);

  // Move device to a different section
  const moveDeviceToSection = useCallback(
    (deviceId: number, newSection: string) => {
      const newAssignments = { ...manualAssignments, [deviceId]: newSection };
      setManualAssignments(newAssignments);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAssignments));
      } catch (e) {
        console.error("Failed to save section assignment:", e);
      }
    },
    [manualAssignments]
  );

  // Reorder devices within a section
  const reorderDevicesInSection = useCallback(
    (sectionName: string, newOrder: number[]) => {
      const newDeviceOrder = { ...deviceOrderBySection, [sectionName]: newOrder };
      setDeviceOrderBySection(newDeviceOrder);
      try {
        localStorage.setItem(DEVICE_ORDER_KEY, JSON.stringify(newDeviceOrder));
      } catch (e) {
        console.error("Failed to save device order:", e);
      }
    },
    [deviceOrderBySection]
  );

  // Reorder sections
  const reorderSections = useCallback((newOrder: string[]) => {
    setSectionOrder(newOrder);
    try {
      localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(newOrder));
    } catch (e) {
      console.error("Failed to save section order:", e);
    }
  }, []);

  // Reset all assignments (revert to auto/default)
  const resetAssignments = useCallback(() => {
    setManualAssignments({});
    setDeviceOrderBySection({});
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DEVICE_ORDER_KEY);
    } catch (e) {
      console.error("Failed to reset assignments:", e);
    }
  }, []);

  return {
    devicesBySection,
    orderedSections,
    moveDeviceToSection,
    reorderDevicesInSection,
    reorderSections,
    resetAssignments,
    isLoaded,
    hasSections: sectionConfigs.length > 0,
  };
}
