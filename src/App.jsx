import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DocumentUploadModal from './components/DocumentUploadModal';
import FloatingAssistant from './components/FloatingAssistant';

// Pages
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import OverviewPage from './pages/OverviewPage';
import DocumentVaultPage from './pages/DocumentVaultPage';
import IntegrityVerificationPage from './pages/IntegrityVerificationPage';
import VersionHistoryPage from './pages/VersionHistoryPage';
import RecoveryCenterPage from './pages/RecoveryCenterPage';
import BreachRehearsalPage from './pages/BreachRehearsalPage';
import SecurityEventsPage from './pages/SecurityEventsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import HelpSecurityPage from './pages/HelpSecurityPage';

// Specialized Workspaces
import HealthcarePage from './pages/HealthcarePage';
import FinanceInsurancePage from './pages/FinanceInsurancePage';
import CareerEducationPage from './pages/CareerEducationPage';
import DMAssistantPage from './pages/DMAssistantPage';
import RenewalCenterPage from './pages/RenewalCenterPage';
import PrivacyEmergencyPage from './pages/PrivacyEmergencyPage';
import VerifierPage from './pages/VerifierPage';
import { Shield } from 'lucide-react';

const PAGE_META = {
  overview: {
    title: 'Operational Security Overview',
    desc: 'High-level dashboard of cryptographic assets, verification health, and breach defense metrics'
  },
  vault: {
    title: 'My Documents Vault',
    desc: 'Client-side AES-256-GCM zero-knowledge encrypted repository with smart folders'
  },
  integrity: {
    title: 'Integrity Verification Enclave',
    desc: 'Tamper-evident verification workstation with canonical RFC 8785 manifests & HMAC-SHA256 signing'
  },
  versions: {
    title: 'Document Version History',
    desc: 'Persistent immutable-by-design version lineage with digest tracking and restoration eligibility'
  },
  recovery: {
    title: 'Vault Recovery Center',
    desc: 'Controlled rollback and recovery proof workflows with cryptographic pre-check verification'
  },
  rehearsal: {
    title: 'Breach Rehearsal & Recovery Proof',
    desc: 'Controlled breach exercises, automated incident containment, and cryptographic recovery proof'
  },
  events: {
    title: 'Security Audit Events Ledger',
    desc: 'Persistent audit ledger tracking uploads, verifications, containment actions, and access control'
  },
  reports: {
    title: 'Security & Rehearsal Reports',
    desc: 'Official cryptographic attestation certificates with execution telemetry and JSON export'
  },
  settings: {
    title: 'Settings & Custodian Identity',
    desc: 'Manage profile preferences, theme modes, cryptographic keys inventory, and account security'
  },
  help: {
    title: 'Help & Security Information',
    desc: 'Comprehensive trust model documentation, encryption guidance, and operational limitations'
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
    desc: 'Smart scheduled email reminders & autonomous rate quotation workflows'
  },
  privacy: {
    title: 'Privacy & Emergency Access Hub',
    desc: 'Inactivity heartbeats, 2-of-3 Shamir recovery, nominee claims & one-time QR disclosure'
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIsSignup, setAuthIsSignup] = useState(false);

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
        <div className="brand-mark" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)' }}>
          <Shield size={24} strokeWidth={2.4} color="#ffffff" />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          INITIALIZING PHOENIX CRYPTOGRAPHIC ENCLAVE...
        </div>
      </div>
    );
  }

  // Public verifier screen
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/verify') || window.location.search.includes('token='))) {
    return <VerifierPage />;
  }

  // Unauthenticated Screen: Landing Page with Auth Action
  if (!user) {
    if (showAuthModal) {
      return (
        <AuthPage
          initialIsSignup={authIsSignup}
          onBackToLanding={() => setShowAuthModal(false)}
        />
      );
    }
    return (
      <LandingPage
        onGoToAuth={(isSignup) => {
          setAuthIsSignup(Boolean(isSignup));
          setShowAuthModal(true);
        }}
      />
    );
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
      case 'integrity':
        return <IntegrityVerificationPage />;
      case 'versions':
        return <VersionHistoryPage />;
      case 'recovery':
        return <RecoveryCenterPage />;
      case 'rehearsal':
        return <BreachRehearsalPage />;
      case 'events':
        return <SecurityEventsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpSecurityPage />;
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
