interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <label className="text-xs text-cyan-300 font-medium tracking-wide cursor-pointer">
        {label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200
                   ${checked ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' : 'bg-gray-700'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                     ${checked ? 'translate-x-4' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}
