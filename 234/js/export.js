class ExportManager {
    constructor(slideController) {
        this.slideController = slideController;
        this.jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
        this.isExporting = false;
    }

    async exportToPDF() {
        if (this.isExporting) return;
        
        if (!this.jsPDF || !window.html2canvas) {
            alert('PDF导出功能正在加载，请稍后重试...');
            return;
        }

        this.isExporting = true;
        const pdf = new this.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const slides = this.slideController.slides;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const originalIndex = this.slideController.currentIndex;

        try {
            for (let i = 0; i < slides.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                this.slideController.goTo(i);
                await new Promise(resolve => setTimeout(resolve, 300));

                const slideElement = this.slideController.getSlideElement(i);
                if (slideElement && window.html2canvas) {
                    try {
                        const canvas = await window.html2canvas(slideElement, {
                            backgroundColor: '#1a1a2e',
                            scale: 2,
                            useCORS: true,
                            allowTaint: true
                        });
                        
                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                        const imgProps = pdf.getImageProperties(imgData);
                        const ratio = Math.min(
                            (pageWidth - 10) / imgProps.width,
                            (pageHeight - 10) / imgProps.height
                        );
                        const imgWidth = imgProps.width * ratio;
                        const imgHeight = imgProps.height * ratio;
                        const x = (pageWidth - imgWidth) / 2;
                        const y = (pageHeight - imgHeight) / 2;
                        
                        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                    } catch (e) {
                        console.error('Error capturing slide:', e);
                        await this.addSlideContentFallback(pdf, slides[i], i, pageWidth, pageHeight);
                    }
                } else {
                    await this.addSlideContentFallback(pdf, slides[i], i, pageWidth, pageHeight);
                }

                pdf.setFontSize(10);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`第 ${i + 1} 页 / 共 ${slides.length} 页`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            this.slideController.goTo(originalIndex);
            pdf.save(`presentation-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('PDF导出失败，请重试');
        } finally {
            this.isExporting = false;
            this.slideController.goTo(originalIndex);
        }
    }

    async addSlideContentFallback(pdf, slide, index, pageWidth, pageHeight) {
        if (slide.type === 'image') {
            try {
                const imgData = await this.getImageData(slide.content);
                const imgProps = pdf.getImageProperties(imgData);
                const ratio = Math.min(
                    (pageWidth - 20) / imgProps.width,
                    (pageHeight - 20) / imgProps.height
                );
                const imgWidth = imgProps.width * ratio;
                const imgHeight = imgProps.height * ratio;
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;
                
                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
            } catch (e) {
                console.error('Error adding image to PDF:', e);
                pdf.text('图片加载失败', pageWidth / 2, pageHeight / 2, { align: 'center' });
            }
        } else {
            pdf.setFontSize(24);
            pdf.setTextColor(26, 26, 46);
            if (slide.title) {
                pdf.text(slide.title, pageWidth / 2, 80, { align: 'center' });
            }
            if (slide.subtitle) {
                pdf.setFontSize(16);
                pdf.setTextColor(100, 100, 100);
                pdf.text(slide.subtitle, pageWidth / 2, 110, { align: 'center' });
            }
        }
    }

    async getImageData(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    async exportSlidesAsImages() {
        const slides = this.slideController.slides;
        
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            if (slide.type === 'image') {
                const a = document.createElement('a');
                a.href = slide.content;
                a.download = `slide-${i + 1}.png`;
                a.click();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
}
