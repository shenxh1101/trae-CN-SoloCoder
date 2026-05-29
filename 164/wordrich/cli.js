#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

let Segmentit;
try {
  Segmentit = require('segmentit');
} catch (e) {
  Segmentit = null;
}

let DEBUG = true;

function debugLog(tag, message) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`\n[DEBUG ${timestamp}] ${tag}: ${message}`);
  }
}

function debugObj(tag, obj) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`\n[DEBUG ${timestamp}] ${tag}:`);
    console.log(JSON.stringify(obj, null, 2));
  }
}

const EN_STOP_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say','her',
  'she','or','an','will','my','one','all','would','there','their','what','so','up',
  'out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','us','is','are','was',
  'were','been','being','has','had','did','does','done','am','very','much','more',
  'such','each','own','same','both','few','should','may','might','must','shall',
  'too','here','where','why','again','off','once','still','under','while','through',
  'between','before','after','during','without','within','along','across','around',
  'against','above','below','until','since','every','another','however','therefore',
  'although','whether','though','else','rather','yet','already','always','never',
  'often','sometimes','usually','really','quite','perhaps','almost','enough',
]);

const CN_STOP_WORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','一个','上','也','很',
  '到','说','要','去','你','会','着','没有','看','好','自己','这','他','她','它',
  '们','那','些','什么','怎么','如何','可以','没','吗','吧','呢','啊','哦','嗯',
  '呀','啦','哈','么','把','被','让','给','从','向','对','与','但','而','或','如',
  '因','为','所','以','之','其','中','等','还','又','再','才','已','已经','过',
  '来','去','起','开','出','得','地','着','过','能','会','可','应该','需要',
  '这个','那个','这些','那些','这里','那里','这么','那么','这样','那样',
  '一下','一点','一些','一直','一定','一切','一样','一般','不仅','不但',
  '而且','然而','虽然','但是','如果','因为','所以','因此','于是','然后',
  '接着','最后','首先','其次','另外','此外','除了','无论','不管','只要',
]);

const DOMAIN_KEYWORDS = {
  tech: {
    name: '科技',
    keywords: [
      'algorithm','data','software','hardware','network','database','cloud','ai','machine learning',
      'programming','code','system','server','client','api','framework','encryption','blockchain',
      'quantum','robot','sensor','digital','cyber','autonomous','neural','deep learning',
      'compute','binary','protocol','bandwidth','latency','compile','runtime',
      '算法','数据','软件','硬件','网络','数据库','云计算','人工智能','机器学习',
      '编程','代码','系统','服务器','客户端','框架','加密','区块链','量子',
      '机器人','传感器','数字','自动化','神经','深度学习','芯片','程序','接口',
      '协议','带宽','延迟','编译','运行','互联网','物联网','5G','开源','架构',
    ],
  },
  literature: {
    name: '文学',
    keywords: [
      'novel','poem','story','character','narrative','metaphor','symbolism','prose','verse',
      'fiction','drama','tragedy','comedy','romance','epic','lyric','sonnet','imagery',
      'theme','plot','dialogue','monologue','genre','memoir','biography','anthology',
      '小说','诗','故事','人物','叙事','比喻','象征','散文','诗歌',
      '戏剧','悲剧','喜剧','浪漫','史诗','抒情','意象','主题','情节','对话',
      '独白','体裁','回忆录','传记','选集','文学','笔触','意境','修辞','描绘',
    ],
  },
  sports: {
    name: '体育',
    keywords: [
      'game','match','team','player','score','goal','win','lose','championship','league',
      'tournament','coach','referee','stadium','athletics','swimming','running','football',
      'basketball','tennis','baseball','soccer','olympics','medal','record','training',
      '比赛','球队','球员','得分','进球','胜利','失败','冠军','联赛',
      '锦标赛','教练','裁判','体育场','田径','游泳','跑步','足球',
      '篮球','网球','棒球','奥运','奖牌','纪录','训练','赛季','犯规','点球',
    ],
  },
};

function tokenize(text) {
  debugLog('tokenize', '开始分词处理...');

  const chineseChars = [];
  const englishWords = [];
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  const chineseBlockRegex = /[\u4e00-\u9fff\u3400-\u4dbf]+/g;
  const englishWordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)*/g;

  debugLog('tokenize', '提取英文单词...');
  let match;
  while ((match = englishWordRegex.exec(text)) !== null) {
    englishWords.push(match[0].toLowerCase());
  }
  debugLog('tokenize', `提取到 ${englishWords.length} 个英文单词`);
  debugObj('英文单词列表(前20个)', englishWords.slice(0, 20));

  const chineseBlocks = text.match(chineseBlockRegex) || [];
  debugLog('tokenize', `发现 ${chineseBlocks.length} 个中文文本块`);

  if (Segmentit) {
    debugLog('tokenize', '使用 segmentit 进行中文分词');
    const segmenter = new Segmentit();
    for (const block of chineseBlocks) {
      const segments = segmenter.doSegment(block);
      for (const seg of segments) {
        const w = seg.w.trim();
        if (w && chineseRegex.test(w)) {
          chineseChars.push(w);
        }
      }
    }
  } else {
    debugLog('tokenize', '未检测到 segmentit，使用单字分词（每个汉字作为一个词）');
    for (const block of chineseBlocks) {
      for (const ch of block) {
        if (chineseRegex.test(ch)) {
          chineseChars.push(ch);
        }
      }
    }
  }

  debugLog('tokenize', `提取到 ${chineseChars.length} 个中文词/字`);
  debugObj('中文词列表(前20个)', chineseChars.slice(0, 20));
  debugLog('tokenize', `分词完成 - 总计: ${chineseChars.length + englishWords.length} 词`);

  return { chinese: chineseChars, english: englishWords };
}

function getStopWords(customStopWordsFile) {
  debugLog('getStopWords', '加载停用词...');
  const stopWords = new Set([...EN_STOP_WORDS, ...CN_STOP_WORDS]);
  debugLog('getStopWords', `默认停用词: ${EN_STOP_WORDS.size} 英文 + ${CN_STOP_WORDS.size} 中文 = ${stopWords.size} 个`);

  if (customStopWordsFile) {
    try {
      debugLog('getStopWords', `加载自定义停用词文件: ${customStopWordsFile}`);
      const content = fs.readFileSync(customStopWordsFile, 'utf-8');
      const words = content.split(/[\r\n,;，；\s]+/).filter(w => w.trim());
      debugLog('getStopWords', `自定义停用词列表: ${JSON.stringify(words)}`);
      for (const w of words) {
        stopWords.add(w.trim().toLowerCase());
      }
      debugLog('getStopWords', `加载后总停用词数: ${stopWords.size} 个`);
    } catch (e) {
      console.error(`无法读取停用词文件: ${customStopWordsFile}`);
      process.exit(1);
    }
  }

  return stopWords;
}

function countWordFrequencies(words, stopWords) {
  debugLog('countWordFrequencies', `统计词频，输入 ${words.length} 个词，停用词 ${stopWords.size} 个`);
  const freq = {};
  let filtered = 0;
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    } else {
      filtered++;
    }
  }
  debugLog('countWordFrequencies', `过滤 ${filtered} 个停用词，保留 ${Object.keys(freq).length} 个不同词`);
  debugObj('词频统计(前15个)', getTopN(freq, 15).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
  return freq;
}

function getTopN(freq, n) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function computeNgrams(words, n) {
  debugLog('computeNgrams', `开始计算 ${n}-gram，输入词数: ${words.length}`);

  const ngrams = {};
  const ngramDetails = [];

  for (let i = 0; i <= words.length - n; i++) {
    const gramWords = words.slice(i, i + n);
    const gram = gramWords.join(' ');
    ngrams[gram] = (ngrams[gram] || 0) + 1;

    if (i < 5) {
      ngramDetails.push({
        position: i,
        words: gramWords,
        gram: gram,
        count: ngrams[gram]
      });
    }
  }

  const uniqueGrams = Object.keys(ngrams).length;
  debugLog('computeNgrams', `${n}-gram 计算完成 - 总组合数: ${Math.max(0, words.length - n + 1)}, 不同组合: ${uniqueGrams}`);
  debugObj(`${n}-gram 生成过程示例(前5个)`, ngramDetails);

  const topN = getTopN(ngrams, 10);
  debugObj(`Top 10 ${n}-gram`, topN.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));

  return ngrams;
}

function splitSentences(text) {
  debugLog('splitSentences', '开始分句...');
  const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
  debugLog('splitSentences', `共分割出 ${sentences.length} 个句子`);

  sentences.forEach((s, i) => {
    if (i < 5) {
      debugLog('splitSentences', `句子 ${i + 1}: "${s.trim().substring(0, 50)}${s.trim().length > 50 ? '...' : ''}"`);
    }
  });

  return sentences;
}

function avgSentenceLength(text, allWords) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    debugLog('avgSentenceLength', '未检测到句子，平均句长为 0');
    return 0;
  }
  const avg = allWords.length / sentences.length;
  debugLog('avgSentenceLength', `总词数 ${allWords.length} / 句子数 ${sentences.length} = 平均句长 ${avg.toFixed(2)} 词`);
  return avg;
}

function detectDomain(text, tokenized) {
  debugLog('detectDomain', '开始领域检测...');
  const lowerText = text.toLowerCase();
  const allWords = [...tokenized.chinese, ...tokenized.english];
  const results = {};

  for (const [key, domain] of Object.entries(DOMAIN_KEYWORDS)) {
    let matchCount = 0;
    const matchedWords = [];
    const totalKeywords = domain.keywords.length;

    debugLog('detectDomain', `正在检测【${domain.name}】领域，关键词共 ${totalKeywords} 个`);

    for (const kw of domain.keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        matchCount++;
        matchedWords.push(kw);
      }
    }

    const score = totalKeywords > 0 ? (matchCount / totalKeywords * 100).toFixed(1) : '0.0';
    debugLog('detectDomain', `【${domain.name}】匹配到 ${matchCount}/${totalKeywords} 个关键词: ${JSON.stringify(matchedWords)}`);
    debugLog('detectDomain', `【${domain.name}】匹配度: ${score}%`);

    results[key] = {
      name: domain.name,
      matchedKeywords: matchCount,
      totalKeywords: totalKeywords,
      score: score,
      matchedWords: matchedWords,
    };
  }

  debugObj('领域检测完整结果', results);
  return results;
}

function drawAsciiChart(freq, topN = 20, maxWidth = 50) {
  debugLog('drawAsciiChart', `生成ASCII词频分布图，Top ${topN}，最大宽度 ${maxWidth}`);

  const sorted = getTopN(freq, topN);
  if (sorted.length === 0) {
    debugLog('drawAsciiChart', '没有数据可显示');
    return '';
  }

  const maxVal = sorted[0][1];
  const minVal = sorted[sorted.length - 1][1];
  const maxLabelLen = Math.max(2, ...sorted.map(s => s[0].length));
  const totalWidth = maxLabelLen + maxWidth + 10;

  debugLog('drawAsciiChart', `最高频: ${sorted[0][0]}=${maxVal}, 最低频: ${sorted[sorted.length - 1][0]}=${minVal}`);
  debugLog('drawAsciiChart', `图表参数: 标签最大长度=${maxLabelLen}, 总宽度=${totalWidth}`);

  const lines = [];

  lines.push('');
  lines.push('  ╔' + '═'.repeat(totalWidth) + '╗');
  lines.push('  ║' + ' '.repeat(Math.floor((totalWidth - 14) / 2)) + '词频分布图' + ' '.repeat(Math.ceil((totalWidth - 14) / 2)) + '║');
  lines.push('  ╠' + '═'.repeat(maxLabelLen + 2) + '╤' + '═'.repeat(maxWidth + 2) + '╪' + '═'.repeat(8) + '╣');
  lines.push('  ║' + ' 词汇' + ' '.repeat(maxLabelLen - 2) + ' │' + ' 分布' + ' '.repeat(maxWidth - 2) + ' │ 频率  ║');
  lines.push('  ╠' + '═'.repeat(maxLabelLen + 2) + '╪' + '═'.repeat(maxWidth + 2) + '╪' + '═'.repeat(8) + '╣');

  for (const [word, count] of sorted) {
    const barLen = Math.max(1, Math.round((count / maxVal) * maxWidth));
    const bar = '█'.repeat(barLen);
    const barFilled = bar + ' '.repeat(maxWidth - barLen);
    const label = word.padEnd(maxLabelLen, ' ');
    const countStr = count.toString().padStart(6, ' ');
    lines.push(`  ║ ${label} │ ${barFilled} │ ${countStr} ║`);
  }

  lines.push('  ╚' + '═'.repeat(maxLabelLen + 2) + '╧' + '═'.repeat(maxWidth + 2) + '╧' + '═'.repeat(8) + '╝');
  lines.push(`    图例: 最高频 = ${maxVal}, 总词种 = ${Object.keys(freq).length}`);
  lines.push('');

  debugLog('drawAsciiChart', `图表生成完成，共 ${lines.length} 行`);
  return lines.join('\n');
}

function analyzeText(text, options = {}) {
  debugLog('analyzeText', '========== 开始文本分析 ==========');
  debugLog('analyzeText', `文本长度: ${text.length} 字符`);

  const stopWords = getStopWords(options.stopWordsFile);
  const tokenized = tokenize(text);

  const cnWords = tokenized.chinese;
  const enWords = tokenized.english;
  const allWords = [...cnWords, ...enWords];

  debugLog('analyzeText', `合并所有词 - 中文: ${cnWords.length}, 英文: ${enWords.length}, 总计: ${allWords.length}`);
  debugObj('所有词列表(前30个)', allWords.slice(0, 30));

  const totalWords = allWords.length;
  const uniqueWords = new Set(allWords).size;
  const ttr = totalWords > 0 ? (uniqueWords / totalWords) : 0;

  debugLog('analyzeText', `基础统计 - 总词数: ${totalWords}, 不同词: ${uniqueWords}, TTR: ${ttr.toFixed(4)}`);

  const cnTotal = cnWords.length;
  const cnUnique = new Set(cnWords).size;
  const enTotal = enWords.length;
  const enUnique = new Set(enWords).size;

  debugLog('analyzeText', `中文统计 - 总: ${cnTotal}, 不同: ${cnUnique}, TTR: ${cnTotal > 0 ? (cnUnique / cnTotal).toFixed(4) : '0.0000'}`);
  debugLog('analyzeText', `英文统计 - 总: ${enTotal}, 不同: ${enUnique}, TTR: ${enTotal > 0 ? (enUnique / enTotal).toFixed(4) : '0.0000'}`);

  const totalWordLength = allWords.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = totalWords > 0 ? (totalWordLength / totalWords).toFixed(2) : '0.00';
  debugLog('analyzeText', `总词长: ${totalWordLength} 字符, 平均词长: ${avgWordLength}`);

  const freq = countWordFrequencies(allWords, stopWords);
  const top10 = getTopN(freq, 10);

  const cnFreq = countWordFrequencies(cnWords, stopWords);
  const enFreq = countWordFrequencies(enWords, stopWords);

  debugLog('computeNgrams', '========== 开始 N-gram 分析 ==========');
  const bigrams = computeNgrams(allWords, 2);
  const trigrams = computeNgrams(allWords, 3);
  const topBigrams = getTopN(bigrams, 10);
  const topTrigrams = getTopN(trigrams, 10);

  debugLog('analyzeText', '========== 开始句子分析 ==========');
  const avgSentLen = avgSentenceLength(text, allWords);
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;

  debugLog('analyzeText', '========== 开始领域检测 ==========');
  const domainResults = detectDomain(text, tokenized);

  debugLog('analyzeText', '========== 生成ASCII图表 ==========');
  const chart = drawAsciiChart(freq, 20);

  debugLog('analyzeText', '========== 文本分析完成 ==========');

  return {
    totalWords,
    uniqueWords,
    ttr: ttr.toFixed(4),
    vocabularyDensity: ttr.toFixed(4),
    avgWordLength,
    avgSentenceLength: avgSentLen.toFixed(2),
    sentenceCount,
    chinese: { total: cnTotal, unique: cnUnique, ttr: cnTotal > 0 ? (cnUnique / cnTotal).toFixed(4) : '0.0000' },
    english: { total: enTotal, unique: enUnique, ttr: enTotal > 0 ? (enUnique / enTotal).toFixed(4) : '0.0000' },
    top10Words: top10.map(([word, count]) => ({ word, count })),
    bigrams: topBigrams.map(([gram, count]) => ({ gram, count })),
    trigrams: topTrigrams.map(([gram, count]) => ({ gram, count })),
    domains: domainResults,
    chart,
  };
}

function formatReport(result, filePath) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║                          文本用词丰富度分析报告                                ║');
  lines.push('╠══════════════════════════════════════════════════════════════════════════════════╣');
  lines.push(`║  文件: ${filePath.padEnd(71)}║`);
  lines.push('╚══════════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  基础统计                                                                  │');
  lines.push('├──────────────────────────────────────────────────────────────────────────────┤');
  lines.push(`│  总词数:      ${String(result.totalWords).padEnd(12)}  不同词数:    ${String(result.uniqueWords).padEnd(12)}  词汇量:    ${result.uniqueWords}  │`);
  lines.push(`│  词次比(TTR): ${result.ttr.padEnd(12)}  词汇密度:    ${result.vocabularyDensity.padEnd(12)}               │`);
  lines.push(`│  平均词长:    ${result.avgWordLength.padEnd(12)}  平均句长:    ${result.avgSentenceLength.padEnd(12)}  句子数:    ${result.sentenceCount}  │`);
  lines.push('└──────────────────────────────────────────────────────────────────────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  中英文分离统计                                                            │');
  lines.push('├────────────┬────────────┬──────────┬────────────┬────────────┬──────────────┤');
  lines.push('│  语言      │  总词数    │  不同词  │  TTR       │  占比      │  平均词长     │');
  lines.push('├────────────┼────────────┼──────────┼────────────┼────────────┼──────────────┤');

  const cnRatio = result.totalWords > 0 ? ((result.chinese.total / result.totalWords) * 100).toFixed(1) : '0.0';
  const enRatio = result.totalWords > 0 ? ((result.english.total / result.totalWords) * 100).toFixed(1) : '0.0';

  lines.push(`│  中文      │  ${String(result.chinese.total).padEnd(10)}│  ${String(result.chinese.unique).padEnd(8)}│  ${result.chinese.ttr.padEnd(10)}│  ${(cnRatio + '%').padEnd(9)}│  N/A          │`);
  lines.push(`│  英文      │  ${String(result.english.total).padEnd(10)}│  ${String(result.english.unique).padEnd(8)}│  ${result.english.ttr.padEnd(10)}│  ${(enRatio + '%').padEnd(9)}│  N/A          │`);
  lines.push('└────────────┴────────────┴──────────┴────────────┴────────────┴──────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  最常用前10个词（忽略停用词）                                                │');
  lines.push('├──────────┬──────────────────────────────────────────────┬───────────────────┤');
  lines.push('│  排名    │  词汇                                        │  频率             │');
  lines.push('├──────────┼──────────────────────────────────────────────┼───────────────────┤');

  result.top10Words.forEach((item, index) => {
    const rank = String(index + 1).padEnd(8);
    const word = item.word.padEnd(44);
    const count = String(item.count).padEnd(17);
    lines.push(`│  ${rank}│  ${word}│  ${count}│`);
  });

  lines.push('└──────────┴──────────────────────────────────────────────┴───────────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  N-gram 分析 (双词组合 Top 10)                                              │');
  lines.push('├──────────┬──────────────────────────────────────────────┬───────────────────┤');
  lines.push('│  排名    │  双词组合                                    │  频率             │');
  lines.push('├──────────┼──────────────────────────────────────────────┼───────────────────┤');

  result.bigrams.forEach((item, index) => {
    const rank = String(index + 1).padEnd(8);
    const gram = item.gram.padEnd(44);
    const count = String(item.count).padEnd(17);
    lines.push(`│  ${rank}│  ${gram}│  ${count}│`);
  });

  lines.push('└──────────┴──────────────────────────────────────────────┴───────────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  N-gram 分析 (三词组合 Top 10)                                              │');
  lines.push('├──────────┬──────────────────────────────────────────────┬───────────────────┤');
  lines.push('│  排名    │  三词组合                                    │  频率             │');
  lines.push('├──────────┼──────────────────────────────────────────────┼───────────────────┤');

  result.trigrams.forEach((item, index) => {
    const rank = String(index + 1).padEnd(8);
    const gram = item.gram.padEnd(44);
    const count = String(item.count).padEnd(17);
    lines.push(`│  ${rank}│  ${gram}│  ${count}│`);
  });

  lines.push('└──────────┴──────────────────────────────────────────────┴───────────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│  领域匹配度检测                                                            │');
  lines.push('├──────────┬──────────┬──────────┬──────────┬────────────────────────────────┤');
  lines.push('│  领域    │  匹配数  │  总数    │  匹配度  │  匹配关键词                    │');
  lines.push('├──────────┼──────────┼──────────┼──────────┼────────────────────────────────┤');

  for (const [key, val] of Object.entries(result.domains)) {
    const matchedStr = val.matchedWords && val.matchedWords.length > 0
      ? val.matchedWords.slice(0, 5).join(', ') + (val.matchedWords.length > 5 ? '...' : '')
      : '无';
    lines.push(`│  ${val.name.padEnd(8)}│  ${String(val.matchedKeywords).padEnd(8)}│  ${String(val.totalKeywords).padEnd(8)}│  ${(val.score + '%').padEnd(8)}│  ${matchedStr.padEnd(30)}│`);
  }

  lines.push('└──────────┴──────────┴──────────┴──────────┴────────────────────────────────┘');
  lines.push('');

  lines.push(result.chart);
  return lines.join('\n');
}

function formatComparison(result1, result2, file1, file2) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║                          文本用词丰富度对比报告                                ║');
  lines.push('╚══════════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push('  ┌──────────────────────────────────────────────────────────────────────────────┐');
  lines.push(`  │  文件A: ${file1.padEnd(67)}│`);
  lines.push(`  │  文件B: ${file2.padEnd(67)}│`);
  lines.push('  └──────────────────────────────────────────────────────────────────────────────┘');
  lines.push('');

  lines.push('┌──────────────────┬──────────────────┬──────────────────┬──────────────────────┐');
  lines.push('│  指标            │  文件A            │  文件B            │  差异 (B - A)         │');
  lines.push('├──────────────────┼──────────────────┼──────────────────┼──────────────────────┤');

  const metrics = [
    ['总词数', result1.totalWords, result2.totalWords],
    ['不同词数', result1.uniqueWords, result2.uniqueWords],
    ['词次比(TTR)', parseFloat(result1.ttr), parseFloat(result2.ttr)],
    ['词汇密度', parseFloat(result1.vocabularyDensity), parseFloat(result2.vocabularyDensity)],
    ['平均词长', parseFloat(result1.avgWordLength), parseFloat(result2.avgWordLength)],
    ['平均句长', parseFloat(result1.avgSentenceLength), parseFloat(result2.avgSentenceLength)],
    ['中文总词数', result1.chinese.total, result2.chinese.total],
    ['中文TTR', parseFloat(result1.chinese.ttr), parseFloat(result2.chinese.ttr)],
    ['英文总词数', result1.english.total, result2.english.total],
    ['英文TTR', parseFloat(result1.english.ttr), parseFloat(result2.english.ttr)],
  ];

  for (const [label, val1, val2] of metrics) {
    const diff = typeof val1 === 'number' && typeof val2 === 'number'
      ? (val2 - val1).toFixed(4)
      : 'N/A';
    const str1 = String(val1).padEnd(18);
    const str2 = String(val2).padEnd(18);
    const diffStr = diff.padEnd(22);
    lines.push(`│  ${label.padEnd(16)}│  ${str1}│  ${str2}│  ${diffStr}│`);
  }

  lines.push('└──────────────────┴──────────────────┴──────────────────┴──────────────────────┘');
  lines.push('');

  lines.push('┌──────────┬──────────────────┬──────────────────┬─────────────────────────────┐');
  lines.push('│  领域    │  文件A匹配度      │  文件B匹配度      │  匹配关键词(A)              │');
  lines.push('├──────────┼──────────────────┼──────────────────┼─────────────────────────────┤');

  for (const key of Object.keys(result1.domains)) {
    const d1 = result1.domains[key];
    const d2 = result2.domains[key];
    const matchedStr = d1.matchedWords && d1.matchedWords.length > 0
      ? d1.matchedWords.slice(0, 4).join(', ') + (d1.matchedWords.length > 4 ? '...' : '')
      : '无';
    lines.push(`│  ${d1.name.padEnd(8)}│  ${(d1.score + '%').padEnd(16)}│  ${(d2.score + '%').padEnd(16)}│  ${matchedStr.padEnd(27)}│`);
  }

  lines.push('└──────────┴──────────────────┴──────────────────┴─────────────────────────────┘');
  lines.push('');

  lines.push('┌──────────────────────────────┬──────────────────────────────┐');
  lines.push('│  文件A 最常用词 (前5)        │  文件B 最常用词 (前5)        │');
  lines.push('├──────────────────┬───────────┼──────────────────┬───────────┤');
  lines.push('│  词汇            │  频率      │  词汇            │  频率      │');
  lines.push('├──────────────────┼───────────┼──────────────────┼───────────┤');

  for (let i = 0; i < 5; i++) {
    const a = result1.top10Words[i] || { word: '-', count: '-' };
    const b = result2.top10Words[i] || { word: '-', count: '-' };
    lines.push(`│  ${a.word.padEnd(16)}│  ${String(a.count).padEnd(9)}│  ${b.word.padEnd(16)}│  ${String(b.count).padEnd(9)}│`);
  }

  lines.push('└──────────────────┴───────────┴──────────────────┴───────────┘');
  lines.push('');

  return lines.join('\n');
}

function formatBatchTable(results) {
  const lines = [];
  lines.push('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║                                        批量文本分析汇总表                                                       ║');
  lines.push('╠═════════════════════════╤═══════╤═══════╤════════╤════════╤════════╤════════╤════════╤════════╤═══════════════════╣');
  lines.push('║  文件                   │ 总词数 │ 不同词 │  TTR   │ 词汇密 │ 平均词 │ 平均句 │ 中文词 │ 英文词 │  主导领域         │');
  lines.push('║                         │       │       │        │  度    │  长    │  长    │  数    │  数    │                   │');
  lines.push('╠═════════════════════════╪═══════╪═══════╪════════╪════════╪════════╪════════╪════════╪════════╪═══════════════════╣');

  for (const r of results) {
    let dominantDomain = '-';
    let maxScore = 0;
    for (const [key, val] of Object.entries(r.domains)) {
      const score = parseFloat(val.score);
      if (score > maxScore) {
        maxScore = score;
        dominantDomain = val.name;
      }
    }

    const fileName = r.fileName.length > 22 ? r.fileName.substring(0, 19) + '...' : r.fileName;

    lines.push('║  ' + fileName.padEnd(23) + '│ ' +
      String(r.totalWords).padEnd(5) + ' │ ' +
      String(r.uniqueWords).padEnd(5) + ' │ ' +
      r.ttr.padEnd(6) + ' │ ' +
      r.vocabularyDensity.padEnd(6) + ' │ ' +
      r.avgWordLength.padEnd(6) + ' │ ' +
      r.avgSentenceLength.padEnd(6) + ' │ ' +
      String(r.chinese.total).padEnd(6) + ' │ ' +
      String(r.english.total).padEnd(6) + ' │  ' +
      dominantDomain.padEnd(16) + '│');
  }

  lines.push('╚═════════════════════════╧═══════╧═══════╧════════╧════════╧════════╧════════╧════════╧════════╧═══════════════════╝');
  lines.push('');
  lines.push(`  总计分析 ${results.length} 个文件`);
  lines.push('');

  return lines.join('\n');
}

const program = new Command();

program
  .name('wordrich')
  .description('文本用词丰富度分析工具 - 支持中英文混合、N-gram、领域检测、对比分析等')
  .version('1.0.0');

program
  .command('analyze')
  .description('分析单个文本文件的用词丰富度')
  .argument('<file>', '文本文件路径 (.txt)')
  .option('-j, --json', '以JSON格式输出')
  .option('-s, --stopwords <file>', '自定义停用词文件路径')
  .option('--no-chart', '不显示ASCII柱状图')
  .option('--no-debug', '不显示调试信息')
  .action((file, options) => {
    const filePath = path.resolve(file);

    if (options.debug === false) {
      DEBUG = false;
    }

    debugLog('MAIN', `开始分析文件: ${file}`);
    debugLog('MAIN', `完整路径: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      process.exit(1);
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    debugLog('MAIN', `读取文件成功，文件大小: ${text.length} 字符`);
    debugLog('MAIN', `文件内容预览: ${text.substring(0, 150)}...`);

    const result = analyzeText(text, { stopWordsFile: options.stopwords });

    if (options.json) {
      const output = { ...result };
      if (options.noChart) delete output.chart;
      for (const key of Object.keys(output.domains)) {
        if (output.domains[key].matchedWords) {
          output.domains[key].matchedWords = output.domains[key].matchedWords;
        }
      }
      console.log(JSON.stringify(output, null, 2));
    } else {
      if (options.noChart) result.chart = '';
      console.log(formatReport(result, file));
    }

    debugLog('MAIN', '分析完成！');
  });

program
  .command('compare')
  .description('对比两个文本文件的用词丰富度')
  .argument('<file1>', '第一个文本文件')
  .argument('<file2>', '第二个文本文件')
  .option('-j, --json', '以JSON格式输出')
  .option('-s, --stopwords <file>', '自定义停用词文件路径')
  .option('--no-debug', '不显示调试信息')
  .action((file1, file2, options) => {
    const filePath1 = path.resolve(file1);
    const filePath2 = path.resolve(file2);

    if (options.debug === false) {
      DEBUG = false;
    }

    debugLog('MAIN', `开始对比文件: ${file1} vs ${file2}`);

    if (!fs.existsSync(filePath1)) {
      console.error(`文件不存在: ${filePath1}`);
      process.exit(1);
    }
    if (!fs.existsSync(filePath2)) {
      console.error(`文件不存在: ${filePath2}`);
      process.exit(1);
    }

    const text1 = fs.readFileSync(filePath1, 'utf-8');
    const text2 = fs.readFileSync(filePath2, 'utf-8');

    debugLog('MAIN', '========== 分析文件A ==========');
    const result1 = analyzeText(text1, { stopWordsFile: options.stopwords });

    debugLog('MAIN', '========== 分析文件B ==========');
    const result2 = analyzeText(text2, { stopWordsFile: options.stopwords });

    if (options.json) {
      console.log(JSON.stringify({ file1: result1, file2: result2 }, null, 2));
    } else {
      console.log(formatComparison(result1, result2, file1, file2));
    }

    debugLog('MAIN', '对比分析完成！');
  });

program
  .command('batch')
  .description('批量分析文件夹下所有.txt文件')
  .argument('<dir>', '文件夹路径')
  .option('-j, --json', '以JSON格式输出')
  .option('-s, --stopwords <file>', '自定义停用词文件路径')
  .option('--no-debug', '不显示调试信息')
  .action((dir, options) => {
    const dirPath = path.resolve(dir);

    if (options.debug === false) {
      DEBUG = false;
    }

    debugLog('MAIN', `开始批量分析文件夹: ${dir}`);
    debugLog('MAIN', `完整路径: ${dirPath}`);

    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      console.error(`文件夹不存在: ${dirPath}`);
      process.exit(1);
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt'));
    debugLog('MAIN', `发现 ${files.length} 个 .txt 文件: ${JSON.stringify(files)}`);

    if (files.length === 0) {
      console.error(`文件夹中没有.txt文件: ${dirPath}`);
      process.exit(1);
    }

    const results = [];
    for (const [idx, f] of files.entries()) {
      debugLog('MAIN', `========== 分析文件 ${idx + 1}/${files.length}: ${f} ==========`);
      const filePath = path.join(dirPath, f);
      const text = fs.readFileSync(filePath, 'utf-8');
      const result = analyzeText(text, { stopWordsFile: options.stopwords });
      result.fileName = f;
      results.push(result);
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatBatchTable(results));
    }

    debugLog('MAIN', `批量分析完成，共处理 ${results.length} 个文件`);
  });

program.parse();
