'use client';

import Link from 'next/link';

export default function TagCloud({ tags }) {
  if (!tags || tags.length === 0) return null;

  const maxCount = Math.max(...tags.map((t) => t.count));
  const minCount = Math.min(...tags.map((t) => t.count));

  const getFontSize = (count) => {
    if (maxCount === minCount) return 'text-base';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio < 0.33) return 'text-sm';
    if (ratio < 0.66) return 'text-base';
    return 'text-lg';
  };

  const getColor = (count) => {
    if (maxCount === minCount) return 'text-gray-600';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio < 0.33) return 'text-gray-500';
    if (ratio < 0.66) return 'text-blue-500';
    return 'text-purple-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">标签云</h3>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link
            key={tag._id}
            href={`/tags/${tag.slug}`}
            className={`${getFontSize(tag.count)} ${getColor(tag.count)} hover:text-blue-600 transition`}
          >
            #{tag.name}
            <span className="text-xs text-gray-400 ml-1">({tag.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
