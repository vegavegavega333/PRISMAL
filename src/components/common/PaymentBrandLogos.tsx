import React from 'react';
import { Wallet, Globe, CreditCard } from 'lucide-react';

export const GooglePayLogo: React.FC<{ className?: string; variant?: 'color' | 'white' | 'dark' }> = ({
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${className}`}>
      <Wallet className="w-4 h-4 text-emerald-500" />
      <span>Google Pay</span>
    </span>
  );
};

export const PayPalLogo: React.FC<{ className?: string; showWordmark?: boolean }> = ({
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-xs text-[#003087] ${className}`}>
      <Globe className="w-4 h-4 text-sky-600" />
      <span>PayPal</span>
    </span>
  );
};

export const VisaLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center font-black tracking-wider text-[11px] text-[#1a1f71] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ${className}`}>
    VISA
  </span>
);

export const MastercardLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center font-bold tracking-tight text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ${className}`}>
    Mastercard
  </span>
);

export const AmexLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center font-bold text-[10px] text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 ${className}`}>
    AMEX
  </span>
);

