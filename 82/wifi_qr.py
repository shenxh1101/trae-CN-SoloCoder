import os


class WiFiQRGenerator:
    def generate_string(self, ssid, password, encryption='WPA', hidden=False):
        ssid_escaped = self._escape_string(ssid)
        password_escaped = self._escape_string(password)

        if encryption.upper() == 'NOPASS':
            encryption_type = 'nopass'
            password_str = ''
        else:
            encryption_type = encryption.upper()
            password_str = f'P:{password_escaped};'

        hidden_str = 'H:true;' if hidden else ''

        return f'WIFI:T:{encryption_type};S:{ssid_escaped};{password_str}{hidden_str};'

    def _escape_string(self, s):
        special_chars = ['\\', ';', ',', '"', ':']
        result = ''
        for c in s:
            if c in special_chars:
                result += '\\' + c
            else:
                result += c
        return result

    def print_terminal(self, ssid, password, encryption='WPA', hidden=False):
        qr_text = self.generate_string(ssid, password, encryption, hidden)
        try:
            import qrcode
            qr = qrcode.QRCode()
            qr.add_data(qr_text)
            qr.print_ascii()
        except ImportError:
            print('需要安装 qrcode 库才能显示二维码')
            print(f'pip install qrcode[pil]')

    def save_image(self, ssid, password, encryption='WPA', hidden=False, output_path='wifi_qr.png'):
        qr_text = self.generate_string(ssid, password, encryption, hidden)
        try:
            import qrcode
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_text)
            qr.make(fit=True)
            img = qr.make_image(fill_color='black', back_color='white')
            img.save(output_path)
        except ImportError:
            raise ImportError('需要安装 qrcode 和 pillow 库才能生成图片\npip install qrcode[pil]')
