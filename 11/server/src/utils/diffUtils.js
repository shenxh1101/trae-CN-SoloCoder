const Diff = require('diff');

const computeDiff = (oldCode, newCode) => {
  const changes = Diff.diffLines(oldCode, newCode);
  
  return changes.map((part, index) => ({
    id: index,
    value: part.value,
    added: part.added || false,
    removed: part.removed || false,
    count: part.count
  }));
};

const computeWordDiff = (oldCode, newCode) => {
  const changes = Diff.diffWordsWithSpace(oldCode, newCode);
  
  return changes.map((part, index) => ({
    id: index,
    value: part.value,
    added: part.added || false,
    removed: part.removed || false,
    count: part.count
  }));
};

const compareVersions = (version1, version2) => {
  const lineDiff = computeDiff(version1.code, version2.code);
  const wordDiff = computeWordDiff(version1.code, version2.code);
  
  const stats = {
    additions: 0,
    deletions: 0,
    changes: 0
  };
  
  lineDiff.forEach(part => {
    if (part.added) {
      stats.additions += part.count || 0;
      stats.changes++;
    } else if (part.removed) {
      stats.deletions += part.count || 0;
      stats.changes++;
    }
  });
  
  return {
    lineDiff,
    wordDiff,
    stats,
    version1: {
      id: version1.id,
      createdAt: version1.createdAt,
      createdBy: version1.createdBy,
      language: version1.language
    },
    version2: {
      id: version2.id,
      createdAt: version2.createdAt,
      createdBy: version2.createdBy,
      language: version2.language
    }
  };
};

module.exports = {
  computeDiff,
  computeWordDiff,
  compareVersions
};
