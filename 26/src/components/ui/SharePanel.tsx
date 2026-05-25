import React, { useState } from 'react';
import { Share2, Twitter, Facebook, MessageCircle, Copy, Check, Download } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { generateShareCardData, copyShareLinkToClipboard, shareToTwitter, shareToFacebook, shareToWhatsApp, nativeShare, createShareCardImage, generateQRCodeUrl } from '@/utils/shareUtils';
import { cn } from '@/lib/utils';

interface SharePanelProps {
  thumbnail?: string;
  className?: string;
}

export const SharePanel = ({ thumbnail = '', className }: SharePanelProps) => {
  const config = useConfigStore((state) => state.config);
  const [copied, setCopied] = useState(false);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const shareData = generateShareCardData(config, thumbnail);

  const handleCopyLink = async () => {
    const success = await copyShareLinkToClipboard(config);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateCard = async () => {
    setGenerating(true);
    try {
      const image = await createShareCardImage(shareData);
      setCardImage(image);
    } catch (error) {
      console.error('Failed to generate share card:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCard = () => {
    if (!cardImage) return;
    const link = document.createElement('a');
    link.href = cardImage;
    link.download = `my-shoe-design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    await nativeShare(shareData);
  };

  const qrCodeUrl = generateQRCodeUrl(shareData.url, 150);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">分享设计</span>
      </div>

      <div className="p-3 bg-white/5 rounded-lg">
        <div className="text-xs text-white/60 mb-3">分享链接</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={shareData.url}
            readOnly
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 text-xs font-mono focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-white'
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> 已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> 复制
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-3 bg-white/5 rounded-lg">
        <div className="text-xs text-white/60 mb-3">社交平台</div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => shareToTwitter(shareData)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/20 hover:bg-sky-500/20 hover:border-sky-400/50 transition-all group"
          >
            <Twitter className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white/70">Twitter</span>
          </button>
          <button
            onClick={() => shareToFacebook(shareData)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/20 hover:bg-blue-500/20 hover:border-blue-400/50 transition-all group"
          >
            <Facebook className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white/70">Facebook</span>
          </button>
          <button
            onClick={() => shareToWhatsApp(shareData)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/20 hover:bg-green-500/20 hover:border-green-400/50 transition-all group"
          >
            <MessageCircle className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white/70">WhatsApp</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all group"
          >
            <Share2 className="w-5 h-5 text-white/70 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white/70">更多</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/60 mb-2">二维码</div>
          <div className="bg-white p-2 rounded-lg">
            <img src={qrCodeUrl} alt="QR Code" className="w-full" />
          </div>
          <p className="text-xs text-white/50 text-center mt-2">扫描二维码查看</p>
        </div>

        <div className="p-3 bg-white/5 rounded-lg space-y-2">
          <div className="text-xs text-white/60 mb-2">分享卡片</div>
          {cardImage ? (
            <div className="space-y-2">
              <img src={cardImage} alt="Share Card" className="w-full rounded-lg" />
              <button
                onClick={handleDownloadCard}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-white text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                下载卡片
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateCard}
              disabled={generating}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed transition-all',
                generating
                  ? 'border-white/10 text-white/30 cursor-wait'
                  : 'border-white/30 hover:border-cyan-400 text-white/70 hover:text-white'
              )}
            >
              {generating ? (
                <>
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">生成中...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-6 h-6" />
                  <span className="text-xs">生成分享卡片</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePanel;
