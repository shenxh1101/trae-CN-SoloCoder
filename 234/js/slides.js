class SlideController {
    constructor() {
        this.slides = [];
        this.currentIndex = 0;
        this.isPaused = false;
        this.container = document.getElementById('slidesContainer');
        this.onPageChange = null;
        this.initDefaultSlides();
    }

    initDefaultSlides() {
        this.slides = [
            {
                type: 'text',
                title: 'AI手势控制演示',
                subtitle: '欢迎使用智能幻灯片系统',
                content: `<h1>AI手势控制演示系统</h1><p style="font-size: 1.5rem; color: var(--text-secondary);">使用手势轻松控制您的演示</p>`
            },
            {
                type: 'text',
                title: '手势控制说明',
                subtitle: '了解如何使用手势',
                content: `<h2>手势控制说明</h2><p style="text-align: left; max-width: 600px; margin: 0 auto;">
                    👉 <strong>向右滑动</strong> - 下一页<br><br>
                    👈 <strong>向左滑动</strong> - 上一页<br><br>
                    ✊ <strong>握拳</strong> - 暂停/继续演示<br><br>
                    ✌️ <strong>V字手势</strong> - 返回首页
                </p>`
            },
            {
                type: 'text',
                title: '功能特性',
                subtitle: '强大的演示功能',
                content: `<h2>功能特性</h2><p style="text-align: left; max-width: 600px; margin: 0 auto;">
                    🎯 <strong>精准手势识别</strong> - MediaPipe Hands技术<br><br>
                    📊 <strong>演示统计</strong> - 观看时长和翻页次数<br><br>
                    🔊 <strong>语音播报</strong> - 智能语音提示<br><br>
                    📄 <strong>PDF导出</strong> - 一键导出演示文档
                </p>`
            },
            {
                type: 'text',
                title: '自定义上传',
                subtitle: '上传您的幻灯片',
                content: `<h2>上传您的幻灯片</h2><p>
                    点击工具栏的上传按钮<br>
                    按顺序命名您的图片（如：1.jpg, 2.jpg...）<br>
                    支持拖拽上传多张图片
                </p>`
            },
            {
                type: 'text',
                title: '开始演示',
                subtitle: '享受智能演示体验',
                content: `<h1 style="font-size: 3.5rem;">开始您的演示</h1><p style="font-size: 1.3rem;">
                    准备好您的手势<br>
                    开始精彩的演示之旅！
                </p>`
            }
        ];
        this.render();
    }

    loadSlides(newSlides) {
        this.slides = newSlides;
        this.currentIndex = 0;
        this.render();
        this.updatePageIndicator();
    }

    render() {
        this.container.innerHTML = '';
        this.slides.forEach((slide, index) => {
            const slideEl = document.createElement('div');
            slideEl.className = 'slide';
            slideEl.dataset.index = index;
            
            if (slide.type === 'image') {
                slideEl.innerHTML = `<img src="${slide.content}" class="slide-image" alt="${slide.title || 'Slide ' + (index + 1)}">`;
            } else {
                slideEl.innerHTML = `<div class="slide-text">${slide.content}</div>`;
            }
            
            if (index === this.currentIndex) {
                slideEl.classList.add('active');
            }
            
            this.container.appendChild(slideEl);
        });
        this.updatePageIndicator();
    }

    next() {
        if (this.isPaused) return false;
        if (this.currentIndex < this.slides.length - 1) {
            this.goTo(this.currentIndex + 1);
            return true;
        }
        return false;
    }

    prev() {
        if (this.isPaused) return false;
        if (this.currentIndex > 0) {
            this.goTo(this.currentIndex - 1);
            return true;
        }
        return false;
    }

    goTo(index) {
        if (this.isPaused && index !== this.currentIndex) return;
        
        const slides = this.container.querySelectorAll('.slide');
        const oldIndex = this.currentIndex;
        
        slides[oldIndex].classList.remove('active');
        slides[oldIndex].classList.add('prev');
        
        setTimeout(() => {
            slides[oldIndex].classList.remove('prev');
        }, 600);
        
        this.currentIndex = index;
        slides[index].classList.add('active');
        
        this.updatePageIndicator();
        
        if (this.onPageChange) {
            this.onPageChange(this.currentIndex + 1);
        }
    }

    goToFirst() {
        if (!this.isPaused) {
            this.goTo(0);
        }
    }

    goToLast() {
        if (!this.isPaused) {
            this.goTo(this.slides.length - 1);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    getCurrentPage() {
        return this.currentIndex + 1;
    }

    getTotalPages() {
        return this.slides.length;
    }

    updatePageIndicator() {
        const currentEl = document.getElementById('currentPage');
        const totalEl = document.getElementById('totalPages');
        if (currentEl) currentEl.textContent = this.getCurrentPage();
        if (totalEl) totalEl.textContent = this.getTotalPages();
    }

    getSlideElement(index) {
        return this.container.querySelectorAll('.slide')[index];
    }

    async uploadSlides(files, onProgress) {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        const sortedFiles = imageFiles.sort((a, b) => {
            const numA = this.extractNumber(a.name);
            const numB = this.extractNumber(b.name);
            if (numA !== null && numB !== null) {
                return numA - numB;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        const previews = [];
        const slides = [];
        
        for (let i = 0; i < sortedFiles.length; i++) {
            const file = sortedFiles[i];
            
            if (onProgress) {
                onProgress((i + 1) / sortedFiles.length, `正在处理 ${file.name}...`);
            }
            
            const { dataUrl, previewUrl } = await this.processFile(file);
            
            previews.push({
                name: file.name,
                index: i + 1,
                previewUrl: previewUrl
            });
            
            slides.push({
                type: 'image',
                content: dataUrl,
                title: file.name.replace(/\.[^/.]+$/, '')
            });
        }
        
        return {
            slides: slides,
            previews: previews,
            count: slides.length
        };
    }

    extractNumber(filename) {
        const match = filename.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 160;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    resolve({
                        dataUrl: dataUrl,
                        previewUrl: canvas.toDataURL('image/jpeg', 0.7)
                    });
                };
                img.onerror = reject;
                img.src = dataUrl;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    generatePreviewHTML(previews) {
        return previews.map(p => `
            <div class="preview-item">
                <img src="${p.previewUrl}" alt="${p.name}">
                <span class="index">${p.index}</span>
            </div>
        `).join('');
    }
}
