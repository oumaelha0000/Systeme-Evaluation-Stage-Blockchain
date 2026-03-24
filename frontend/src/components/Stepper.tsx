import { CheckCircle2, Circle, Clock } from "lucide-react";

interface Step {
  id: number;
  label: string;
  description: string;
  status: "complete" | "current" | "upcoming";
}

interface StepperProps {
  steps: Step[];
}

export default function Stepper({ steps }: StepperProps) {
  return (
    <div className="py-6">
      <div className="relative">
        {/* Background line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 md:left-auto md:top-5 md:h-0.5 md:w-full md:left-0 md:bg-gray-200" aria-hidden="true" />
        
        <ul className="relative flex flex-col gap-6 md:flex-row md:justify-between md:gap-0">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className="relative flex gap-4 md:flex-col md:items-center md:flex-1">
              {/* Indicator */}
              <div className="flex h-9 items-center justify-center md:mt-0 relative z-10 w-full md:w-auto">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  step.status === "complete" ? "bg-indigo-600 ring-4 ring-white" :
                  step.status === "current" ? "border-2 border-indigo-600 bg-white ring-4 ring-white" :
                  "border-2 border-gray-300 bg-white ring-4 ring-white"
                }`}>
                  {step.status === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : step.status === "current" ? (
                    <Clock className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" aria-hidden="true" />
                  )}
                </span>
                
                {/* Connector line for mobile (hides on desktop) */}
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute left-4 top-9 -ml-px h-full w-0.5 bg-gray-200 md:hidden" aria-hidden="true" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex min-w-0 flex-col pb-4 md:pb-0 md:items-center md:text-center mt-1.5 md:mt-4 md:px-2">
                <span className={`text-sm font-semibold tracking-wide uppercase ${
                  step.status === "complete" ? "text-indigo-600" :
                  step.status === "current" ? "text-indigo-600" :
                  "text-gray-500"
                }`}>
                  {step.label}
                </span>
                <span className="text-sm text-gray-500 mt-1">{step.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
