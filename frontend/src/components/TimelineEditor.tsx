import { useState, useEffect } from 'react';
import type { TimelineItem } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Plus, Check, X } from 'lucide-react';
import clsx from 'clsx';

interface TimelineEditorProps {
  items: TimelineItem[];
  isEditing: boolean;
  onSpotClick: (spotName: string) => void;
  onChange: (items: TimelineItem[]) => void;
  onLocationAdd: (name: string, coords: [number, number]) => void;
}

export function TimelineEditor({ items, isEditing, onSpotClick, onChange, onLocationAdd }: TimelineEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTime, setNewTime] = useState("12:00");
  const [newEventName, setNewEventName] = useState("");

  useEffect(() => {
    if (isAdding && window.AMap) {
      const auto = new window.AMap.AutoComplete({ input: "place-search-input" });
      
      auto.on("select", (e: any) => {
         const poi = e.poi;
         if (poi.location) {
            setNewEventName(poi.name);
            onLocationAdd(poi.name, [poi.location.lng, poi.location.lat]);
         } else {
            const placeSearch = new window.AMap.PlaceSearch({ city: poi.adcode });
            placeSearch.search(poi.name, (status: string, result: any) => {
               if (status === 'complete' && result.info === 'OK' && result.poiList.pois.length > 0) {
                  const p = result.poiList.pois[0];
                  setNewEventName(p.name);
                  onLocationAdd(p.name, [p.location.lng, p.location.lat]);
               }
            });
         }
      });
    }
  }, [isAdding]);

  const handleAddSubmit = () => {
    if (!newEventName) return;
    const newItem: TimelineItem = {
      id: `new-item-${Date.now()}`,
      time: newTime,
      event: newEventName,
    };
    onChange([...items, newItem]);
    setIsAdding(false);
    setNewEventName("");
    setNewTime("12:00");
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = Array.from(items);
    newItems.splice(index, 1);
    onChange(newItems);
  };

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-0 w-[2px] bg-gradient-to-b from-accent to-gold" />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="timeline-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-6">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isEditing}>
                  {(provided, snapshot) => {
                    const clickable = !!item.spot;
                    const onClick = clickable ? () => onSpotClick(item.spot!) : undefined;
                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        onClick={onClick}
                        className={clsx(
                          "relative flex items-start group",
                          clickable && "cursor-pointer hover:bg-black/5 rounded-lg p-2 -ml-2 -mt-2 transition-colors",
                          snapshot.isDragging && "opacity-80 z-50 bg-white rounded-lg shadow-xl"
                        )}
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-white" />
                      {/* Content */}
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone tracking-wider mb-1">
                          {index === items.length - 1 ? '抵达' : '出发'} {item.time}
                        </div>
                        <div className={clsx(
                          "text-sm", 
                          item.spot ? "text-accent underline decoration-dotted underline-offset-4 font-medium" : "text-ink font-medium"
                        )}>
                          {item.spot || item.event}
                        </div>
                      </div>

                      {/* Editing Actions */}
                      {isEditing && (
                        <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleRemove(index)}
                            className="p-1 text-stone hover:text-rose-600 rounded bg-cream"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div {...provided.dragHandleProps} className="p-1 text-stone cursor-grab active:cursor-grabbing hover:bg-cream rounded">
                            <GripVertical size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isEditing && !isAdding && (
        <div className="mt-8 flex justify-center">
           <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-xl text-stone text-sm hover:border-accent hover:text-accent transition-colors w-full justify-center">
              <Plus size={16} /> 添加行程节点 (支持地名检索)
           </button>
        </div>
      )}

      {isEditing && isAdding && (
        <div className="mt-8 p-4 bg-cream rounded-xl border border-border flex flex-col gap-3 slide-up">
           <div className="text-sm font-bold text-stone">新增节点</div>
           <div className="flex gap-2">
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm w-28 bg-white" />
              <input id="place-search-input" type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="输入地点搜索..." className="flex-1 px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50" />
           </div>
           <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-stone hover:bg-black/5 rounded-lg flex items-center gap-1 transition">
                 <X size={14}/> 取消
              </button>
              <button onClick={handleAddSubmit} className="px-3 py-1.5 text-sm text-white bg-accent hover:bg-rose-700 rounded-lg flex items-center gap-1 transition">
                 <Check size={14}/> 确认添加
              </button>
           </div>
        </div>
      )}
    </div>
  );
}