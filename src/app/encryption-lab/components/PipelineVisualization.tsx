'use client';

import React from 'react';
import { FileText, Key, Shield, Lock, Hash, Package, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import type { PipelineStage } from './types';
import Icon from '@/components/ui/AppIcon';


interface PipelineVisualizationProps {
  stages: PipelineStage[];
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  Key,
  Shield,
  Lock,
  Hash,
  Package,
};

function StageNode({ stage, index }: { stage: PipelineStage; index: number }) {
  const Icon = iconMap[stage.icon] ?? Key;

  const nodeColors = {
    idle: 'bg-muted border-border text-muted-foreground',
    active: 'bg-primary/10 border-primary/60 text-primary glow-cyan node-pulse',
    done: 'bg-accent/10 border-accent/40 text-accent',
    error: 'bg-danger/10 border-danger/40 text-danger',
  };

  const labelColors = {
    idle: 'text-muted-foreground',
    active: 'text-primary',
    done: 'text-accent',
    error: 'text-danger',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={[
          'relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500',
          nodeColors[stage.status],
          stage.status === 'active' ? 'animate-node-pulse' : '',
        ].join(' ')}
      >
        {stage.status === 'active' ? (
          <Loader size={16} className="animate-spin" />
        ) : stage.status === 'done' ? (
          <CheckCircle size={16} />
        ) : stage.status === 'error' ? (
          <AlertCircle size={16} />
        ) : (
          <Icon size={16} />
        )}

        {/* Step number */}
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-background border border-border text-muted-foreground text-[9px] font-bold flex items-center justify-center font-mono-crypto">
          {index + 1}
        </span>
      </div>

      <span className={`text-[10px] font-medium text-center leading-tight transition-colors duration-300 max-w-[56px] ${labelColors[stage.status]}`}>
        {stage.label}
      </span>
    </div>
  );
}

function Connector({ leftStatus, rightStatus }: { leftStatus: PipelineStage['status']; rightStatus: PipelineStage['status'] }) {
  const isDone = leftStatus === 'done';
  const isActive = leftStatus === 'active';

  return (
    <div className="flex-1 flex items-center mt-[-18px] min-w-[12px] max-w-[60px]">
      <div
        className={[
          'pipeline-connector w-full transition-all duration-700',
          isDone ? 'pipeline-connector-done' : isActive ? 'pipeline-connector-active' : '',
        ].join(' ')}
      />
    </div>
  );
}

export default function PipelineVisualization({ stages }: PipelineVisualizationProps) {
  const activeCount = stages.filter(s => s.status === 'done').length;
  const totalSteps = stages.length;
  const progressPct = Math.round((activeCount / totalSteps) * 100);

  return (
    <div className="card-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Cryptographic Pipeline
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-crypto text-xs text-muted-foreground">
            {activeCount}/{totalSteps} stages
          </span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-mono-crypto text-xs text-muted-foreground w-8 text-right">
            {progressPct}%
          </span>
        </div>
      </div>

      <div className="flex items-start justify-between overflow-x-auto pb-2 gap-1">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <StageNode stage={stage} index={i} />
            {i < stages.length - 1 && (
              <Connector
                leftStatus={stage.status}
                rightStatus={stages[i + 1].status}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Algorithm labels */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-6 gap-y-1">
        {[
          { label: 'Symmetric', value: 'AES-256-GCM' },
          { label: 'Asymmetric', value: 'RSA-OAEP-SHA-256' },
          { label: 'Integrity', value: 'SHA-256' },
          { label: 'Key Size', value: '2048-bit RSA + 256-bit AES' },
        ].map(item => (
          <div key={`algo-${item.label}`} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}:</span>
            <span className="font-mono-crypto text-[10px] text-primary">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}