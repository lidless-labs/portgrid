"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PortGridTable } from "@/components/port-grid-table";
import type { DeviceWithPorts } from "@/types/port";
import { Server, GripVertical, ChevronDown, Folder } from "lucide-react";
import type { DevicesBySection } from "@/hooks/use-device-sections";

interface SwitchAccordionProps {
  devicesBySection: DevicesBySection;
  orderedSections: string[];
  onMoveDevice: (deviceId: number, toSection: string) => void;
  onReorderDevices: (sectionName: string, newOrder: number[]) => void;
  hasSections: boolean;
}

interface SortableDeviceItemProps {
  device: DeviceWithPorts;
  isDragOverlay?: boolean;
}

function SortableDeviceItem({ device, isDragOverlay }: SortableDeviceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: device.device_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const upPorts = device.ports.filter(
    (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "up"
  ).length;
  const inactivePorts = device.ports.filter(
    (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "down"
  ).length;
  const disabledPorts = device.ports.filter(
    (p) => p.ifAdminStatus === "down"
  ).length;

  const content = (
    <AccordionItem
      value={`device-${device.device_id}`}
      className={`border rounded-lg px-4 ${isDragOverlay ? "shadow-lg bg-background" : ""}`}
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-muted rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <Server className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">{device.hostname}</span>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-600">
              {upPorts} up
            </Badge>
            {inactivePorts > 0 && (
              <Badge variant="default" className="bg-amber-500">
                {inactivePorts} inactive
              </Badge>
            )}
            {disabledPorts > 0 && (
              <Badge variant="destructive">{disabledPorts} disabled</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            ({device.ports.length} total)
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <PortGridTable ports={device.ports} />
      </AccordionContent>
    </AccordionItem>
  );

  if (isDragOverlay) {
    return <div className="opacity-90">{content}</div>;
  }

  return (
    <div ref={setNodeRef} style={style}>
      {content}
    </div>
  );
}

function DeviceOverlay({ device }: { device: DeviceWithPorts }) {
  return <SortableDeviceItem device={device} isDragOverlay />;
}

interface SectionProps {
  name: string;
  devices: DeviceWithPorts[];
  isExpanded: boolean;
  onToggle: () => void;
}

function Section({ name, devices, isExpanded, onToggle }: SectionProps) {
  const totalPorts = devices.reduce((sum, d) => sum + d.ports.length, 0);

  return (
    <div className="mb-6">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full text-left mb-3 p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
        <Folder className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">{name}</span>
        <span className="text-sm text-muted-foreground">
          ({devices.length} {devices.length === 1 ? "device" : "devices"}, {totalPorts} ports)
        </span>
      </button>

      {isExpanded && (
        <div className="ml-4 border-l-2 border-muted pl-4">
          {devices.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Drag devices here to add them to this section
            </div>
          ) : (
            <SortableContext
              items={devices.map((d) => d.device_id)}
              strategy={verticalListSortingStrategy}
            >
              <Accordion type="multiple" className="space-y-2">
                {devices.map((device) => (
                  <SortableDeviceItem key={device.device_id} device={device} />
                ))}
              </Accordion>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

export function SwitchAccordion({
  devicesBySection,
  orderedSections,
  onMoveDevice,
  onReorderDevices,
  hasSections,
}: SwitchAccordionProps) {
  const [activeDevice, setActiveDevice] = useState<DeviceWithPorts | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(orderedSections)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which section a device is in
  const findDeviceSection = (deviceId: number): string | null => {
    for (const [section, devices] of Object.entries(devicesBySection)) {
      if (devices.some((d) => d.device_id === deviceId)) {
        return section;
      }
    }
    return null;
  };

  // Find device by ID across all sections
  const findDevice = (deviceId: number): DeviceWithPorts | null => {
    for (const devices of Object.values(devicesBySection)) {
      const device = devices.find((d) => d.device_id === deviceId);
      if (device) return device;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const device = findDevice(event.active.id as number);
    setActiveDevice(device);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDevice(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    if (activeId === overId) return;

    const activeSection = findDeviceSection(activeId);
    const overSection = findDeviceSection(overId);

    if (!activeSection || !overSection) return;

    if (activeSection === overSection) {
      // Reorder within section
      const devices = devicesBySection[activeSection];
      const oldIndex = devices.findIndex((d) => d.device_id === activeId);
      const newIndex = devices.findIndex((d) => d.device_id === overId);
      const newOrder = arrayMove(
        devices.map((d) => d.device_id),
        oldIndex,
        newIndex
      );
      onReorderDevices(activeSection, newOrder);
    } else {
      // Move to different section
      onMoveDevice(activeId, overSection);
    }
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  const allDevices = useMemo(
    () => Object.values(devicesBySection).flat(),
    [devicesBySection]
  );

  if (allDevices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No devices found matching your filters.
      </div>
    );
  }

  // If no sections configured, show flat list
  if (!hasSections) {
    const devices = devicesBySection["Uncategorized"] || allDevices;
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={devices.map((d) => d.device_id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" className="space-y-2">
            {devices.map((device) => (
              <SortableDeviceItem key={device.device_id} device={device} />
            ))}
          </Accordion>
        </SortableContext>
        <DragOverlay>
          {activeDevice && <DeviceOverlay device={activeDevice} />}
        </DragOverlay>
      </DndContext>
    );
  }

  // Show sectioned view
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {orderedSections.map((sectionName) => {
        const devices = devicesBySection[sectionName] || [];
        // Skip empty sections except Uncategorized
        if (devices.length === 0 && sectionName !== "Uncategorized") {
          return null;
        }
        return (
          <Section
            key={sectionName}
            name={sectionName}
            devices={devices}
            isExpanded={expandedSections.has(sectionName)}
            onToggle={() => toggleSection(sectionName)}
          />
        );
      })}
      <DragOverlay>
        {activeDevice && <DeviceOverlay device={activeDevice} />}
      </DragOverlay>
    </DndContext>
  );
}
