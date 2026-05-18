'use client';

import * as React from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  status?: 'idle' | 'error' | 'success';
  disabled?: boolean;
}

export function OTPInput({ value, onChange, status = 'idle', disabled }: OTPInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const otpArray = value.split('').concat(new Array(6 - value.length).fill(''));

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Only digits

    const newOtpArray = [...otpArray];
    // Take only the last character if more than one digit is entered (e.g. paste)
    newOtpArray[index] = val.slice(-1);
    const newValue = newOtpArray.join('');
    onChange(newValue);

    // Auto focus next
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    onChange(pastedData);
    
    // Focus last filled or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const getBorderColor = () => {
    if (status === 'error') return 'border-red-500 ring-red-100 dark:border-red-700 dark:ring-red-900/20';
    if (status === 'success') return 'border-green-500 ring-green-100 dark:border-green-700 dark:ring-green-900/20';
    return 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800';
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {otpArray.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInputChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`h-12 w-full rounded-xl border-2 bg-white text-center text-xl font-bold text-gray-900 transition-all focus:outline-none focus:ring-4 dark:text-white sm:h-14 sm:text-2xl ${getBorderColor()}`}
        />
      ))}
    </div>
  );
}
