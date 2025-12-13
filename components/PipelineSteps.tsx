import React from 'react';
import { PipelineStep } from '../types';
import { CheckCircle2, Circle, Loader2, Edit3, Search } from 'lucide-react';

interface PipelineStepsProps {
  currentStep: PipelineStep;
}

const steps = [
  { id: PipelineStep.ANALYZING, label: 'Analysis' },
  { id: PipelineStep.SCENE_PLANNING, label: 'Planning' },
  { id: PipelineStep.REVIEW, label: 'Review' },
  { id: PipelineStep.ASSET_GENERATION, label: 'Production' },
];

export const PipelineSteps: React.FC<PipelineStepsProps> = ({ currentStep }) => {
  const getStepStatus = (stepId: PipelineStep) => {
    const getValue = (s: PipelineStep) => {
      switch(s) {
        case PipelineStep.IDLE: return 0;
        case PipelineStep.ANALYZING: return 1;
        case PipelineStep.STRATEGY: return 1; 
        case PipelineStep.NARRATIVE: return 2; 
        case PipelineStep.SCENE_PLANNING: return 2;
        case PipelineStep.REVIEW: return 3;
        case PipelineStep.ASSET_GENERATION: return 4;
        case PipelineStep.COMPLETE: return 5;
        default: return 0;
      }
    };

    const currentIdValue = getValue(currentStep);
    const stepIdValue = getValue(stepId);

    if (currentIdValue > stepIdValue) return 'completed';
    if (currentIdValue === stepIdValue) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto mb-8 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const isActive = status === 'active';
        
        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
              ${status === 'completed' ? 'bg-green-500/20 text-green-400' : ''}
              ${isActive ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50' : ''}
              ${status === 'pending' ? 'bg-zinc-800 text-zinc-600' : ''}
            `}>
              {status === 'completed' && <CheckCircle2 size={18} />}
              {isActive && step.id === PipelineStep.ANALYZING && <Search size={16} className="animate-pulse" />}
              {isActive && step.id === PipelineStep.REVIEW && <Edit3 size={16} />}
              {isActive && step.id !== PipelineStep.REVIEW && step.id !== PipelineStep.ANALYZING && <Loader2 size={18} className="animate-spin" />}
              {status === 'pending' && <Circle size={18} />}
            </div>
            <span className={`text-sm font-medium hidden md:block ${
              isActive ? 'text-white' : 
              status === 'completed' ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className="w-8 h-[1px] bg-zinc-800 mx-2 hidden sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
};
