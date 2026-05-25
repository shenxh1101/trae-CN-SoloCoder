import type { ShoeConfig } from '@/types';
import { generateShareLink } from './configSerializer';

interface ShareCardData {
  title: string;
  description: string;
  image: string;
  url: string;
  config: ShoeConfig;
}

export const generateShareCardData = (
  config: ShoeConfig,
  thumbnail: string = ''
): ShareCardData => {
  const primaryColor = config.parts.upper.color;
  const secondaryColor = config.parts.sole.color;

  return {
    title: `${config.name} - 定制跑鞋`,
    description: `我设计了一款独特的跑鞋！鞋面${primaryColor}，鞋底${secondaryColor}，快来看看吧！`,
    image: thumbnail,
    url: generateShareLink(config),
    config
  };
};

export const copyShareLinkToClipboard = async (config: ShoeConfig): Promise<boolean> => {
  try {
    const link = generateShareLink(config);
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('Failed to copy share link:', error);
    return false;
  }
};

export const shareToTwitter = (cardData: ShareCardData): void => {
  const text = encodeURIComponent(`${cardData.title}\n${cardData.description}`);
  const url = encodeURIComponent(cardData.url);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
};

export const shareToFacebook = (cardData: ShareCardData): void => {
  const url = encodeURIComponent(cardData.url);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

export const shareToWeibo = (cardData: ShareCardData): void => {
  const text = encodeURIComponent(`${cardData.title} ${cardData.description}`);
  const url = encodeURIComponent(cardData.url);
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${text}`, '_blank');
};

export const shareToWhatsApp = (cardData: ShareCardData): void => {
  const text = encodeURIComponent(`${cardData.title}\n${cardData.description}\n${cardData.url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
};

export const nativeShare = async (cardData: ShareCardData): Promise<boolean> => {
  if (!navigator.share) return false;

  try {
    await navigator.share({
      title: cardData.title,
      text: cardData.description,
      url: cardData.url
    });
    return true;
  } catch (error) {
    console.error('Native share failed:', error);
    return false;
  }
};

export const generateQRCodeUrl = (text: string, size: number = 256): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
};

export const createShareCardImage = async (
  cardData: ShareCardData,
  width: number = 800,
  height: number = 600
): Promise<string | null> => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 137) % width;
      const y = (i * 89) % height;
      ctx.beginPath();
      ctx.arc(x, y, 30 + (i % 3) * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    if (cardData.image) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = cardData.image;
      });

      const imgSize = 300;
      const imgX = (width - imgSize) / 2;
      const imgY = 80;

      ctx.shadowColor = cardData.config.parts.upper.color;
      ctx.shadowBlur = 30;
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.shadowBlur = 0;
    }

    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(cardData.title, width / 2, 450);

    ctx.font = '20px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(cardData.description, width / 2, 490, 700);

    const qrSize = 120;
    const qrX = (width - qrSize) / 2;
    const qrY = 530;

    const qrUrl = generateQRCodeUrl(cardData.url, qrSize);
    const qrImg = new window.Image();
    qrImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
      qrImg.src = qrUrl;
    });

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to create share card image:', error);
    return null;
  }
};
