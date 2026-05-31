class SimpleGifEncoder {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.frames = [];
        this.delays = [];
    }

    addFrame(ctx, delay = 500) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        this.frames.push(imageData);
        this.delays.push(delay);
    }

    quantize(imageData) {
        const data = imageData.data;
        const pixels = [];
        const colorMap = {};
        const palette = [];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] >> 3;
            const g = data[i + 1] >> 3;
            const b = data[i + 2] >> 3;
            const color = (r << 10) | (g << 5) | b;
            
            if (colorMap[color] === undefined) {
                if (palette.length < 256) {
                    colorMap[color] = palette.length;
                    palette.push([r << 3, g << 3, b << 3]);
                } else {
                    let minDist = Infinity;
                    let minIdx = 0;
                    for (let j = 0; j < palette.length; j++) {
                        const d = Math.pow(palette[j][0] - (r << 3), 2) + 
                                  Math.pow(palette[j][1] - (g << 3), 2) + 
                                  Math.pow(palette[j][2] - (b << 3), 2);
                        if (d < minDist) {
                            minDist = d;
                            minIdx = j;
                        }
                    }
                    colorMap[color] = minIdx;
                }
            }
            pixels.push(colorMap[color]);
        }
        
        while (palette.length < 256) {
            palette.push([0, 0, 0]);
        }
        
        return { pixels, palette };
    }

    lzwEncode(pixels, minCodeSize) {
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;
        
        const dict = new Map();
        for (let i = 0; i < clearCode; i++) {
            dict.set(String.fromCharCode(i), i);
        }
        
        const output = [];
        let current = '';
        let bits = 0;
        let buffer = 0;
        
        const writeCode = (code) => {
            buffer |= code << bits;
            bits += codeSize;
            while (bits >= 8) {
                output.push(buffer & 0xFF);
                buffer >>= 8;
                bits -= 8;
            }
        };
        
        writeCode(clearCode);
        
        for (const pixel of pixels) {
            const ch = String.fromCharCode(pixel);
            const combined = current + ch;
            if (dict.has(combined)) {
                current = combined;
            } else {
                writeCode(dict.get(current));
                if (nextCode < 4096) {
                    dict.set(combined, nextCode++);
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                } else {
                    writeCode(clearCode);
                    dict.clear();
                    for (let i = 0; i < clearCode; i++) {
                        dict.set(String.fromCharCode(i), i);
                    }
                    codeSize = minCodeSize + 1;
                    nextCode = eoiCode + 1;
                }
                current = ch;
            }
        }
        
        writeCode(dict.get(current));
        writeCode(eoiCode);
        
        if (bits > 0) {
            output.push(buffer & 0xFF);
        }
        
        return output;
    }

    toBlob() {
        const stream = [];
        
        const writeByte = (b) => stream.push(b);
        const writeBytes = (bytes) => bytes.forEach(b => writeByte(b));
        const writeString = (str) => {
            for (let i = 0; i < str.length; i++) {
                writeByte(str.charCodeAt(i));
            }
        };
        const writeShort = (s) => {
            writeByte(s & 0xFF);
            writeByte((s >> 8) & 0xFF);
        };
        
        writeString('GIF89a');
        writeShort(this.width);
        writeShort(this.height);
        writeByte(0xF7);
        writeByte(0);
        writeByte(0);
        
        for (let i = 0; i < 768; i++) {
            writeByte(0);
        }
        
        writeByte(0x21);
        writeByte(0xFF);
        writeByte(11);
        writeString('NETSCAPE2.0');
        writeByte(3);
        writeByte(1);
        writeShort(0);
        writeByte(0);
        
        for (let f = 0; f < this.frames.length; f++) {
            const frame = this.frames[f];
            const delay = this.delays[f];
            
            const { pixels, palette } = this.quantize(frame);
            
            writeByte(0x21);
            writeByte(0xF9);
            writeByte(4);
            writeByte(0x04);
            writeShort(Math.max(2, Math.floor(delay / 10)));
            writeByte(0);
            writeByte(0);
            
            writeByte(0x2C);
            writeShort(0);
            writeShort(0);
            writeShort(this.width);
            writeShort(this.height);
            writeByte(0x87);
            
            for (let i = 0; i < 256; i++) {
                writeByte(palette[i][0]);
                writeByte(palette[i][1]);
                writeByte(palette[i][2]);
            }
            
            const encoded = this.lzwEncode(pixels, 8);
            
            writeByte(8);
            
            let offset = 0;
            while (offset < encoded.length) {
                const blockSize = Math.min(255, encoded.length - offset);
                writeByte(blockSize);
                for (let i = 0; i < blockSize; i++) {
                    writeByte(encoded[offset + i]);
                }
                offset += blockSize;
            }
            
            writeByte(0);
        }
        
        writeByte(0x3B);
        
        return new Blob([new Uint8Array(stream)], { type: 'image/gif' });
    }
}

class GIF {
    constructor(options) {
        this.options = options || {};
        this.width = options.width || 400;
        this.height = options.height || 300;
        this.encoder = new SimpleGifEncoder(this.width, this.height);
        this.onFinished = null;
    }

    addFrame(canvas, options) {
        const delay = (options && options.delay) || 500;
        const ctx = canvas.getContext ? canvas.getContext('2d') : canvas;
        if (ctx && ctx.canvas) {
            this.encoder.addFrame(ctx, delay);
        } else if (ctx && ctx.getImageData) {
            this.encoder.addFrame(ctx, delay);
        }
    }

    on(event, callback) {
        if (event === 'finished') {
            this.onFinished = callback;
        }
    }

    render() {
        setTimeout(() => {
            const blob = this.encoder.toBlob();
            if (this.onFinished) {
                this.onFinished(blob);
            }
        }, 100);
    }
}
