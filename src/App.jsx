import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar, { NAV_ITEMS } from './components/Sidebar';
import TopBar from './components/TopBar';
import DocumentUploadModal from './components/DocumentUploadModal';

// Pages
import AuthPage from './pages/AuthPage';
import OverviewPage from './pages/OverviewPage';
import DocumentVaultPage from './pages/DocumentVaultPage';
import RenewalCenterPage from './pages/RenewalCenterPage';
import PolicyHealthPage from './pages/PolicyHealthPage';
import NomineeClaimPage from './pages/NomineeClaimPage';
import EmergencyAccessPage from './pages/EmergencyAccessPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import { Shield } from 'lucide-react';

const PAGE_META = {
  overview: {
    title: 'Operational Overview',
    desc: 'High-level dashboard of encrypted assets, renewal workflows, and deadlines'
  },
  vault: {
    title: 'Document Vault',
    desc: 'Client-side AES-256-GCM zero-knowledge encrypted repository'
  },
  renewal: {
    title: 'Self-Healing Renewal Center',
    desc: 'Autonomous TinyFish underwriter portal agents & rate quotation workflow'
  },
  health: {
    title: 'Zero-Knowledge Policy Health Check',
    desc: 'Side-by-side clause verification comparing stored terms against current wordings'
  },
  claims: {
    title: 'Autonomous Nominee Claim Pilot',
    desc: 'Evidentiary checklist validation and assisted claim pack assembly'
  },
  emergency: {
    title: 'Emergency Access & Dead Man\'s Switch',
    desc: 'Inactivity heartbeat monitoring and 2-of-3 Shamir\'s Secret Sharing recovery'
  },
  activities: {
    title: 'Security Activity Log',
    desc: 'Audited chronological ledger of cryptographic events and agent dispatches'
  },
  settings: {
    title: 'Settings & Security',
    desc: 'Manage profile, theme preferences, nominees, and vault encryption parameters'
  }
};

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        gap: '1rem'
      }}>
        <div className="brand-mark" style={{ width: '48px', height: '48px' }}>
          <Shield size={24} strokeWidth={2.4} />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          INITIALIZING ZERO-KNOWLEDGE ENCLAVE...
        </div>
      </div>
    );
  }

  // Unauthenticated Screen
  if (!user) {
    return <AuthPage />;
  }

  const currentMeta = PAGE_META[activeTab] || PAGE_META.overview;

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPage
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        );
      case 'vault':
        return (
          <DocumentVaultPage
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        );
      case 'renewal':
        return <RenewalCenterPage />;
      case 'health':
        return <PolicyHealthPage />;
      case 'claims':
        return (
          <NomineeClaimPage
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        );
      case 'emergency':
        return <EmergencyAccessPage />;
      case 'activities':
        return <ActivityLogPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={(tab) => setActiveTab(tab)} onOpenUpload={() => setIsUploadModalOpen(true)} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar with Permanent Bottom Theme Switcher */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-main">
        <TopBar
          title={currentMeta.title}
          description={currentMeta.desc}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={globalSearch}
          onSearchChange={(val) => setGlobalSearch(val)}
        />

        <main style={{ flex: 1 }}>
          {renderActivePage()}
        </main>
      </div>

      {/* Global Client-Side Encryption Document Deposit Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
