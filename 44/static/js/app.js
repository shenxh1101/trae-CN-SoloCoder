class WeatherApp {
    constructor() {
        this.currentCity = '';
        this.currentWeatherData = null;
        this.useCelsius = true;
        this.favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
        this.searchHistory = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderFavorites();
        this.renderSearchHistory();
        this.autoDetectLocation();
    }

    bindEvents() {
        document.getElementById('searchBtn').addEventListener('click', () => this.searchWeather());
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });
        document.getElementById('celsiusBtn').addEventListener('click', () => this.setTemperatureUnit(true));
        document.getElementById('fahrenheitBtn').addEventListener('click', () => this.setTemperatureUnit(false));
        document.getElementById('favoriteBtn').addEventListener('click', () => this.toggleFavorite());
        document.getElementById('voiceBtn').addEventListener('click', () => this.startVoiceSearch());
        document.getElementById('shareBtn').addEventListener('click', () => this.openShareModal());
        document.getElementById('downloadBtn').addEventListener('click', () => this.openShareModal());
        document.getElementById('downloadImageBtn').addEventListener('click', () => this.downloadImage());
        document.getElementById('nativeShareBtn').addEventListener('click', () => this.nativeShare());
        document.querySelector('.close-modal').addEventListener('click', () => this.closeShareModal());
        document.getElementById('shareModal').addEventListener('click', (e) => {
            if (e.target.id === 'shareModal') this.closeShareModal();
        });
    }

    async autoDetectLocation() {
        try {
            const response = await fetch('/api/location/by-ip');
            const data = await response.json();
            if (data.city) {
                document.getElementById('cityInput').value = data.city;
                this.searchWeather();
            }
        } catch (error) {
            console.error('自动定位失败:', error);
        }
    }

    async searchWeather(city = null) {
        const searchCity = city || document.getElementById('cityInput').value.trim();
        if (!searchCity) {
            this.showError('请输入城市名称');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideWeatherCard();

        try {
            const [currentRes, forecastRes, aqiRes, alarmRes] = await Promise.all([
                fetch(`/api/weather/current?city=${encodeURIComponent(searchCity)}`),
                fetch(`/api/weather/forecast?city=${encodeURIComponent(searchCity)}`),
                fetch(`/api/weather/aqi?city=${encodeURIComponent(searchCity)}`),
                fetch(`/api/weather/alarm?city=${encodeURIComponent(searchCity)}`)
            ]);

            const currentData = await currentRes.json();
            const forecastData = await forecastRes.json();
            const aqiData = await aqiRes.json();
            const alarmData = await alarmRes.json();

            if (!currentRes.ok) {
                const errorMsg = currentData.error || '获取天气信息失败';
                if (errorMsg.includes('QWEATHER_KEY')) {
                    this.showConfigError();
                    return;
                }
                throw new Error(errorMsg);
            }

            this.currentCity = currentData.city;
            this.currentWeatherData = {
                current: currentData,
                forecast: forecastData.forecast || [],
                aqi: aqiData,
                alarms: alarmData.alarms || []
            };

            this.displayWeather();
            this.addToSearchHistory(this.currentCity);
            this.updateFavoriteButton();

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayWeather() {
        const data = this.currentWeatherData;
        const current = data.current;

        document.getElementById('cityName').textContent = current.city;
        document.getElementById('weatherDesc').textContent = current.text;

        const weatherIcon = document.getElementById('weatherIcon');
        weatherIcon.src = this.getWeatherIconUrl(current.icon);
        weatherIcon.alt = current.text;
        weatherIcon.crossOrigin = 'anonymous';

        this.updateTemperature(current.temp);

        document.getElementById('feelsLike').textContent = this.formatTemp(current.feelsLike);
        document.getElementById('humidity').textContent = current.humidity;
        document.getElementById('windDir').textContent = current.windDir;
        document.getElementById('windSpeed').textContent = current.windSpeed;
        document.getElementById('windScale').textContent = current.windScale;
        document.getElementById('visibility').textContent = current.vis;
        document.getElementById('pressure').textContent = current.pressure;

        this.displayAQI(data.aqi);
        this.displayForecast(data.forecast);
        this.displayAlarms(data.alarms);
        this.displayAdvice(current, data.aqi);
        this.displayMap(current.lon, current.lat);

        this.showWeatherCard();
    }

    getWeatherIconUrl(iconCode) {
        return `https://a.hecdn.net/img/common/icon/202209d/${iconCode}.png`;
    }

    displayAQI(aqi) {
        if (aqi.error) {
            document.getElementById('aqiValue').textContent = '--';
            document.getElementById('aqiCategory').textContent = '暂无数据';
            document.getElementById('pm25').textContent = '--';
            document.getElementById('pm10').textContent = '--';
            return;
        }

        document.getElementById('aqiValue').textContent = aqi.aqi;
        document.getElementById('aqiCategory').textContent = aqi.category;
        document.getElementById('pm25').textContent = aqi.pm2p5;
        document.getElementById('pm10').textContent = aqi.pm10;

        const aqiValue = parseInt(aqi.aqi);
        const aqiValueEl = document.getElementById('aqiValue');
        
        if (aqiValue <= 50) {
            aqiValueEl.style.color = '#00e400';
        } else if (aqiValue <= 100) {
            aqiValueEl.style.color = '#ffff00';
        } else if (aqiValue <= 150) {
            aqiValueEl.style.color = '#ff7e00';
        } else if (aqiValue <= 200) {
            aqiValueEl.style.color = '#ff0000';
        } else if (aqiValue <= 300) {
            aqiValueEl.style.color = '#8f3f97';
        } else {
            aqiValueEl.style.color = '#7e0023';
        }
    }

    displayForecast(forecast) {
        const container = document.getElementById('forecastList');
        container.innerHTML = '';

        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        forecast.forEach((day, index) => {
            const date = new Date(day.date);
            const dayName = index === 0 ? '今天' : index === 1 ? '明天' : weekDays[date.getDay()];
            const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;

            const item = document.createElement('div');
            item.className = 'forecast-item';
            item.innerHTML = `
                <div class="forecast-date">${dayName} ${monthDay}</div>
                <img src="${this.getWeatherIconUrl(day.iconDay)}" 
                     alt="${day.textDay}" class="forecast-icon" crossorigin="anonymous">
                <div class="forecast-text">${day.textDay}</div>
                <div class="forecast-temp">${this.formatTemp(day.tempMin)}° ~ ${this.formatTemp(day.tempMax)}°</div>
            `;
            container.appendChild(item);
        });
    }

    displayAlarms(alarms) {
        const banner = document.getElementById('alarmBanner');
        const alarmText = document.getElementById('alarmText');

        if (alarms && alarms.length > 0) {
            const alarmMessages = alarms.map(a => `${a.level}${a.type}预警`).join('，');
            alarmText.textContent = alarmMessages;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }

    displayAdvice(current, aqi) {
        const temp = parseFloat(current.temp);
        const weather = current.text;
        const humidity = parseFloat(current.humidity);
        const windScale = parseInt(current.windScale);

        let clothingAdvice = '';
        let travelAdvice = '';

        if (temp >= 30) {
            clothingAdvice = '天气炎热，建议穿着清凉透气的夏装，如短袖、短裤、连衣裙等。注意防晒，外出涂抹防晒霜。';
        } else if (temp >= 20) {
            clothingAdvice = '天气温暖舒适，建议穿着薄外套、长袖衬衫或T恤。早晚可适当添减衣物。';
        } else if (temp >= 10) {
            clothingAdvice = '天气较凉，建议穿着风衣、薄毛衣或厚外套。早晚温差较大，注意保暖。';
        } else if (temp >= 0) {
            clothingAdvice = '天气寒冷，建议穿着厚外套、毛衣、保暖内衣等。注意防寒保暖。';
        } else {
            clothingAdvice = '天气严寒，建议穿着羽绒服、厚棉衣、保暖裤等。外出注意防冻。';
        }

        const rainKeywords = ['雨', '雪', '雷', '冰雹'];
        const isRainy = rainKeywords.some(keyword => weather.includes(keyword));

        if (isRainy) {
            travelAdvice = '今日有降水，出行请携带雨具。注意交通安全，减速慢行。';
        } else if (windScale >= 6) {
            travelAdvice = '风力较大，出行注意防风。避免在广告牌、大树下停留。';
        } else if (aqi.aqi && parseInt(aqi.aqi) > 150) {
            travelAdvice = '空气质量较差，敏感人群应减少户外活动。外出建议佩戴口罩。';
        } else if (humidity < 30) {
            travelAdvice = '空气干燥，出行注意补充水分。可适当使用保湿用品。';
        } else if (weather.includes('晴') && temp >= 25) {
            travelAdvice = '天气晴好，适合户外活动。但紫外线较强，注意做好防晒措施。';
        } else {
            travelAdvice = '天气条件良好，适合出行和户外活动。祝您有个愉快的一天！';
        }

        document.getElementById('clothingAdvice').textContent = clothingAdvice;
        document.getElementById('travelAdvice').textContent = travelAdvice;
    }

    displayMap(lon, lat) {
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lon)-0.1}%2C${parseFloat(lat)-0.08}%2C${parseFloat(lon)+0.1}%2C${parseFloat(lat)+0.08}&layer=mapnik&marker=${lat}%2C${lon}`;
        document.getElementById('weatherMap').src = mapUrl;
    }

    formatTemp(temp) {
        if (this.useCelsius) {
            return temp;
        }
        return Math.round(parseFloat(temp) * 9 / 5 + 32);
    }

    updateTemperature(temp) {
        const displayTemp = this.formatTemp(temp);
        document.getElementById('temperature').textContent = displayTemp;
        document.querySelector('.temp-unit').textContent = this.useCelsius ? '°C' : '°F';
    }

    setTemperatureUnit(useCelsius) {
        this.useCelsius = useCelsius;
        document.getElementById('celsiusBtn').classList.toggle('active', useCelsius);
        document.getElementById('fahrenheitBtn').classList.toggle('active', !useCelsius);

        if (this.currentWeatherData) {
            this.updateTemperature(this.currentWeatherData.current.temp);
            document.getElementById('feelsLike').textContent = this.formatTemp(this.currentWeatherData.current.feelsLike);
            this.displayForecast(this.currentWeatherData.forecast);
        }
    }

    toggleFavorite() {
        if (!this.currentCity) return;

        const index = this.favorites.indexOf(this.currentCity);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(this.currentCity);
        }

        localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
        this.updateFavoriteButton();
        this.renderFavorites();
    }

    updateFavoriteButton() {
        const btn = document.getElementById('favoriteBtn');
        const isFavorite = this.favorites.includes(this.currentCity);
        btn.textContent = isFavorite ? '★' : '☆';
        btn.classList.toggle('active', isFavorite);
    }

    renderFavorites() {
        const container = document.getElementById('favoritesList');
        
        if (this.favorites.length === 0) {
            container.innerHTML = '<span class="empty-text">暂无关注城市</span>';
            return;
        }

        container.innerHTML = '';
        this.favorites.forEach(city => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <span class="city-name">${city}</span>
                <button class="remove-btn" data-city="${city}">×</button>
            `;
            
            item.querySelector('.city-name').addEventListener('click', () => {
                document.getElementById('cityInput').value = city;
                this.searchWeather();
            });
            
            item.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFavorite(city);
            });
            
            container.appendChild(item);
        });
    }

    removeFavorite(city) {
        const index = this.favorites.indexOf(city);
        if (index > -1) {
            this.favorites.splice(index, 1);
            localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
            this.renderFavorites();
            if (this.currentCity === city) {
                this.updateFavoriteButton();
            }
        }
    }

    addToSearchHistory(city) {
        const index = this.searchHistory.indexOf(city);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        this.searchHistory.unshift(city);
        if (this.searchHistory.length > 5) {
            this.searchHistory.pop();
        }
        localStorage.setItem('weatherHistory', JSON.stringify(this.searchHistory));
        this.renderSearchHistory();
    }

    renderSearchHistory() {
        const container = document.getElementById('searchHistory');
        const list = document.getElementById('historyList');

        if (this.searchHistory.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        list.innerHTML = '';

        this.searchHistory.forEach(city => {
            const item = document.createElement('span');
            item.className = 'history-item';
            item.textContent = city;
            item.addEventListener('click', () => {
                document.getElementById('cityInput').value = city;
                this.searchWeather();
            });
            list.appendChild(item);
        });
    }

    startVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('您的浏览器不支持语音搜索功能，请使用Chrome或Edge浏览器');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;

        const indicator = document.getElementById('listeningIndicator');
        indicator.classList.remove('hidden');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const cleanedCity = transcript.replace(/[市天气]/g, '').trim();
            document.getElementById('cityInput').value = cleanedCity;
            this.searchWeather();
        };

        recognition.onend = () => {
            indicator.classList.add('hidden');
        };

        recognition.onerror = (event) => {
            indicator.classList.add('hidden');
            if (event.error === 'not-allowed') {
                alert('请允许麦克风权限以使用语音搜索功能');
            } else if (event.error !== 'no-speech') {
                alert('语音识别失败，请重试');
            }
        };

        recognition.start();
    }

    async openShareModal() {
        const modal = document.getElementById('shareModal');
        const container = document.getElementById('shareImageContainer');
        const downloadBtn = document.getElementById('downloadImageBtn');
        
        modal.classList.remove('hidden');
        container.innerHTML = '<p>正在生成分享图片...</p>';
        downloadBtn.disabled = true;

        try {
            const mapSection = document.querySelector('.map-section');
            const actionButtons = document.querySelector('.action-buttons');
            if (mapSection) mapSection.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';

            const weatherCard = document.getElementById('weatherContent');
            const canvas = await html2canvas(weatherCard, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                imageTimeout: 5000
            });

            const imgData = canvas.toDataURL('image/png');
            this.shareImageData = imgData;
            
            container.innerHTML = `<img src="${imgData}" alt="分享图片">`;
            downloadBtn.disabled = false;

            if (mapSection) mapSection.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'flex';
        } catch (error) {
            container.innerHTML = '<p>图片生成失败，请重试</p>';
            console.error('图片生成失败:', error);
            
            const mapSection = document.querySelector('.map-section');
            const actionButtons = document.querySelector('.action-buttons');
            if (mapSection) mapSection.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'flex';
        }
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.add('hidden');
    }

    downloadImage() {
        if (!this.shareImageData) return;

        const link = document.createElement('a');
        const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        link.download = `${this.currentCity}_天气_${dateStr}.png`;
        link.href = this.shareImageData;
        link.click();
    }

    async nativeShare() {
        if (!navigator.share) {
            alert('您的浏览器不支持系统分享功能，请使用手机浏览器或Chrome浏览器');
            return;
        }

        try {
            await navigator.share({
                title: `${this.currentCity}天气`,
                text: `${this.currentCity}当前温度${this.currentWeatherData.current.temp}°C，${this.currentWeatherData.current.text}`,
                url: window.location.href
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('分享失败:', error);
            }
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('error').classList.remove('hidden');
    }

    showConfigError() {
        const errorEl = document.getElementById('error');
        errorEl.innerHTML = `
            <div style="text-align: left; padding: 15px;">
                <p style="font-weight: bold; color: #c62828; margin-bottom: 10px;">⚠️ 请先配置和风天气API密钥</p>
                <p style="margin-bottom: 10px;">按照以下步骤获取并配置API密钥：</p>
                <ol style="padding-left: 20px; line-height: 1.8;">
                    <li>访问 <a href="https://dev.qweather.com/" target="_blank" style="color: #1976d2;">和风天气开发者中心</a></li>
                    <li>注册账号并登录</li>
                    <li>创建应用获取API Key（免费版即可）</li>
                    <li>打开项目根目录下的 <code>.env</code> 文件</li>
                    <li>将 <code>your_qweather_api_key_here</code> 替换为您的API密钥</li>
                    <li>重启应用：<code>python3 app.py</code></li>
                </ol>
            </div>
        `;
        errorEl.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
        document.getElementById('errorText').textContent = '';
    }

    showWeatherCard() {
        document.getElementById('weatherCard').classList.remove('hidden');
    }

    hideWeatherCard() {
        document.getElementById('weatherCard').classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});
