type Props = {
  currentStep: 1 | 2 | 3 | 4;
};

const LABELS: Record<number, string> = {
  1: "Set your cap",
  2: "Baseline",
  3: "Pacing mode",
  4: "Ready",
};

export function OnboardingProgress({ currentStep }: Props) {
  const totalSteps = 4;

  return (
    <div className="mb-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 mb-4">
        Step {currentStep} of {totalSteps} · {LABELS[currentStep]}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < currentStep ? "bg-zinc-900" : "bg-zinc-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}