const Export = {
    exportImage(colorizedImg, format = 'png', keepTransparency = false) {
        const canvas = document.createElement('canvas');
        canvas.width = colorizedImg.naturalWidth || colorizedImg.width;
        canvas.height = colorizedImg.naturalHeight || colorizedImg.height;
        const ctx = canvas.getContext('2d');

        if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(colorizedImg, 0, 0);

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpeg' ? 0.92 : undefined;

        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `colorized_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    },

    exportFromCanvas(canvasEl, format = 'png') {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpeg' ? 0.92 : undefined;

        canvasEl.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `colorized_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    }
};
