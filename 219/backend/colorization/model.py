import os
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F


class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.double_conv(x)


class Down(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.maxpool_conv = nn.Sequential(
            nn.MaxPool2d(2),
            DoubleConv(in_channels, out_channels)
        )

    def forward(self, x):
        return self.maxpool_conv(x)


class Up(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_channels, in_channels // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_channels, out_channels)

    def forward(self, x1, x2):
        x1 = self.up(x1)
        diffY = x2.size()[2] - x1.size()[2]
        diffX = x2.size()[3] - x1.size()[3]
        x1 = F.pad(x1, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        x = torch.cat([x2, x1], dim=1)
        return self.conv(x)


class OutConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)

    def forward(self, x):
        return self.conv(x)


class UNet(nn.Module):
    def __init__(self, n_channels=1, n_classes=2):
        super().__init__()
        self.n_channels = n_channels
        self.n_classes = n_classes

        self.inc = DoubleConv(n_channels, 64)
        self.down1 = Down(64, 128)
        self.down2 = Down(128, 256)
        self.down3 = Down(256, 512)
        self.down4 = Down(512, 1024)
        self.up1 = Up(1024, 512)
        self.up2 = Up(512, 256)
        self.up3 = Up(256, 128)
        self.up4 = Up(128, 64)
        self.outc = OutConv(64, n_classes)

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)
        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)
        logits = self.outc(x)
        return torch.tanh(logits)


class ColorizationModel:
    def __init__(self, weights_path=None, device=None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._build_model()
        self._load_weights(weights_path)
        self.model = self.model.to(self.device)
        self.model.eval()

    def _build_model(self):
        return UNet(n_channels=1, n_classes=2)

    def _load_weights(self, weights_path):
        if weights_path and os.path.exists(weights_path):
            try:
                state_dict = torch.load(weights_path, map_location=self.device, weights_only=True)
                self.model.load_state_dict(state_dict)
                print(f"Loaded pretrained weights from {weights_path}")
            except Exception as e:
                print(f"Failed to load weights: {e}, using initialized weights")
                self._init_pretrained_weights()
        else:
            self._init_pretrained_weights()

    def _init_pretrained_weights(self):
        def init_weights(m):
            if isinstance(m, nn.Conv2d) or isinstance(m, nn.ConvTranspose2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

        self.model.apply(init_weights)

        with torch.no_grad():
            self.model.outc.conv.weight.data *= 0.1
            if self.model.outc.conv.bias is not None:
                self.model.outc.conv.bias.data *= 0

    def predict(self, gray_img, warmth=0.0, saturation=1.0):
        h, w = gray_img.shape[:2]

        if len(gray_img.shape) == 3:
            gray_bgr = gray_img
            gray_lab = cv2.cvtColor(gray_img, cv2.COLOR_BGR2LAB)
            l_channel = gray_lab[:, :, 0]
        else:
            gray_bgr = cv2.cvtColor(gray_img, cv2.COLOR_GRAY2BGR)
            l_channel = gray_img

        input_tensor = self._preprocess(l_channel)
        input_tensor = input_tensor.to(self.device)

        with torch.no_grad():
            ab_pred = self.model(input_tensor)

        ab_np = self._postprocess(ab_pred, h, w)

        ab_np = self._apply_warmth(ab_np, warmth)
        ab_np = self._apply_saturation(ab_np, saturation)

        lab_result = np.zeros((h, w, 3), dtype=np.uint8)
        lab_result[:, :, 0] = l_channel
        lab_result[:, :, 1:] = ab_np

        result_bgr = cv2.cvtColor(lab_result, cv2.COLOR_LAB2BGR)
        return result_bgr

    def predict_region(self, gray_img, mask, warmth=0.0, saturation=1.0):
        full_color = self.predict(gray_img, warmth, saturation)

        if len(mask.shape) == 3:
            mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        else:
            mask_gray = mask

        _, mask_bin = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)
        mask_3ch = cv2.merge([mask_bin, mask_bin, mask_bin])

        if len(gray_img.shape) == 2:
            original_bgr = cv2.cvtColor(gray_img, cv2.COLOR_GRAY2BGR)
        else:
            original_bgr = gray_img.copy()

        result = np.where(mask_3ch == 255, full_color, original_bgr)
        return result.astype(np.uint8)

    def _preprocess(self, l_channel):
        h, w = l_channel.shape
        target_size = 256

        l_normalized = l_channel.astype(np.float32) / 255.0 * 2.0 - 1.0

        tensor = torch.from_numpy(l_normalized).float().unsqueeze(0).unsqueeze(0)
        tensor_resized = F.interpolate(tensor, size=(target_size, target_size), mode='bilinear', align_corners=False)

        return tensor_resized

    def _postprocess(self, ab_pred, orig_h, orig_w):
        ab_pred = ab_pred.squeeze(0).cpu().numpy()
        ab_pred = np.transpose(ab_pred, (1, 2, 0))

        ab_upsampled = cv2.resize(ab_pred, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)

        ab_normalized = ((ab_upsampled + 1.0) / 2.0) * 255.0

        ab_clamped = np.clip(ab_normalized, 0, 255).astype(np.uint8)
        return ab_clamped

    def _apply_warmth(self, ab, warmth):
        if warmth == 0.0:
            return ab
        result = ab.astype(np.float64)
        result[:, :, 0] += warmth * 20
        result[:, :, 1] += warmth * 15
        return np.clip(result, 0, 255).astype(np.uint8)

    def _apply_saturation(self, ab, saturation):
        if saturation == 1.0:
            return ab
        result = ab.astype(np.float64)
        result[:, :, 0] = 128.0 + (result[:, :, 0] - 128.0) * saturation
        result[:, :, 1] = 128.0 + (result[:, :, 1] - 128.0) * saturation
        return np.clip(result, 0, 255).astype(np.uint8)

    def save_weights(self, path):
        torch.save(self.model.state_dict(), path)
