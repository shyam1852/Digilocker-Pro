import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Maximize2,
  RefreshCw,
  Compass,
  Calculator,
  Briefcase,
  HeartPulse,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function FloatingAssistant({ onOpenFullPage }) {
  const { token } = useAuth();
  const { documents } = useVault();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('general');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

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

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    setInputValue('');
    setIsLoading(true);

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
          conversation_id: conversationId,
          mode,
          message: text
        })
      });

      if (res.ok) {
        const json = await res.json();
        setConversationId(json.conversation_id);
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, json.reply]);
      } else {
        const errJson = await res.json();
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ ${errJson.error || 'Failed to process inquiry.'}`,
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

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          title="Ask DM Assistant"
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Floating Drawer / Chat Box */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '540px',
            maxHeight: 'calc(100vh - 48px)',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-card)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>DM Assistant</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Zero-Knowledge Enclave</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {onOpenFullPage && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullPage(mode);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
                  title="Expand to Full Page"
                >
                  <Maximize2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
                title="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mode Selector Strip */}
          <div style={{ display: 'flex', gap: '0.3rem', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto', backgroundColor: 'var(--bg-app)' }}>
            {[
              { id: 'general', label: 'General' },
              { id: 'personal-finance', label: 'Finance' },
              { id: 'lic-calculator', label: 'LIC Calc' },
              { id: 'job-gap-checker', label: 'Job Check' },
              { id: 'healthcare', label: 'Health' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`btn btn-sm ${mode === m.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  Ask about your documents & policies
                </div>
                <p style={{ fontSize: '0.7rem', margin: '0 0 1rem 0' }}>
                  Compare investments, estimate LIC maturity, or evaluate job requirements.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {[
                    'Compare PPF vs Mutual Funds for 10 years',
                    'Estimate LIC maturity for ₹5 Lakh SA',
                    'Check my documents for Software Engineer role'
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      💬 {p}
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
                      maxWidth: '88%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isUser ? '#3b82f6' : 'var(--bg-card)',
                      color: isUser ? '#ffffff' : 'var(--text-primary)',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)',
                      fontSize: '0.76rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Evaluating on-device...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '0.6rem 0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="input-field"
              style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.45rem 0.75rem' }}
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
