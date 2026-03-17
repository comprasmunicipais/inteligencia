'use client';

import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-200",
      className
    )}>
      <div className="size-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-6">
        <Icon className="size-8" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-8">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all shadow-sm"
        >
          <Plus className="size-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
