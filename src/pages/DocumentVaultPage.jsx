import React, { useState, useMemo } from 'react';
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
  Archive,
  QrCode,
  Folder,
  FolderPlus,
  FolderLock,
  RotateCcw,
  AlertTriangle,
  Check,
  X,
  Layers,
  Tag,
  Copy
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import DocumentDetailModal from '../components/DocumentDetailModal';
import ShareClaimModal from '../components/ShareClaimModal';

export default function DocumentVaultPage({ onOpenUpload }) {
  const {
    documents,
    folders,
    duplicates,
    createFolder,
    moveDocuments,
    bulkCategorize,
    undoLastAction
  } = useVault();

  // Filters & Search
  const [selectedFolderId, setSelectedFolderId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');

  // Modals
  const [activeDocModal, setActiveDocModal] = useState(null);
  const [shareDocModal, setShareDocModal] = useState(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showDuplicateReviewModal, setShowDuplicateReviewModal] = useState(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [showMoveFolderModal, setShowMoveFolderModal] = useState(false);

  // Multi-Selection State
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState('Other Records');
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('Financial Documents');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');

  // Filter documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      // Folder filter
      if (selectedFolderId !== 'ALL') {
        const folder = folders.find(f => f.id === selectedFolderId);
        if (folder) {
          const matchId = doc.folder_id === folder.id;
          const matchCat = !doc.folder_id && doc.category === folder.category;
          if (!matchId && !matchCat) return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;

      // Status filter
      if (selectedStatus !== 'All' && doc.status !== selectedStatus) return false;

      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchPolicy = (doc.policy_number || '').toLowerCase().includes(q);
        const matchInsurer = (doc.insurer_name || '').toLowerCase().includes(q);
        const matchCat = (doc.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchPolicy && !matchInsurer && !matchCat) return false;
      }
      return true;
    });
  }, [documents, selectedFolderId, selectedCategory, selectedStatus, searchTerm, folders]);

  // Sort
  const sortedDocs = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
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
    return list;
  }, [filtered, sortBy]);

  // Toggle single document checkbox
  const toggleSelectDoc = (id) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter(item => item !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  // Select / Deselect All
  const toggleSelectAll = () => {
    if (selectedDocIds.length === sortedDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(sortedDocs.map(d => d.id));
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder({
        name: newFolderName.trim(),
        category: newFolderCategory,
        icon: 'Folder',
        color: '#3b82f6'
      });
      setNewFolderName('');
      setShowNewFolderModal(false);
      setActionFeedback('New folder created.');
      setTimeout(() => setActionFeedback(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkMove = async (e) => {
    e.preventDefault();
    if (!targetFolderId || selectedDocIds.length === 0) return;
    try {
      const res = await moveDocuments(selectedDocIds, targetFolderId);
      setShowMoveFolderModal(false);
      setSelectedDocIds([]);
      setActionFeedback(`Moved ${res.movedCount} documents to folder. Undo is available.`);
      setTimeout(() => setActionFeedback(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkCategorize = async (e) => {
    e.preventDefault();
    if (!bulkCategoryTarget || selectedDocIds.length === 0) return;
    try {
      const res = await bulkCategorize(selectedDocIds, bulkCategoryTarget);
      setShowBulkCategoryModal(false);
      setSelectedDocIds([]);
      setActionFeedback(`Categorized ${res.updatedCount} documents as "${bulkCategoryTarget}". Undo is available.`);
      setTimeout(() => setActionFeedback(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndo = async () => {
    try {
      const res = await undoLastAction();
      if (res.success) {
        setActionFeedback(`Reverted last organization action (${res.revertedItemsCount} documents).`);
        setTimeout(() => setActionFeedback(''), 4000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Vault Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              My Vault
            </h2>
            <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>AES-256-GCM</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Zero-knowledge encrypted repository with smart folders, tags & duplicate management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleUndo}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', gap: '0.35rem' }}
            title="Rollback recent folder movement or bulk categorization"
          >
            <RotateCcw size={13} />
            <span>Undo Organization</span>
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', gap: '0.35rem' }}
          >
            <FolderPlus size={13} />
            <span>New Folder</span>
          </button>

          <button onClick={onOpenUpload} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
            <UploadCloud size={14} />
            <span>Deposit Document</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <CheckCircle size={14} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Duplicate Warning Banner (Part 6) */}
      {duplicates.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(234, 179, 8, 0.25)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} style={{ color: '#eab308' }} />
            <span>
              <strong>Duplicate Records Detected:</strong> Found {duplicates.length} group(s) with identical cryptographic fingerprints or filenames.
            </span>
          </div>

          <button
            onClick={() => setShowDuplicateReviewModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
          >
            Review Duplicates
          </button>
        </div>
      )}

      {/* Smart Folders Strip (Part 6) */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setSelectedFolderId('ALL')}
          className={`btn btn-sm ${selectedFolderId === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
        >
          <Folder size={12} />
          <span>All Documents ({documents.length})</span>
        </button>

        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: f.color || '#3b82f6', display: 'inline-block' }} />
              <span>{f.name} ({f.document_count || 0})</span>
            </button>
          );
        })}
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
              style={{ paddingLeft: '2.1rem', fontSize: '0.78rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-control"
              style={{ width: '130px', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-control"
              style={{ width: '150px', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="expiry_asc">Expiry Date (Earliest)</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Multi-Selection Action Toolbar */}
      {selectedDocIds.length > 0 && (
        <div style={{ padding: '0.65rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedDocIds.length} document(s) selected
          </span>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setShowMoveFolderModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem' }}
            >
              <Folder size={12} />
              <span>Move to Folder</span>
            </button>

            <button
              onClick={() => setShowBulkCategoryModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem' }}
            >
              <Tag size={12} />
              <span>Bulk Categorize</span>
            </button>

            <button
              onClick={() => setSelectedDocIds([])}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem' }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Documents Table View */}
      {sortedDocs.length === 0 ? (
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
                <th style={{ width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={selectedDocIds.length > 0 && selectedDocIds.length === sortedDocs.length}
                    onChange={toggleSelectAll}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </th>
                <th>Document Name</th>
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
              {sortedDocs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                let expiryBadge = null;
                if (doc.expiry_date) {
                  const days = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                  if (days < 0) {
                    expiryBadge = <span className="badge badge-danger">Expired</span>;
                  } else if (days <= 30) {
                    expiryBadge = <span className="badge badge-warning">{days}d left</span>;
                  } else {
                    expiryBadge = <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{doc.expiry_date}</span>;
                  }
                } else {
                  expiryBadge = <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ongoing</span>;
                }

                return (
                  <tr key={doc.id} style={{ backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDoc(doc.id)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                    </td>
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
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setShareDocModal(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', marginRight: '0.35rem', fontSize: '0.7rem' }}
                        title="Generate one-time QR code with selective claim disclosure"
                      >
                        <QrCode size={12} />
                        <span>QR Share</span>
                      </button>
                      <button
                        onClick={() => setActiveDocModal(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderPlus size={16} style={{ color: 'var(--accent)' }} />
                <span>Create Custom Vault Folder</span>
              </div>
              <button onClick={() => setShowNewFolderModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tax Returns 2026, Vehicle Invoices"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Default Category Association</label>
                <select
                  value={newFolderCategory}
                  onChange={(e) => setNewFolderCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  <option value="Financial Documents">Financial Documents</option>
                  <option value="Health Insurance">Health Insurance</option>
                  <option value="Life Insurance">Life Insurance</option>
                  <option value="Tax Documents">Tax Documents</option>
                  <option value="Career & Employment">Career & Employment</option>
                  <option value="Other Records">Other Records</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowNewFolderModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {showMoveFolderModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Move {selectedDocIds.length} Document(s) to Folder
              </div>
              <button onClick={() => setShowMoveFolderModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkMove}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Select Destination Folder</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  required
                >
                  <option value="">-- Choose Target Folder --</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowMoveFolderModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Move Documents</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Categorize Modal */}
      {showBulkCategoryModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Bulk Categorize {selectedDocIds.length} Document(s)
              </div>
              <button onClick={() => setShowBulkCategoryModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBulkCategorize}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Select New Category</label>
                <select
                  value={bulkCategoryTarget}
                  onChange={(e) => setBulkCategoryTarget(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  required
                >
                  <option value="Health Insurance">Health Insurance</option>
                  <option value="Life Insurance">Life Insurance</option>
                  <option value="Vehicle Insurance">Vehicle Insurance</option>
                  <option value="Financial Documents">Financial Documents</option>
                  <option value="Tax Documents">Tax Documents</option>
                  <option value="Education & Academics">Education & Academics</option>
                  <option value="Career & Employment">Career & Employment</option>
                  <option value="Identity & Government ID">Identity & Government ID</option>
                  <option value="Legal & Property">Legal & Property</option>
                  <option value="Other Records">Other Records</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowBulkCategoryModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Apply Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Review Modal (Part 6) */}
      {showDuplicateReviewModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={18} style={{ color: '#eab308' }} />
                <span>Duplicate Document Inspector</span>
              </div>
              <button onClick={() => setShowDuplicateReviewModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              DM Locker Pro <strong>never deletes documents automatically</strong>. Inspect the duplicate matches below to archive or remove redundant uploads at your discretion.
            </p>

            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {duplicates.map((grp, idx) => (
                <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                    Primary: "{grp.original.title}" ({grp.original.file_name})
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Uploaded on {new Date(grp.original.created_at).toLocaleDateString()}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 600, marginBottom: '0.2rem' }}>
                    Matching Duplicates:
                  </div>
                  {grp.duplicates.map(dup => (
                    <div key={dup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '0.2rem 0' }}>
                      <span>• "{dup.title}" ({dup.file_name})</span>
                      <button
                        onClick={() => {
                          setShowDuplicateReviewModal(false);
                          setActiveDocModal(dup);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowDuplicateReviewModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        doc={activeDocModal}
        isOpen={Boolean(activeDocModal)}
        onClose={() => setActiveDocModal(null)}
      />

      {/* One-Time Selective QR Share Modal */}
      <ShareClaimModal
        document={shareDocModal}
        isOpen={Boolean(shareDocModal)}
        onClose={() => setShareDocModal(null)}
      />
    </div>
  );
}
