import React, { useState } from 'react';
import {
  Shield,
  UploadCloud,
  Search,
  Filter,
  FileText,
  Calendar,
  Lock,
  ArrowUpDown,
  Download,
  Eye,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import DocumentDetailModal from '../components/DocumentDetailModal';

const CATEGORIES = [
  'All',
  'Health Insurance',
  'Life Insurance',
  'Vehicle Insurance',
  'Identity Documents',
  'Claim Documents',
  'Other Records'
];

export default function DocumentVaultPage({ onOpenUpload }) {
  const { documents } = useVault();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [activeDocModal, setActiveDocModal] = useState(null);

  // Filter documents
  const filtered = documents.filter((doc) => {
    if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && doc.status !== selectedStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchPolicy = (doc.policy_number || '').toLowerCase().includes(q);
      const matchInsurer = (doc.insurer_name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchPolicy && !matchInsurer) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'created_desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'created_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'expiry_asc') {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    }
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="page-container">
      {/* Vault Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Document Vault
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Client-Side AES-256-GCM Encrypted Document Repository
          </p>
        </div>

        <button onClick={onOpenUpload} className="btn btn-primary">
          <UploadCloud size={16} />
          <span>Deposit New Document</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search title, insurer, or policy #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '2.1rem' }}
            />
          </div>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-control"
              style={{ width: '160px', padding: '0.45rem 0.65rem' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-control"
              style={{ width: '140px', padding: '0.45rem 0.65rem' }}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-control"
              style={{ width: '160px', padding: '0.45rem 0.65rem' }}
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="expiry_asc">Expiry Date (Earliest)</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table View */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <Lock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            No documents matching filter
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Deposit a new encrypted document or clear your active search query.
          </p>
          <button onClick={onOpenUpload} className="btn btn-primary btn-sm">
            Deposit Document
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document & Details</th>
                <th>Category</th>
                <th>Policy Identifier</th>
                <th>Insurer / Issuer</th>
                <th>Version</th>
                <th>Expiry Timeline</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                let expiryBadge = null;
                if (doc.expiry_date) {
                  const days = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                  if (days < 0) {
                    expiryBadge = <span className="badge badge-danger">Expired</span>;
                  } else if (days <= 30) {
                    expiryBadge = <span className="badge badge-warning">{days}d remaining</span>;
                  } else {
                    expiryBadge = <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.expiry_date}</span>;
                  }
                } else {
                  expiryBadge = <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No expiry</span>;
                }

                return (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ color: 'var(--accent)' }}>
                          <FileText size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {doc.file_name} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                            {doc.is_synthetic === 1 && (
                              <span style={{ marginLeft: '0.4rem', color: '#f59e0b', fontWeight: 600 }}>[DEMO FIXTURE]</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{doc.category}</span>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {doc.policy_number || '—'}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {doc.insurer_name || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success">v{doc.version}</span>
                    </td>
                    <td>
                      {expiryBadge}
                    </td>
                    <td>
                      <span className={`badge ${doc.status === 'active' ? 'badge-success' : doc.status === 'archived' ? 'badge-secondary' : 'badge-warning'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setActiveDocModal(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.55rem' }}
                      >
                        <Eye size={13} />
                        <span>Inspect & Decrypt</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={activeDocModal}
        isOpen={Boolean(activeDocModal)}
        onClose={() => setActiveDocModal(null)}
      />
    </div>
  );
}
