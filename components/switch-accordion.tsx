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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PortGridTable } from "@/components/port-grid-table";
import type { DeviceWithPorts } from "@/types/port";
import { Server, GripVertical } from "lucide-react";

interface SwitchAccordionProps {
  devices: DeviceWithPorts[];
  deviceOrder: number[];
  onReorder: (newOrder: number[]) => void;
}

interface SortableDeviceItemProps {
  device: DeviceWithPorts;
}

function SortableDeviceItem({ device }: SortableDeviceItemProps) {
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
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" as const : undefined,
  };

  const upPorts = device.ports.filter(
    (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "up"
  ).length;
  const downPorts = device.ports.filter(
    (p) => p.ifAdminStatus === "up" && p.ifOperStatus === "down"
  ).length;
  const disabledPorts = device.ports.filter(
    (p) => p.ifAdminStatus === "down"
  ).length;

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={`device-${device.device_id}`}
        className={`border rounded-lg px-4 ${isDragging ? "opacity-90 shadow-lg bg-background" : ""}`}
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
              {downPorts > 0 && (
                <Badge variant="default" className="bg-amber-500">
                  {downPorts} inactive
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
    </div>
  );
}

export function SwitchAccordion({ devices, deviceOrder, onReorder }: SwitchAccordionProps) {
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

  // Sort devices according to the saved order
  const sortedDevices = useMemo(() => {
    if (deviceOrder.length === 0) return devices;

    const orderMap = new Map(deviceOrder.map((id, index) => [id, index]));
    return [...devices].sort((a, b) => {
      const aOrder = orderMap.get(a.device_id) ?? Infinity;
      const bOrder = orderMap.get(b.device_id) ?? Infinity;
      return aOrder - bOrder;
    });
  }, [devices, deviceOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedDevices.findIndex((d) => d.device_id === active.id);
      const newIndex = sortedDevices.findIndex((d) => d.device_id === over.id);
      const newSortedDevices = arrayMove(sortedDevices, oldIndex, newIndex);
      onReorder(newSortedDevices.map((d) => d.device_id));
    }
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No devices found matching your filters.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedDevices.map((d) => d.device_id)}
        strategy={verticalListSortingStrategy}
      >
        <Accordion type="multiple" className="space-y-2">
          {sortedDevices.map((device) => (
            <SortableDeviceItem key={device.device_id} device={device} />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}
