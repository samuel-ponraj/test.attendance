import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ListPlus, ShieldCheck } from 'lucide-react';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

const fieldTypeLabels = {
  text: 'Short Text',
  textarea: 'Long Text',
  number: 'Number',
  select: 'Dropdown (Select)',
  radio: 'Radio Buttons',
};

const SYSTEM_FIELDS = [
  { id: 'sys-name', name: 'Full Name', type: 'text', required: true },
  { id: 'sys-email', name: 'Email', type: 'text', required: true },
  { id: 'sys-contact', name: 'Contact', type: 'text', required: false },
];

const SystemFieldRow = ({ field }) => (
  <div className="flex items-start justify-between rounded-md border border-dashed bg-muted/20 p-3 mb-2 opacity-80">
    <div className="flex gap-3">
      <div className="p-1 -ml-1 mt-0.5">
        <ShieldCheck className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{field.name}</p>
          {field.required && <span className="text-[10px] text-muted-foreground/60 font-bold">REQUIRED</span>}
        </div>
        <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tight">System Default</p>
      </div>
    </div>
    <div className="text-[10px] text-muted-foreground italic self-center px-2">Fixed</div>
  </div>
);

const SortableField = ({ field, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start justify-between rounded-md border bg-card p-3 shadow-sm mb-2 group touch-none">
      <div className="flex gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 mt-0.5 hover:bg-muted rounded transition-colors">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{field.name}</p>
            {field.required && <span className="text-[10px] text-destructive font-bold underline">REQ</span>}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">{fieldTypeLabels[field.type]}</p>
          {field.options && (
            <div className="flex flex-wrap gap-1 mt-1">
              {field.options.map((opt, i) => (
                <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded border">{opt}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(field.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const FormBuilder = ({ fields, onChange }) => {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('textarea');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isOptionBased = fieldType === 'select' || fieldType === 'radio';

  const handleAdd = () => {
    const trimmedName = fieldName.trim();
    if (!trimmedName) return;
    if (SYSTEM_FIELDS.some(sf => sf.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert(`"${trimmedName}" is already included by default.`);
      return;
    }

    let options = [];
    if (isOptionBased) {
      options = fieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
      if (options.length === 0) return alert("Please add at least one option");
    }

    const newField = { id: `field-${Date.now()}`, name: trimmedName, type: fieldType, required: fieldRequired, options: isOptionBased ? options : null };
    onChange([...fields, newField]);
    setFieldName(''); setFieldType('text'); setFieldRequired(false); setFieldOptions('');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      onChange(arrayMove(fields, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex flex-col max-h-[65vh] w-full overflow-hidden border rounded-lg bg-background">
      <div className="flex-shrink-0 bg-muted/30 p-4 border-b">
        <h4 className="text-sm font-semibold mb-3">Add Custom Field</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase text-muted-foreground">Field Label</Label>
            <Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g., Address" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase text-muted-foreground">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(fieldTypeLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {isOptionBased && (
          <div className="mt-3 space-y-1 bg-background p-2 rounded border border-dashed">
            <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
              <ListPlus className="w-3 h-3" /> Options (Comma separated)
            </Label>
            <Input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="Sales, HR, Tech" className="h-8 text-sm" />
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Switch checked={fieldRequired} onCheckedChange={setFieldRequired} className="scale-75" />
            <Label className="text-xs text-muted-foreground">Required</Label>
          </div>
          <Button type="button" size="sm" onClick={handleAdd} disabled={!fieldName.trim()} className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="p-3 pt-5 border-b bg-muted/10 ">
          <Label className="text-[12px] uppercase font-bold tracking-wider">Form Preview</Label>
        </div>
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {SYSTEM_FIELDS.map(sf => <SystemFieldRow key={sf.id} field={sf} />)}
          {fields.length > 0 && (
            <>
              <div className="relative my-4 flex-shrink-0">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                <div className="relative flex justify-center text-[9px] uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-bold">Custom Draggable Fields</span>
                </div>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="pb-2">
                    {fields.map((field) => (
                      <SortableField key={field.id} field={field} onDelete={(id) => onChange(fields.filter(f => f.id !== id))} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;