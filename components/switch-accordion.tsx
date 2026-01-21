"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  type DragOverEvent,
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
import { Button } from "@/components/ui/button";
import { PortGridTable } from "@/components/port-grid-table";
import type { DeviceWithPorts } from "@/types/port";
import { Server, GripVertical, ChevronDown, Folder, X, Pencil } from "lucide-react";

const GROUPS_STORAGE_KEY = "portgrid-device-groups";
const ORDER_STORAGE_KEY = "portgrid-device-order";

interface DeviceGroup {
  id: string;
  name: string;
  deviceIds: number[];
}

interface SwitchAccordionProps {
  devices: DeviceWithPorts[];
}

// Simple drag overlay that doesn't use AccordionItem
function DragOverlayContent({ device }: { device: DeviceWithPorts }) {
  return (
    <div className="border rounded-lg px-4 py-3 bg-background shadow-lg opacity-90">
      <div className="flex items-center gap-4">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <Server className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">{device.hostname}</span>
      </div>
    </div>
  );
}

interface SortableDeviceProps {
  device: DeviceWithPorts;
  isOverTarget?: boolean;
}

function SortableDevice({ device, isOverTarget }: SortableDeviceProps) {
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

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={`device-${device.device_id}`}
        className={`border rounded-lg px-4 transition-all ${
          isOverTarget ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""
        }`}
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
    </div>
  );
}

interface GroupHeaderProps {
  group: DeviceGroup;
  devices: DeviceWithPorts[];
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

function GroupHeader({ group, devices, isExpanded, onToggle, onRename, onDelete }: GroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const totalPorts = devices.reduce((sum, d) => sum + d.ports.length, 0);

  const handleSubmit = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 mb-2 p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left">
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
        <Folder className="h-5 w-5 text-primary" />
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-lg bg-transparent border-b border-primary focus:outline-none"
            autoFocus
          />
        ) : (
          <span className="font-semibold text-lg">{group.name}</span>
        )}
        <span className="text-sm text-muted-foreground">
          ({devices.length} {devices.length === 1 ? "device" : "devices"}, {totalPorts} ports)
        </span>
      </button>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function SwitchAccordion({ devices }: SwitchAccordionProps) {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [deviceOrder, setDeviceOrder] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeDevice, setActiveDevice] = useState<DeviceWithPorts | null>(null);
  const [overDeviceId, setOverDeviceId] = useState<number | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (storedGroups) {
        const parsed = JSON.parse(storedGroups);
        setGroups(parsed);
        setExpandedGroups(new Set(parsed.map((g: DeviceGroup) => g.id)));
      }
      const storedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
      if (storedOrder) {
        setDeviceOrder(JSON.parse(storedOrder));
      }
    } catch (e) {
      console.error("Failed to load groups:", e);
    }
  }, []);

  // Save groups to localStorage
  const saveGroups = useCallback((newGroups: DeviceGroup[]) => {
    setGroups(newGroups);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(newGroups));
  }, []);

  // Save order to localStorage
  const saveOrder = useCallback((newOrder: number[]) => {
    setDeviceOrder(newOrder);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get devices not in any group
  const groupedDeviceIds = useMemo(
    () => new Set(groups.flatMap((g) => g.deviceIds)),
    [groups]
  );

  // Sort devices by saved order
  const sortedDevices = useMemo(() => {
    if (deviceOrder.length === 0) return devices;
    const orderMap = new Map(deviceOrder.map((id, idx) => [id, idx]));
    return [...devices].sort((a, b) => {
      const aOrder = orderMap.get(a.device_id) ?? Infinity;
      const bOrder = orderMap.get(b.device_id) ?? Infinity;
      return aOrder - bOrder;
    });
  }, [devices, deviceOrder]);

  const ungroupedDevices = useMemo(
    () => sortedDevices.filter((d) => !groupedDeviceIds.has(d.device_id)),
    [sortedDevices, groupedDeviceIds]
  );

  const deviceMap = useMemo(
    () => new Map(devices.map((d) => [d.device_id, d])),
    [devices]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const device = deviceMap.get(event.active.id as number);
    setActiveDevice(device || null);
  };

  // Find which group a device belongs to
  const findDeviceGroup = (deviceId: number): DeviceGroup | undefined => {
    return groups.find((g) => g.deviceIds.includes(deviceId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as number | undefined;
    const activeId = event.active.id as number;

    if (overId && overId !== activeId) {
      // Don't highlight if dragging within the same group
      const activeGroup = findDeviceGroup(activeId);
      const overGroup = findDeviceGroup(overId);

      if (activeGroup && overGroup && activeGroup.id === overGroup.id) {
        setOverDeviceId(null);
      } else {
        setOverDeviceId(overId);
      }
    } else {
      setOverDeviceId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDevice(null);
    setOverDeviceId(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    if (activeId === overId) return;

    const activeInGroup = groupedDeviceIds.has(activeId);
    const overInGroup = groupedDeviceIds.has(overId);
    const activeGroup = findDeviceGroup(activeId);
    const overGroup = findDeviceGroup(overId);

    // Case 1: Both ungrouped - create new group
    if (!activeInGroup && !overInGroup) {
      const newGroup: DeviceGroup = {
        id: `group-${Date.now()}`,
        name: "New Group",
        deviceIds: [overId, activeId],
      };
      saveGroups([...groups, newGroup]);
      setExpandedGroups((prev) => new Set([...prev, newGroup.id]));
      return;
    }

    // Case 2: Dragging ungrouped onto grouped device - add to that group
    if (!activeInGroup && overGroup) {
      saveGroups(
        groups.map((g) =>
          g.id === overGroup.id
            ? { ...g, deviceIds: [...g.deviceIds, activeId] }
            : g
        )
      );
      return;
    }

    // Case 3: Dragging grouped device onto ungrouped - add ungrouped to the group
    if (activeGroup && !overInGroup) {
      saveGroups(
        groups.map((g) =>
          g.id === activeGroup.id
            ? { ...g, deviceIds: [...g.deviceIds, overId] }
            : g
        )
      );
      return;
    }

    // Case 4: Both in different groups - move active device to over's group
    if (activeGroup && overGroup && activeGroup.id !== overGroup.id) {
      // Remove from old group
      const updatedGroups = groups.map((g) => {
        if (g.id === activeGroup.id) {
          return { ...g, deviceIds: g.deviceIds.filter((id) => id !== activeId) };
        }
        if (g.id === overGroup.id) {
          return { ...g, deviceIds: [...g.deviceIds, activeId] };
        }
        return g;
      });
      // Remove empty groups (less than 2 devices)
      saveGroups(updatedGroups.filter((g) => g.deviceIds.length >= 2));
      return;
    }

    // Case 5: Reorder ungrouped devices
    if (!activeInGroup && !overInGroup) {
      const oldIndex = ungroupedDevices.findIndex((d) => d.device_id === activeId);
      const newIndex = ungroupedDevices.findIndex((d) => d.device_id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newUngrouped = arrayMove(ungroupedDevices, oldIndex, newIndex);
        saveOrder(newUngrouped.map((d) => d.device_id));
      }
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const renameGroup = (groupId: string, newName: string) => {
    saveGroups(groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g)));
  };

  const deleteGroup = (groupId: string) => {
    saveGroups(groups.filter((g) => g.id !== groupId));
  };

  const removeFromGroup = (groupId: string, deviceId: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (group.deviceIds.length <= 2) {
      // Dissolve group if only 1 device would remain
      deleteGroup(groupId);
    } else {
      saveGroups(
        groups.map((g) =>
          g.id === groupId
            ? { ...g, deviceIds: g.deviceIds.filter((id) => id !== deviceId) }
            : g
        )
      );
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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Grouped devices */}
      {groups.map((group) => {
        const groupDevices = group.deviceIds
          .map((id) => deviceMap.get(id))
          .filter((d): d is DeviceWithPorts => d !== undefined);

        if (groupDevices.length === 0) return null;

        return (
          <div key={group.id} className="mb-6">
            <GroupHeader
              group={group}
              devices={groupDevices}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onRename={(name) => renameGroup(group.id, name)}
              onDelete={() => deleteGroup(group.id)}
            />
            {expandedGroups.has(group.id) && (
              <div className="ml-4 border-l-2 border-muted pl-4">
                <SortableContext
                  items={groupDevices.map((d) => d.device_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Accordion type="multiple" className="space-y-2">
                    {groupDevices.map((device) => (
                      <div key={device.device_id} className="relative group/item">
                        <SortableDevice
                          device={device}
                          isOverTarget={overDeviceId === device.device_id}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-2 top-2 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={() => removeFromGroup(group.id, device.device_id)}
                          title="Remove from group"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </Accordion>
                </SortableContext>
              </div>
            )}
          </div>
        );
      })}

      {/* Ungrouped devices - sortable */}
      <SortableContext
        items={ungroupedDevices.map((d) => d.device_id)}
        strategy={verticalListSortingStrategy}
      >
        <Accordion type="multiple" className="space-y-2">
          {ungroupedDevices.map((device) => (
            <SortableDevice
              key={device.device_id}
              device={device}
              isOverTarget={overDeviceId === device.device_id}
            />
          ))}
        </Accordion>
      </SortableContext>

      <DragOverlay>
        {activeDevice && <DragOverlayContent device={activeDevice} />}
      </DragOverlay>

      {groups.length === 0 && ungroupedDevices.length > 1 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Tip: Drag one device onto another to create a group
        </p>
      )}
    </DndContext>
  );
}
