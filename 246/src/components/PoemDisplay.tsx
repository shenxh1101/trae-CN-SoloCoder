import { useCloudStore } from '@/store/useCloudStore';

export default function PoemDisplay() {
  const { poem, analysis } = useCloudStore();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-2xl w-[90%]">
      <div className="glass-panel px-6 py-4 flex flex-col items-center gap-3">
        <p className="text-lg text-white/90 font-serif tracking-[0.3em] text-center leading-relaxed">
          {poem || '请输入诗句...'}
        </p>
        {analysis.keywords.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {analysis.keywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-serif tracking-wider border"
                style={{
                  backgroundColor: kw.colorHex ? `${kw.colorHex}22` : 'rgba(255,255,255,0.05)',
                  borderColor: kw.colorHex ? `${kw.colorHex}44` : 'rgba(255,255,255,0.1)',
                  color: kw.colorHex || 'rgba(255,255,255,0.7)',
                }}
              >
                <span className="font-medium">{kw.word}</span>
                <span className="opacity-60">→</span>
                <span className="opacity-80">{kw.mapping}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
