import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { chatApi } from '../services/api';
import { useChatStore } from '../store/useChatStore';

interface VoteButtonsProps {
  messageId: string;
  conversationId: string;
  entryId: string | undefined;
  voted: boolean | undefined;
}

interface VoteResult {
  entry_id: string;
  helpful_count: number;
  not_helpful_count: number;
  total_votes: number;
  helpful_rate: number;
  current_weight: number;
  weight_change: string;
}

export default function VoteButtons({ messageId, conversationId, entryId, voted }: VoteButtonsProps) {
  const [localVoted, setLocalVoted] = useState<'helpful' | 'not_helpful' | null>(voted ? 'helpful' : null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const updateMessage = useChatStore(state => state.updateMessage);

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    if (localVoted || !entryId) return;

    try {
      const response = await chatApi.vote({
        entryId,
        messageId,
        conversationId,
        vote: voteType,
      });

      if (response.success && response.data) {
        setVoteResult(response.data as VoteResult);
        setLocalVoted(voteType);
        setShowThanks(true);
        updateMessage(conversationId, messageId, { voted: true });

        setTimeout(() => setShowThanks(false), 3000);
      }
    } catch (error) {
      console.error('投票失败:', error);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 mr-2">这个回答有帮助吗？</span>
        
        <button
          onClick={() => handleVote('helpful')}
          disabled={!!localVoted}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            localVoted === 'helpful'
              ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
              : localVoted
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:ring-1 hover:ring-green-300'
          }`}
        >
          {localVoted === 'helpful' ? (
            <Check className="w-4 h-4" />
          ) : (
            <ThumbsUp className="w-4 h-4" />
          )}
          <span>有帮助</span>
        </button>

        <button
          onClick={() => handleVote('not_helpful')}
          disabled={!!localVoted}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            localVoted === 'not_helpful'
              ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
              : localVoted
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:ring-1 hover:ring-red-300'
          }`}
        >
          {localVoted === 'not_helpful' ? (
            <Check className="w-4 h-4" />
          ) : (
            <ThumbsDown className="w-4 h-4" />
          )}
          <span>无帮助</span>
        </button>
      </div>

      {voteResult && (
        <div className="flex flex-wrap items-center gap-3 text-xs bg-gradient-to-r from-gray-50 to-transparent p-2 rounded-lg">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">总投票:</span>
            <span className="font-semibold text-gray-700">{voteResult.total_votes}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600">👍 {voteResult.helpful_count}</span>
            <span className="text-gray-300">/</span>
            <span className="text-red-600">👎 {voteResult.not_helpful_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">好评率:</span>
            <span className="font-semibold text-primary-600">
              {(voteResult.helpful_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">权重:</span>
            <span className={`font-mono font-semibold flex items-center gap-1 ${
              voteResult.weight_change.startsWith('+') ? 'text-green-600' : 'text-orange-600'
            }`}>
              {voteResult.current_weight.toFixed(2)}
              {voteResult.weight_change.startsWith('+') ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span className="text-xs">({voteResult.weight_change})</span>
            </span>
          </div>
        </div>
      )}

      {showThanks && (
        <div className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          感谢您的反馈！您的评价将帮助我们改进回答质量。
        </div>
      )}
    </div>
  );
}
