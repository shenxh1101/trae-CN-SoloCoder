import { Scale } from 'lucide-react';

interface LegalReferenceProps {
  references: string[];
}

export default function LegalReference({ references }: LegalReferenceProps) {
  if (!references || references.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-gold-50 border-l-4 border-gold-400 rounded-r-lg">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-4 h-4 text-gold-600" />
        <span className="text-sm font-semibold text-gold-800">相关法律依据</span>
      </div>
      <ul className="space-y-1">
        {references.map((ref, index) => (
          <li key={index} className="text-sm text-gold-900 flex items-start gap-2">
            <span className="text-gold-500 mt-0.5">•</span>
            <span>{ref}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
