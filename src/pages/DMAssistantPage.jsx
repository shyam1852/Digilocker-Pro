import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Paperclip,
  Compass,
  Calculator,
  Briefcase,
  HeartPulse,
  FolderLock,
  MessageSquare,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

const ASSISTANT_MODES = [
  { id: 'general', label: 'General Locker Assistant', icon: Sparkles, desc: 'Overview, search, and navigation support' },
  { id: 'personal-finance', label: 'Personal Finance & Investments', icon: Compass, desc: 'PPF, Mutual Funds, NPS, FD, and term insurance comparisons' },
  { id: 'lic-calculator', label: 'LIC Policy & Maturity Calculator', icon: Calculator, desc: 'Transparent sum assured, bonus, and IRR yield breakdown' },
  { id: 'job-gap-checker', label: 'Job Application Document Checker', icon: Briefcase, desc: 'Check recruitment criteria against your degrees and IDs' },
  { id: 'healthcare', label: 'Healthcare & Policy Assistant', icon: HeartPulse, desc: 'Medical records, ABHA, and health insurance sub-limits' },
  { id: 'vault-organizer', label: 'Smart Vault Organizer', icon: FolderLock, desc: 'Folder sorting, tags, and category cleanup' }
];

const SUGGESTED_PROMPTS = {
  'general': [
    'How do I securely share a document with a one-time QR code?',
    'What documents in my vault are expiring soon?',
    'Explain how client-side zero-knowledge encryption protects my files.'
  ],
  'personal-finance': [
    'I can invest ₹5,000 per month. How should I compare PPF and Mutual Funds for 10 years?',
    'Explain the difference between pure Term Insurance and an endowment savings plan.',
    'I need money for child education in 5 years. What factors should I consider?'
  ],
  'lic-calculator': [
    'Calculate estimated maturity benefit for LIC Jeevan Labh (Sum Assured: ₹5,00,000, Term: 21 years, PPT: 15 years, Premium: ₹24,000).',
    'Explain the difference between guaranteed Sum Assured and simple reversionary bonus in LIC.',
    'How is annualized net yield (IRR) calculated on an endowment policy?'
  ],
  'job-gap-checker': [
    'Software Engineer Job: Requirements are Bachelor Degree, 3 yrs experience, Date of Birth proof, and Govt Photo ID. Check my documents.',
    'What documents are typically required for central government (UPSC/SSC) recruitment?',
    'Is a provisional degree certificate accepted if original degree has not been issued?'
  ],
  'healthcare': [
    'What is a room-rent sub-limit in health insurance and how does it cause proportional deduction?',
    'What documents should I prepare for cashless hospitalization under Ayushman Bharat / TPA?',
    'Explain the standard waiting periods for pre-existing diseases in health insurance.'
  ],
  'vault-organizer': [
    'How should I categorize my uploaded insurance and tax documents?',
    'Show recommendations to organize unclassified files in my vault.',
    'Can I undo a bulk folder move if I make a mistake?'
  ]
};

export default function DMAssistantPage({ initialMode = 'general' }) {
  const { user, token } = useAuth();
  const { documents } = useVault();

  const [activeMode, setActiveMode] = useState(initialMode);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const messagesEndRef = useRef(null);

  const authHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = token || localStorage.getItem('dmlocker_token');
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/assistant/conversations', { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
        if (json.conversations?.length > 0 && !activeConvId) {
          selectConversation(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}/messages`, { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages || []);
        if (json.conversation?.mode) {
          setActiveMode(json.conversation.mode);
        }
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    }
  };

  const handleCreateNewConversation = async (mode = activeMode) => {
    try {
      const res = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: `New ${ASSISTANT_MODES.find(m => m.id === mode)?.label || 'Chat'}`,
          mode
        })
      });
      if (res.ok) {
        const json = await res.json();
        setConversations([json.conversation, ...conversations]);
        setActiveConvId(json.conversation.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        const remaining = conversations.filter(c => c.id !== convId);
        setConversations(remaining);
        if (activeConvId === convId) {
          if (remaining.length > 0) selectConversation(remaining[0].id);
          else {
            setActiveConvId(null);
            setMessages([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    setInputValue('');
    setIsLoading(true);

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      sender: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          conversation_id: activeConvId,
          mode: activeMode,
          message: text,
          selected_document_ids: selectedDocIds
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (!activeConvId && json.conversation_id) {
          setActiveConvId(json.conversation_id);
          fetchConversations();
        }
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, json.reply]);
      } else {
        const errJson = await res.json();
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ Error: ${errJson.error || 'Failed to process request.'}`,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        content: `⚠️ Network error: ${err.message}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocSelection = (id) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter(item => item !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>DM Assistant</h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Zero-knowledge AI guide for personal finance, LIC policy calculations, job gap evaluations & healthcare records
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCreateNewConversation(activeMode)}
          className="btn btn-primary btn-sm"
          style={{ fontSize: '0.75rem', gap: '0.4rem' }}
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Mode Switcher Chips */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {ASSISTANT_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                if (messages.length === 0) {
                  // switch existing empty chat mode
                } else {
                  handleCreateNewConversation(mode.id);
                }
              }}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
              title={mode.desc}
            >
              <Icon size={13} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Chat Grid (Sidebar Conversations + Chat Area) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', flex: 1, minHeight: '520px' }} className="assistant-layout-grid">
        {/* Left Drawer: Conversation History */}
        <div className="card hide-mobile" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.2rem 0.4rem' }}>
            Conversations ({conversations.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {conversations.map((c) => {
              const isSelected = activeConvId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {c.message_count} messages
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
                    title="Delete Conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No conversations yet. Type a question below to start.
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Active Chat Window */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', flex: 1 }}>
          {/* Active Mode Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                {ASSISTANT_MODES.find(m => m.id === activeMode)?.label}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {selectedDocIds.length > 0 ? `${selectedDocIds.length} document(s) authorized` : 'General context'}
              </span>
            </div>

            {/* Document Context Authorization Button */}
            <button
              onClick={() => setShowDocPicker(!showDocPicker)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem', gap: '0.3rem' }}
            >
              <Paperclip size={12} />
              <span>Attach Documents ({selectedDocIds.length})</span>
            </button>
          </div>

          {/* Document Picker Drawer (Conditional) */}
          {showDocPicker && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Authorize Vault Records for this conversation:
                </span>
                <button onClick={() => setShowDocPicker(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
                {documents.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                    >
                      {isChecked && <Check size={11} />}
                      <span>{doc.title}</span>
                    </button>
                  );
                })}

                {documents.length === 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No vault documents available to attach.</span>
                )}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0.2rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Sparkles size={22} />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ASSISTANT_MODES.find(m => m.id === activeMode)?.label}
                </div>
                <p style={{ fontSize: '0.75rem', maxWidth: '420px', margin: '0.3rem auto 1.25rem' }}>
                  {ASSISTANT_MODES.find(m => m.id === activeMode)?.desc}
                </p>

                {/* Suggested Prompts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxWidth: '520px', margin: '0 auto' }}>
                  {(SUGGESTED_PROMPTS[activeMode] || SUGGESTED_PROMPTS.general).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                    >
                      💬 "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-surface)',
                      color: isUser ? '#ffffff' : 'var(--text-primary)',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.content}

                    {/* Citations & Sources */}
                    {msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.7rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Official Regulatory Sources:</div>
                        {msg.metadata.sources.map((s, idx) => (
                          <div key={idx}>
                            • <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: isUser ? '#bfdbfe' : 'var(--accent)' }}>{s.title} ({s.authority}) <ExternalLink size={9} style={{ display: 'inline' }} /></a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem', padding: '0 0.3rem' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.5rem' }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Evaluating zero-knowledge policy parameters...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask DM Assistant (${ASSISTANT_MODES.find(m => m.id === activeMode)?.label})...`}
              className="input-field"
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.65rem 0.85rem' }}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1rem', fontSize: '0.8rem' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
