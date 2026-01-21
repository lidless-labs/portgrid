"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

interface NoteCellProps {
  portId: number;
  note: string;
  onNoteChange: (note: string) => void;
}

export function NoteCell({ portId, note, onNoteChange }: NoteCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(note);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setValue(note);
  }, [note]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (value !== note) {
      onNoteChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(note);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full min-w-[150px] px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Add note..."
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1 cursor-pointer min-w-[150px] px-2 py-1 rounded hover:bg-muted/50 transition-colors"
    >
      {note ? (
        <span className="text-sm">{note}</span>
      ) : (
        <span className="text-sm text-muted-foreground italic">Click to add...</span>
      )}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
