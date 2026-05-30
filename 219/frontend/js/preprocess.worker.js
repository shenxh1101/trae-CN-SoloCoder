let worker = null;

function initWorker() {
    if (worker) return worker;
    const code = `
        self.onmessage = function(e) {
            const { type, payload, id } = e.data;

            if (type === 'resize') {
                const { imageData, width, height, maxWidth, maxHeight } = payload;
                const scale = Math.min(maxWidth / width, maxHeight / height, 1);
                const newW = Math.round(width * scale);
                const newH = Math.round(height * scale);

                const offscreen = new OffscreenCanvas(newW, newH);
                const ctx = offscreen.getContext('2d');

                const srcCanvas = new OffscreenCanvas(width, height);
                const srcCtx = srcCanvas.getContext('2d');
                srcCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), width, height), 0, 0);

                ctx.drawImage(srcCanvas, 0, 0, newW, newH);
                const result = ctx.getImageData(0, 0, newW, newH);

                self.postMessage({ id, type: 'resize_result', payload: { imageData: result.data.buffer, width: newW, height: newH } }, [result.data.buffer]);
            }

            if (type === 'to_grayscale') {
                const { imageData, width, height } = payload;
                const data = new Uint8ClampedArray(imageData);
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
                    data[i] = data[i+1] = data[i+2] = gray;
                }
                self.postMessage({ id, type: 'grayscale_result', payload: { imageData: data.buffer, width, height } }, [data.buffer]);
            }

            if (type === 'extract_mask') {
                const { brushData, width, height } = payload;
                const data = new Uint8ClampedArray(brushData);
                const mask = new Uint8ClampedArray(width * height * 4);
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 10) {
                        const pi = i;
                        mask[pi] = 255;
                        mask[pi + 1] = 255;
                        mask[pi + 2] = 255;
                        mask[pi + 3] = 255;
                    }
                }
                self.postMessage({ id, type: 'mask_result', payload: { maskData: mask.buffer, width, height } }, [mask.buffer]);
            }
        };
    `;

    const blob = new Blob([code], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    return worker;
}

function postToWorker(type, payload) {
    return new Promise((resolve, reject) => {
        const w = initWorker();
        const id = Date.now() + Math.random();

        const handler = (e) => {
            if (e.data.id === id) {
                w.removeEventListener('message', handler);
                resolve(e.data);
            }
        };

        w.addEventListener('message', handler);

        setTimeout(() => {
            w.removeEventListener('message', handler);
            reject(new Error('Worker timeout'));
        }, 30000);

        w.postMessage({ type, payload, id });
    });
}

const WorkerAPI = {
    async resizeImage(imageData, width, height, maxWidth, maxHeight) {
        const result = await postToWorker('resize', {
            imageData: imageData instanceof ImageData ? imageData.data.buffer : imageData,
            width, height, maxWidth, maxHeight
        });
        return {
            imageData: new ImageData(new Uint8ClampedArray(result.payload.imageData), result.payload.width, result.payload.height),
            width: result.payload.width,
            height: result.payload.height
        };
    },

    async toGrayscale(imageData, width, height) {
        const result = await postToWorker('to_grayscale', {
            imageData: imageData instanceof ImageData ? imageData.data.buffer : imageData,
            width, height
        });
        return new ImageData(new Uint8ClampedArray(result.payload.imageData), result.payload.width, result.payload.height);
    },

    async extractMask(brushData, width, height) {
        const result = await postToWorker('extract_mask', {
            brushData: brushData instanceof ImageData ? brushData.data.buffer : brushData,
            width, height
        });
        return new ImageData(new Uint8ClampedArray(result.payload.maskData), result.payload.width, result.payload.height);
    }
};
