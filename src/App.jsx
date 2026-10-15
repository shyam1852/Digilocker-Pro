import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DocumentUploadModal from './components/DocumentUploadModal';
import FloatingAssistant from './components/FloatingAssistant';

// Pages
import AuthPage from './pages/AuthPage';
import OverviewPage from './pages/OverviewPage';
import DocumentVaultPage from './pages/DocumentVaultPage';
import HealthcarePage from './pages/HealthcarePage';
import FinanceInsurancePage from './pages/FinanceInsurancePage';
import CareerEducationPage from './pages/CareerEducationPage';
import DMAssistantPage from './pages/DMAssistantPage';
import RenewalCenterPage from './pages/RenewalCenterPage';
import PrivacyEmergencyPage from './pages/PrivacyEmergencyPage';
import SettingsPage from './pages/SettingsPage';
import VerifierPage from './pages/VerifierPage';
import { Shield } from 'lucide-react';

const PAGE_META = {
  overview: {
    title: 'Operational Overview',
    desc: 'High-level dashboard of encrypted assets, upcoming reminders, and deadlines'
  },
  vault: {
    title: 'My Vault',
    desc: 'Client-side AES-256-GCM zero-knowledge encrypted repository with smart folders'
  },
  healthcare: {
    title: 'Healthcare Workspace',
    desc: 'Health insurance policies, medical records, diagnostic reports & on-device clause auditing'
  },
  finance: {
    title: 'Finance & Insurance Hub',
    desc: 'LIC policies, maturity calculations, tax statements & objective investment education'
  },
  career: {
    title: 'Career & Education Workspace',
    desc: 'Academic certificates, marksheets, resumes & recruitment document gap evaluation'
  },
  assistant: {
    title: 'DM Assistant',
    desc: 'Zero-knowledge AI guide for investments, policy terms, calculations & career readiness'
  },
  renewals: {
    title: 'Renewals & Expiry Alerts',
    desc: 'Smart 30d/7d/1d scheduled email reminders & autonomous TinyFish rate quotation workflows'
  },
  privacy: {
    title: 'Privacy & Emergency Access Hub',
    desc: 'Inactivity heartbeats, 2-of-3 Shamir recovery, nominee claims & one-time QR disclosure'
  },
  settings: {
    title: 'Settings & Security',
    desc: 'Manage profile, theme preferences, notification channels & security audit ledger'
  }
};

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [assistantInitialMode, setAssistantInitialMode] = useState('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // Public verifier screen can be opened by anyone without login (for judge 2-window testing)
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/verify') || window.location.search.includes('token='))) {
    return <VerifierPage />;
  }

  // Unauthenticated Screen
  if (!user) {
    return <AuthPage />;
  }

  const currentMeta = PAGE_META[activeTab] || PAGE_META.overview;

  const handleNavigateToAssistantWithMode = (mode) => {
    setAssistantInitialMode(mode);
    setActiveTab('assistant');
  };

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
      case 'healthcare':
        return (
          <HealthcarePage
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onNavigateToAssistant={handleNavigateToAssistantWithMode}
          />
        );
      case 'finance':
        return (
          <FinanceInsurancePage
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onNavigateToAssistant={handleNavigateToAssistantWithMode}
          />
        );
      case 'career':
        return (
          <CareerEducationPage
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onNavigateToAssistant={handleNavigateToAssistantWithMode}
          />
        );
      case 'assistant':
        return (
          <DMAssistantPage
            key={assistantInitialMode}
            initialMode={assistantInitialMode}
          />
        );
      case 'renewals':
      case 'renewal':
        return <RenewalCenterPage />;
      case 'privacy':
      case 'emergency':
        return (
          <PrivacyEmergencyPage
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <OverviewPage
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar with Permanent Bottom Theme Switcher & User Profile */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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

      {/* Global Floating DM Assistant Widget */}
      <FloatingAssistant
        onOpenFullPage={(mode) => handleNavigateToAssistantWithMode(mode)}
      />

      {/* Global Client-Side Encryption Document Deposit Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
