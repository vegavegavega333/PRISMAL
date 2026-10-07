import React, { useState } from 'react';
import { LandingShowcase } from './LandingShowcase';
import { DentalSearchEngine } from '../patient/DentalSearchEngine';
import { UnifiedAuthModal } from '../auth/UnifiedAuthModal';
import { Search } from 'lucide-react';

interface LandingGateProps {
  onStartStudioRegistration?: () => void;
}

export const LandingGate: React.FC<LandingGateProps> = () => {
  const [viewMode, setViewMode] = useState<'search' | 'saas_showcase'>('search');
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    initialTab: 'login' | 'register';
  }>({
    isOpen: false,
    initialTab: 'login',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Universal Unified Auth Modal: identical clean pop-up for both Accedi & Registrati */}
      <UnifiedAuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={authModal.initialTab}
      />

      {/* Primary Dental Search Engine OR B2B SaaS Showcase */}
      {viewMode === 'search' ? (
        <DentalSearchEngine
          onOpenAuthModal={() => setAuthModal({ isOpen: true, initialTab: 'login' })}
          onStartRegistration={() => setAuthModal({ isOpen: true, initialTab: 'register' })}
          onOpenSaasShowcase={() => setViewMode('saas_showcase')}
        />
      ) : (
        <div className="relative">
          {/* Top Banner allowing return to Search Engine */}
          <div className="bg-purple-900 text-white text-xs py-2 px-4 flex items-center justify-between sticky top-0 z-50">
            <span className="font-semibold">
              Sei nella presentazione software B2B per studi e cliniche odontoiatriche.
            </span>
            <button
              type="button"
              onClick={() => setViewMode('search')}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Torna al Motore di Ricerca PRISMAL</span>
            </button>
          </div>

          <LandingShowcase
            onOpenAuthModal={() => setAuthModal({ isOpen: true, initialTab: 'login' })}
            onStartRegistration={() => setAuthModal({ isOpen: true, initialTab: 'register' })}
          />
        </div>
      )}
    </div>
  );
};
