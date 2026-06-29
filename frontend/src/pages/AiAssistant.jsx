import React, { useState, useRef, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2 } from 'lucide-react';

const suggestions = [
  'Summarize my top 5 leads this week',
  'Which deals are at risk of being lost?',
  'Draft a follow-up email for a cold lead',
  'What should I focus on today?',
];

export default function AiAssistant() {
  const { organization, currentUser } = useOrg();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI sales assistant. Ask me anything about your leads, deals, or pipeline." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setMessages(prev => [...prev, { role: 'user', content }]);
    setInput('');
    setLoading(true);
    try {
      const [leads, deals, tasks] = await Promise.all([
        base44.entities.Lead.filter({ org_id: organization.id }, '-created_date', 100),
        base44.entities.Deal.filter({ org_id: organization.id }, '-created_date', 100),
        base44.entities.Task.filter({ org_id: organization.id }, '-created_date', 100),
      ]);
      const context = `You are a CRM sales assistant for ${organization?.name || 'this company'}. 
Current data summary: ${leads.length} leads, ${deals.length} deals, ${tasks.filter(t => t.status !== 'completed').length} pending tasks.
Recent leads: ${leads.slice(0, 10).map(l => `${l.first_name} ${l.last_name} (${l.status}, ${l.company_name || 'no company'})`).join('; ')}
Active deals: ${deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).slice(0, 10).map(d => `${d.title} - $${d.value || 0} (${d.stage})`).join('; ')}

User question: ${content}

Answer helpfully and concisely as a CRM assistant.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt: context });
      setMessages(prev => [...prev, { role: 'assistant', content: typeof res === 'string' ? res : res?.text || JSON.stringify(res) }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an error processing that. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Assistant</h1>
          <p className="text-xs text-gray-500">Powered by your CRM data</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 mt-3">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about your leads, deals, or pipeline..."
          rows={1}
          className="resize-none"
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
