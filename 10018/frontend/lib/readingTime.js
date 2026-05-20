export function calculateReadingTime(content) {
  if (!content) return 0;
  
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/[#*_~>\-!\\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = plainText.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  
  const chineseTime = chineseChars / 300;
  const englishTime = englishWords / 200;
  
  const totalTime = Math.ceil(chineseTime + englishTime);
  
  return Math.max(1, totalTime);
}

export function formatReadingTime(minutes) {
  if (minutes < 1) return '不到 1 分钟';
  if (minutes === 1) return '1 分钟';
  return `${minutes} 分钟`;
}
