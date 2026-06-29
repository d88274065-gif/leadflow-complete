import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Search, Target, Handshake, Users, Building2, CheckSquare, X } from 'lucide-react';

export default function GlobalSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ leads: [], deals: [], contacts: [], companies: [], tasks: [] });
  const [searching, setSearching] = useState(false);
  const { organization } = useOrg();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (query.length < 2 || !organization?.id) {
      setResults({ leads: [], deals: [], contacts: [], companies: [], tasks: [] });
      return;
    }
    const timer = setTimeout(() => searchAll(), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchAll = async () => {
    setSearching(true);
    const orgId = organization.id;
    const q = query.toLowerCase();
    try {
      const [leads, deals, contacts, companies, tasks] = await Promise.all([
        base44.entities.Lead.filter({ org_id: orgId }, '-created_date', 50),
        base44.entities.Deal.filter({ org_id: orgId }, '-created_date', 50),
        base44.entities.Contact.filter({ org_id: orgId }, '-created_date', 50),
        base44.entities.Company.filter({ org_id: orgId }, '-created_date', 50),
        base44.entities.Task.filter({ org_id: orgId }, '-created_date', 50),
      ]);
      setResults({
        leads: leads.filter(l => `${l.first_name} ${l.last_name} ${l.email} ${l.company_name}`.toLowerCase().includes(q)).slice(0, 5),
        deals: deals.filter(d => `${d.title} ${d.company_name}`.toLowerCase().includes(q)).slice(0, 5),
        contacts: contacts.filter(c => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q)).slice(0, 5),
        companies: companies.filter(c => `${c.name} ${c.industry}`.toLowerCase().includes(q)).slice(0, 5),
        tasks: tasks.filter(t => `${t.title}`.toLowerCase().includes(q)).slice(0, 5),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const goTo = (path) => { navigate(path); onClose(); };
  const total = Object.values(results).flat().length;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads, deals, contacts, companies, tasks..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {searching && <div className="py-8 text-center text-sm text-gray-500">Searching...</div>}

          {!searching && query.length >= 2 && total === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">No results found for "{query}"</div>
          )}

          {results.leads.length > 0 && (
            <Section icon={Target} label="Leads">
              {results.leads.map(l => (
                <ResultItem key={l.id} onClick={() => goTo(`/leads/${l.id}`)}>
                  {l.first_name} {l.last_name} {l.company_name && <span className="text-gray-400 ml-1">· {l.company_name}</span>}
                </ResultItem>
              ))}
            </Section>
          )}
          {results.deals.length > 0 && (
            <Section icon={Handshake} label="Deals">
              {results.deals.map(d => (
                <ResultItem key={d.id} onClick={() => goTo(`/deals`)}>
                  {d.title} {d.value > 0 && <span className="text-gray-400 ml-1">· ${d.value.toLocaleString()}</span>}
                </ResultItem>
              ))}
            </Section>
          )}
          {results.contacts.length > 0 && (
            <Section icon={Users} label="Contacts">
              {results.contacts.map(c => (
                <ResultItem key={c.id} onClick={() => goTo(`/contacts`)}>
                  {c.first_name} {c.last_name}
                </ResultItem>
              ))}
            </Section>
          )}
          {results.companies.length > 0 && (
            <Section icon={Building2} label="Companies">
              {results.companies.map(c => (
                <ResultItem key={c.id} onClick={() => goTo(`/companies`)}>
                  {c.name}
                </ResultItem>
              ))}
            </Section>
          )}
          {results.tasks.length > 0 && (
            <Section icon={CheckSquare} label="Tasks">
              {results.tasks.map(t => (
                <ResultItem key={t.id} onClick={() => goTo(`/tasks`)}>
                  {t.title}
                </ResultItem>
              ))}
            </Section>
          )}
        </div>

        {query.length < 2 && (
          <div className="py-8 text-center text-sm text-gray-400">Type at least 2 characters to search</div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, children }) {
  return (
    <div className="py-2">
      <div className="px-5 py-1 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ children, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-2 text-sm hover:bg-indigo-50 transition-colors">
      {children}
    </button>
  );
}
