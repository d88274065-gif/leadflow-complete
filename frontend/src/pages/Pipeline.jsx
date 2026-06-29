import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '@/components/ui/use-toast';

const stages = [
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

export default function Pipeline() {
  const { organization } = useOrg();
  const { toast } = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (organization?.id) loadDeals(); }, [organization?.id]);

  const loadDeals = async () => {
    setLoading(true);
    const data = await base44.entities.Deal.filter({ org_id: organization.id }, '-created_date', 300);
    setDeals(data);
    setLoading(false);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    try {
      await base44.entities.Deal.update(dealId, { stage: newStage });
    } catch (e) {
      toast({ title: 'Could not move deal', description: e.message, variant: 'destructive' });
      loadDeals();
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500">Drag deals between stages to update progress</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.key);
            const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <Droppable droppableId={stage.key} key={stage.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-72 flex-shrink-0 rounded-xl p-3 ${snapshot.isDraggingOver ? 'bg-indigo-50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                        <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                        <span className="text-xs text-gray-400">({stageDeals.length})</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 px-1 mb-2">${stageValue.toLocaleString()}</p>
                    <div className="space-y-2 min-h-[100px]">
                      {stageDeals.map((deal, index) => (
                        <Draggable draggableId={deal.id} index={index} key={deal.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border border-gray-100 p-3 shadow-sm ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-200' : ''}`}
                            >
                              <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{deal.company_name || '—'}</p>
                              <p className="text-sm font-semibold text-indigo-600 mt-2">${(deal.value || 0).toLocaleString()}</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
