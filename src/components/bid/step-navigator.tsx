"use client";

import { Check } from "lucide-react";
import type { WizardStep } from "@/types/bid";

interface StepNavigatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepNavigator({ steps, currentStep, onStepClick }: StepNavigatorProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isComplete = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white"
                  : isComplete
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isComplete ? <Check size={12} /> : <span>{step.id}</span>}
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-px w-4 ${isComplete ? "bg-blue-400" : "bg-zinc-300 dark:bg-zinc-600"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
