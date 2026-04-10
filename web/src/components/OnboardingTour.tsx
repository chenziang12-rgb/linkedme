import { useEffect, useState } from 'react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobileTab?: number; // Which mobile tab to show (1 = Sources, 2 = Profile, 3 = Interests)
}

interface OnboardingTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onMobileTabChange?: (tabNumber: number) => void; // Callback to change mobile tab
}

export default function OnboardingTour({ steps, isActive, onComplete, onSkip, onMobileTabChange }: OnboardingTourProps): JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Change mobile tab when step changes
  useEffect(() => {
    if (isActive && isMobile && currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.mobileTab && onMobileTabChange) {
        onMobileTabChange(step.mobileTab);
      }
    }
  }, [currentStep, steps, isActive, isMobile, onMobileTabChange]);

  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return;

    const updatePosition = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.target);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      
      // For mobile, always center the modal at bottom of screen
      if (isMobile) {
        setPosition({
          top: window.innerHeight - 20,
          left: window.innerWidth / 2,
        });
        element.classList.add('tour-highlight');
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // For body element or mobile, use fixed centered position
      if (element.tagName === 'BODY') {
        setPosition({
          top: window.innerHeight / 2 + window.scrollY,
          left: window.innerWidth / 2,
        });
        element.classList.add('tour-highlight');
        return;
      }

      // Scroll element into view if not visible
      const isVisible = rect.top >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.left >= 0 && 
                       rect.right <= window.innerWidth;
      
      if (!isVisible) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(updatePosition, 300);
        return;
      }

      const modalWidth = 384;
      const modalHeight = 220;
      const padding = 16;

      // Use viewport-relative coordinates directly (fixed positioning, no scroll offset needed)
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2;
          break;
        case 'top':
          top = rect.top - padding - modalHeight;
          left = rect.left + rect.width / 2;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - modalHeight / 2;
          left = rect.right + padding;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - modalHeight / 2;
          left = rect.left - padding - modalWidth;
          break;
      }

      // Clamp to viewport
      const minLeft = padding;
      const maxLeft = window.innerWidth - padding;
      const minTop = padding;
      const maxTop = window.innerHeight - padding;

      if (left - modalWidth / 2 < minLeft) left = minLeft + modalWidth / 2;
      else if (left + modalWidth / 2 > maxLeft) left = maxLeft - modalWidth / 2;

      if (top < minTop) top = minTop;
      else if (top + modalHeight > maxTop) top = maxTop - modalHeight;

      setPosition({ top, left });
      element.classList.add('tour-highlight');
    };

    // Small delay to let the DOM settle (especially when a mobile tab just changed)
    const timer = setTimeout(updatePosition, 50);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      
      document.querySelectorAll('.tour-highlight').forEach((el) => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, steps, isActive, isMobile]);

  if (!isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getModalPosition = (): React.CSSProperties => {
    // Mobile: fixed at bottom
    if (isMobile) {
      return { position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 9999 };
    }

    // Desktop: fixed positioning so coordinates map directly to viewport
    const base: React.CSSProperties = { position: 'fixed', zIndex: 9999, top: `${position.top}px` };

    if (step.position === 'bottom' || step.position === 'top') {
      return { ...base, left: `${position.left}px`, transform: 'translateX(-50%)' };
    }
    // left / right — top already accounts for centering
    return { ...base, left: `${position.left}px` };
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onSkip} />

      {/* Tour Modal */}
      <div
        style={getModalPosition()}
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 p-4 md:p-6 ${
          isMobile ? 'w-auto' : 'max-w-sm w-full'
        } max-h-[70vh] md:max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in duration-200`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Skip tour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 md:mb-6 leading-relaxed">{step.content}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <button
            onClick={onSkip}
            className="text-sm text-center sm:text-left text-slate-500 hover:text-slate-700 font-medium transition-colors py-2 sm:py-0"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              {isLastStep ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>

        {/* Arrow pointer - hidden on mobile */}
        {!isMobile && (
          <div
            className={`absolute w-0 h-0 ${
              step.position === 'bottom'
                ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white -top-2 left-1/2 -translate-x-1/2'
                : step.position === 'top'
                ? 'border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white -bottom-2 left-1/2 -translate-x-1/2'
                : step.position === 'right'
                ? 'border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white -left-2 top-1/2 -translate-y-1/2'
                : 'border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white -right-2 top-1/2 -translate-y-1/2'
            }`}
          />
        )}
      </div>

      {/* Add global styles for highlight */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9999;
          box-shadow: 0 0 0 4px rgba(255, 42, 84, 0.55), 0 0 20px 8px rgba(255, 155, 0, 0.25) !important;
          border-radius: 8px;
          background-color: white;
        }
      `}</style>
    </>
  );
}
