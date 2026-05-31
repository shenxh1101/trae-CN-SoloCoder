class StatsTracker {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.totalDuration = 0;
        this.pageViews = {};
        this.currentPage = 1;
        this.lastPageChangeTime = null;
        this.swipeCount = {
            left: 0,
            right: 0
        };
        this.gestureDetected = {};
        this.isRunning = false;
    }

    start() {
        this.startTime = Date.now();
        this.lastPageChangeTime = Date.now();
        this.isRunning = true;
        this.pageViews[this.currentPage] = 0;
    }

    stop() {
        if (!this.isRunning) return;
        
        this.endTime = Date.now();
        this.isRunning = false;
        
        const currentDuration = (Date.now() - this.lastPageChangeTime) / 1000;
        this.pageViews[this.currentPage] = (this.pageViews[this.currentPage] || 0) + currentDuration;
        
        this.totalDuration = (this.endTime - this.startTime) / 1000;
    }

    onPageChange(pageNumber) {
        if (!this.isRunning) return;
        
        const now = Date.now();
        const duration = (now - this.lastPageChangeTime) / 1000;
        this.pageViews[this.currentPage] = (this.pageViews[this.currentPage] || 0) + duration;
        
        this.currentPage = pageNumber;
        this.lastPageChangeTime = now;
        
        if (!this.pageViews[this.currentPage]) {
            this.pageViews[this.currentPage] = 0;
        }
    }

    onSwipe(direction) {
        this.swipeCount[direction]++;
    }

    onGesture(gestureType) {
        this.gestureDetected[gestureType] = (this.gestureDetected[gestureType] || 0) + 1;
    }

    getTotalSwipes() {
        return this.swipeCount.left + this.swipeCount.right;
    }

    getTotalGestures() {
        return Object.values(this.gestureDetected).reduce((a, b) => a + b, 0);
    }

    getCurrentDuration() {
        if (!this.startTime) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getStats() {
        const totalDuration = this.totalDuration || this.getCurrentDuration();
        const startTime = this.startTime ? new Date(this.startTime).toLocaleString('zh-CN') : null;
        const endTime = this.endTime ? new Date(this.endTime).toLocaleString('zh-CN') : null;
        
        return {
            startTime: startTime,
            endTime: endTime,
            totalDuration: totalDuration,
            formattedDuration: this.formatDuration(totalDuration),
            totalPages: Object.keys(this.pageViews).length,
            pageViews: { ...this.pageViews },
            swipeCount: { ...this.swipeCount },
            totalSwipes: this.getTotalSwipes(),
            gestureDetected: { ...this.gestureDetected },
            totalGestures: this.getTotalGestures(),
            exportedAt: new Date().toLocaleString('zh-CN')
        };
    }

    reset() {
        this.startTime = null;
        this.endTime = null;
        this.totalDuration = 0;
        this.pageViews = {};
        this.currentPage = 1;
        this.lastPageChangeTime = null;
        this.swipeCount = { left: 0, right: 0 };
        this.gestureDetected = {};
        this.isRunning = false;
    }

    exportToJSON() {
        const stats = this.getStats();
        return JSON.stringify(stats, null, 2);
    }

    saveToFile() {
        const json = this.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation-stats-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
