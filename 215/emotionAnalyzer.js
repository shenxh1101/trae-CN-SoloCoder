class EmotionAnalyzer {
    constructor() {
        this.positiveWords = new Set([
            '好', '棒', '赞', '美', '喜', '爱', '乐', '快', '幸', '福',
            '开心', '快乐', '高兴', '喜欢', '热爱', '美好', '完美', '精彩',
            '优秀', '出色', '卓越', '杰出', '伟大', '崇高', '纯洁', '真诚',
            '善良', '友好', '温柔', '温暖', '温馨', '感动', '感激', '感谢',
            '满意', '满足', '愉快', '愉悦', '欢乐', '喜悦', '兴奋', '激动',
            '希望', '梦想', '成功', '胜利', '成就', '荣誉', '光荣', '自豪',
            '自信', '勇敢', '坚强', '乐观', '积极', '向上', '进步', '发展',
            'good', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic',
            'love', 'happy', 'joy', 'joyful', 'delight', 'delightful', 'pleased',
            'beautiful', 'brilliant', 'outstanding', 'remarkable', 'superb',
            'nice', 'awesome', 'cool', 'perfect', 'positive', 'optimistic'
        ]);

        this.negativeWords = new Set([
            '坏', '糟', '差', '丑', '恨', '厌', '悲', '痛', '苦', '哀',
            '难过', '伤心', '痛苦', '悲伤', '悲哀', '忧虑', '忧愁', '忧郁',
            '愤怒', '生气', '恼怒', '愤慨', '憎恨', '厌恶', '厌烦', '讨厌',
            '失望', '绝望', '沮丧', '消沉', '消极', '悲观', '自卑', '恐惧',
            '害怕', '恐慌', '焦虑', '紧张', '不安', '烦躁', '郁闷', '孤独',
            '寂寞', '空虚', '无聊', '乏味', '疲倦', '疲惫', '困窘', '艰难',
            '失败', '挫折', '困难', '麻烦', '问题', '危机', '危险', '威胁',
            'bad', 'terrible', 'awful', 'horrible', 'dreadful', 'unpleasant',
            'hate', 'sad', 'sadness', 'sorrow', 'grief', 'misery', 'suffering',
            'angry', 'anger', 'frustrated', 'frustration', 'disappointed',
            'disappointment', 'fear', 'afraid', 'scared', 'anxious', 'anxiety',
            'worried', 'worry', 'negative', 'pessimistic', 'depressed', 'depression'
        ]);

        this.intensifiers = new Set([
            '非常', '极其', '特别', '十分', '相当', '很', '真的', '太',
            '最', '更', '越来越', '格外', '分外', '尤其',
            'very', 'extremely', 'incredibly', 'absolutely', 'totally',
            'completely', 'utterly', 'highly', 'really', 'so', 'too', 'most', 'more'
        ]);

        this.negations = new Set([
            '不', '没', '无', '非', '否', '不要', '不会', '不能', '不是',
            '没有', '从未', '未必', '难以', '无法',
            'not', "don't", "doesn't", "didn't", "won't", "can't",
            'never', 'no', 'none', 'neither', 'nor', 'without'
        ]);
    }

    analyze(text) {
        if (!text || text.trim().length === 0) {
            return {
                positive: 0.1,
                neutral: 0.8,
                negative: 0.1,
                dominant: 'neutral',
                confidence: 0
            };
        }

        const words = this.tokenize(text.toLowerCase());
        let positiveScore = 0;
        let negativeScore = 0;
        let totalWords = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            let multiplier = 1;
            
            if (i > 0 && this.negations.has(words[i - 1])) {
                multiplier = -1;
            }
            
            if (i > 0 && this.intensifiers.has(words[i - 1])) {
                multiplier *= 1.5;
            }

            if (this.positiveWords.has(word)) {
                positiveScore += multiplier;
                totalWords++;
            } else if (this.negativeWords.has(word)) {
                negativeScore += multiplier;
                totalWords++;
            }
        }

        if (totalWords === 0) {
            return {
                positive: 0.1,
                neutral: 0.8,
                negative: 0.1,
                dominant: 'neutral',
                confidence: 0.9,
                wordCount: words.length
            };
        }

        const netScore = positiveScore - negativeScore;
        const totalScore = Math.abs(positiveScore) + Math.abs(negativeScore);
        const confidence = Math.min(totalScore / totalWords, 1);

        let positive, neutral, negative;
        
        if (netScore > 0.5) {
            positive = 0.5 + (netScore / totalScore) * 0.4;
            negative = 0.1;
            neutral = 1 - positive - negative;
        } else if (netScore < -0.5) {
            negative = 0.5 + (Math.abs(netScore) / totalScore) * 0.4;
            positive = 0.1;
            neutral = 1 - positive - negative;
        } else {
            neutral = 0.5 + (1 - Math.abs(netScore) / Math.max(totalScore, 1)) * 0.3;
            positive = (1 - neutral) * (positiveScore / totalScore || 0.5);
            negative = 1 - neutral - positive;
        }

        let dominant;
        if (positive > neutral && positive > negative) {
            dominant = 'positive';
        } else if (negative > neutral && negative > positive) {
            dominant = 'negative';
        } else {
            dominant = 'neutral';
        }

        return {
            positive: Math.round(positive * 100) / 100,
            neutral: Math.round(neutral * 100) / 100,
            negative: Math.round(negative * 100) / 100,
            dominant,
            confidence: Math.round(confidence * 100) / 100,
            wordCount: words.length,
            positiveMatches: positiveScore,
            negativeMatches: negativeScore
        };
    }

    tokenize(text) {
        const chineseRegex = /[\u4e00-\u9fa5]/g;
        const englishRegex = /[a-zA-Z]+/g;
        
        const chineseChars = (text.match(chineseRegex) || []).join('');
        const englishWords = text.match(englishRegex) || [];
        
        const chineseWords = [];
        for (let i = 0; i < chineseChars.length; i++) {
            if (i + 1 < chineseChars.length) {
                const bigram = chineseChars[i] + chineseChars[i + 1];
                if (this.positiveWords.has(bigram) || 
                    this.negativeWords.has(bigram) || 
                    this.intensifiers.has(bigram) || 
                    this.negations.has(bigram)) {
                    chineseWords.push(bigram);
                    i++;
                    continue;
                }
            }
            chineseWords.push(chineseChars[i]);
        }
        
        return [...chineseWords, ...englishWords];
    }

    async analyzeWithAPI(text) {
        try {
            const response = await fetch('https://api.example.com/emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.log('API not available, using local analyzer');
        }
        
        return this.analyze(text);
    }

    getEmotionDescription(emotion) {
        const descriptions = {
            positive: [
                '温暖如阳光', '充满希望', '心情愉悦', '积极向上',
                '活力四射', '欢欣鼓舞', '春风得意', '心花怒放'
            ],
            neutral: [
                '平静如水', '波澜不惊', '平和稳定', '淡然处之',
                '心如止水', '宁静致远', '平稳过渡', '不偏不倚'
            ],
            negative: [
                '忧郁笼罩', '心情沉重', '思绪纷乱', '压力山大',
                '情绪低落', '黯然神伤', '愁云惨淡', '心力交瘁'
            ]
        };
        
        const list = descriptions[emotion.dominant] || descriptions.neutral;
        return list[Math.floor(Math.random() * list.length)];
    }
}
