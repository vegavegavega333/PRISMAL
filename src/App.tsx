import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopNavigation } from './components/common/TopNavigation';
import { LandingGate } from './components/common/LandingGate';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { StudioDashboard } from './components/studio/StudioDashboard';
import { StudioOnboarding } from './components/auth/StudioOnboarding';
import { PatientBookingView } from './components/patient/PatientBookingView';
import { PatientBookingManagement } from './components/patient/PatientBookingManagement';

const MainApp: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    onboardingStep,
    setOnboardingStep,
    activeStudio,
    activePatientToken,
    setActivePatientToken,
    setCurrentStudioId,
    authSession,
    resolvedTheme,
  } = useApp();
  const [showFullOnboardingView, setShowFullOnboardingView] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Check for return from Stripe Checkout
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle OAuth popup window callback and close automatically
    if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code'))) {
      try {
        window.opener.postMessage({ type: 'PRISMAL_OAUTH_SUCCESS' }, '*');
      } catch (e) {
        // ignore cross-origin error
      }
      setTimeout(() => {
        try { window.close(); } catch {}
      }, 700);
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paymentSuccess = params.get('payment_success');

    if (sessionId && paymentSuccess === 'true') {
      fetch(`/api/payments/verify-checkout-session?sessionId=${encodeURIComponent(sessionId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPaymentSuccessToast(`Pagamento completato con successo su Stripe! Ricevuta ${data.transaction?.invoiceNumber || ''} emessa e PRISMAL Prime attivato.`);
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => setPaymentSuccessToast(null), 8000);
          }
        })
        .catch(err => {
          console.warn('Errore verifica sessione Stripe:', err);
        });
    }
  }, []);

  // If in landing mode, show the full Landing Gate
  if (currentRole === 'landing') {
    return (
      <LandingGate
        onStartStudioRegistration={() => {
          setCurrentStudioId(null);
          setCurrentRole('studio_admin');
          setOnboardingStep('login');
          setShowFullOnboardingView(true);
        }}
      />
    );
  }

  // Standalone Patient Minisite View
  if (currentRole === 'patient') {
    return (
      <div className={`min-h-screen transition-colors duration-200 selection:bg-sky-500 selection:text-white ${
        resolvedTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {activePatientToken ? (
          <PatientBookingManagement onBackToBooking={() => setActivePatientToken(null)} />
        ) : (
          <PatientBookingView />
        )}
      </div>
    );
  }

  // Pure Full-Screen Onboarding or Registration View (Strictly NO Studio Navigation Header)
  if (currentRole === 'studio_admin' && (showFullOnboardingView || onboardingStep !== 'completed')) {
    return (
      <div className={`min-h-screen relative transition-colors duration-200 selection:bg-sky-500 selection:text-white ${
        resolvedTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {activeStudio && authSession?.role === 'studio_admin' && (
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => {
                setShowFullOnboardingView(false);
                setOnboardingStep('completed');
              }}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-xs transition ${
                resolvedTheme === 'dark'
                  ? 'bg-slate-800 text-slate-200 hover:text-white border border-slate-700'
                  : 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200'
              }`}
            >
              ← Torna al Gestionale {activeStudio.name}
            </button>
          </div>
        )}
        <StudioOnboarding
          onFinish={() => {
            setShowFullOnboardingView(false);
            setOnboardingStep('completed');
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 selection:bg-sky-500 selection:text-white ${
      resolvedTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header adapted strictly to current role */}
      <TopNavigation />

      {paymentSuccessToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500 flex items-center justify-between gap-3 animate-fade-in text-xs font-bold">
          <span>{paymentSuccessToast}</span>
          <button
            onClick={() => setPaymentSuccessToast(null)}
            className="p-1 rounded-full hover:bg-emerald-700 text-emerald-100 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Role Content */}
      <main className="flex-1">
        {/* SUPER ADMIN CONSOLE */}
        {currentRole === 'super_admin' && <SuperAdminDashboard />}

        {/* STUDIO ADMIN GESTIONALE (Only reached when fully authenticated) */}
        {currentRole === 'studio_admin' && <StudioDashboard />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
