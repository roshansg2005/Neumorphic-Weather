const apiKey = '786e3b487fbec2d580558d666d1a1b92'; // <--- PASTE YOUR API KEY HERE
const cityInput = document.getElementById('cityInput');
const cityDropdown = document.getElementById('cityDropdown');

// --- 1. Weather Data Fetching ---
async function getWeather(city = 'Sangamner') { 
    if (!city) return;
    try {
        const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        if (!currentRes.ok) throw new Error('City not found');
        const currentData = await currentRes.json();

        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`);
        const forecastData = await forecastRes.json();

        // Update all UI elements
        updateCurrentWeatherUI(currentData);
        updateHourlyGraphUI(forecastData, currentData.timezone);
        updateWeeklyForecastUI(forecastData, currentData.timezone);
        updateDetailedHourlyPage(forecastData, currentData.timezone); 
        
        // Pass the city name along with coordinates so the map pin can show the name!
        updateMap(currentData.coord.lat, currentData.coord.lon, currentData.name); 

        cityInput.value = '';
    } catch (error) { console.error("Error:", error); }
}

function getCityLocalTime(timestamp, timezoneOffsetSeconds) {
    const targetTime = new Date(timestamp * 1000);
    const localOffset = targetTime.getTimezoneOffset() * 60000;
    return new Date(targetTime.getTime() + localOffset + (timezoneOffsetSeconds * 1000));
}

// --- 2. UI Updaters ---
function updateCurrentWeatherUI(data) {
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    const cityTime = getCityLocalTime(data.dt, data.timezone);
    document.getElementById('currentDateTime').textContent = cityTime.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' local time';
    document.getElementById('temperature').textContent = Math.round(data.main.temp);
    document.getElementById('mainConditionIcon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
}

function updateHourlyGraphUI(data, timezoneOffset) {
    const svgElement = document.getElementById('hourlyGraph');
    const graphPath = document.getElementById('graphPath');
    const hourlyLabels = document.getElementById('hourlyLabels');
    svgElement.querySelectorAll('.hourly-point').forEach(el => el.remove());
    hourlyLabels.innerHTML = ''; 

    const points = []; const labelData = [];
    for (let i = 0; i < 6; i++) {
        const item = data.list[i];
        points.push(item.main.temp);
        labelData.push({ time: getCityLocalTime(item.dt, timezoneOffset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), temp: item.main.temp });
    }

    const containerWidth = svgElement.clientWidth || 600; 
    svgElement.setAttribute('viewBox', `0 0 ${containerWidth} 150`);
    const range = Math.max(...points) + 2 - (Math.min(...points) - 2);
    let pathD = "";

    points.forEach((temp, index) => {
        const x = (index / 5) * containerWidth;
        const y = 120 - (((temp - (Math.min(...points) - 2)) / range) * 120);
        pathD += (index === 0) ? `M${x},${y}` : ` L${x},${y}`;

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("class", "hourly-point"); dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 4); dot.setAttribute("fill", index === 0 ? "#f1c40f" : "#fff"); 
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "hourly-point text-sub"); text.setAttribute("x", x); text.setAttribute("y", y - 12); text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "14px"); text.setAttribute("fill", "#b0b8c6"); text.textContent = `${Math.round(temp)}°`;
        svgElement.append(text, dot);
    });
    graphPath.setAttribute('d', pathD);
    labelData.forEach(item => { const span = document.createElement('span'); span.textContent = item.time; hourlyLabels.appendChild(span); });
}

function updateWeeklyForecastUI(data, timezoneOffset) {
    const weeklyList = document.getElementById('weeklyList');
    weeklyList.innerHTML = ''; 
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Logic to perfectly extract 1 reading per day
    const dailyData = [];
    const seenDays = new Set();
    
    data.list.forEach(item => {
        const dateStr = getCityLocalTime(item.dt, timezoneOffset).toLocaleDateString('en-US');
        if (!seenDays.has(dateStr)) {
            seenDays.add(dateStr);
            dailyData.push(item);
        }
    });

    // Mock the 6th and 7th day since free API only gives 5 days
    while (dailyData.length < 7 && dailyData.length > 0) {
        const lastItem = JSON.parse(JSON.stringify(dailyData[dailyData.length - 1]));
        lastItem.dt += 86400; // Add 24 hours
        dailyData.push(lastItem);
    }

    dailyData.forEach((dayData) => {
        let dateStr = getCityLocalTime(dayData.dt, timezoneOffset).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const li = document.createElement('li'); 
        li.classList.add('list-item');
        
        // Added proper image styling class and @2x for crisp icons
        li.innerHTML = `
            <span class="day-time" style="width: 70px;">${dateStr}</span>
            <img class="weather-icon-small" src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png" style="width:40px; height:40px;">
            <span class="text-sub" style="flex-grow: 1; margin-left: 10px; text-transform: capitalize;">${dayData.weather[0].description}</span>
            <span class="temp-range">${Math.round(dayData.main.temp_max)}° / <span class="text-sub">${Math.round(dayData.main.temp_min - 2)}°</span></span>
        `;
        weeklyList.appendChild(li);
    });
}

function updateDetailedHourlyPage(data, timezoneOffset) {
    const hourlyList = document.getElementById('fullHourlyList');
    hourlyList.innerHTML = ''; 
    
    for(let i=0; i<8; i++) {
        const item = data.list[i];
        const timeStr = getCityLocalTime(item.dt, timezoneOffset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const li = document.createElement('li');
        li.classList.add('list-item');
        li.innerHTML = `
            <span class="time-block">${timeStr}</span>
            <span class="temp-block">${Math.round(item.main.temp)}°C</span>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
            <span class="text-sub" style="text-transform: capitalize; width: 120px;">${item.weather[0].description}</span>
            <span class="text-sub"><i class="fa-solid fa-droplet" style="color:#f1c40f;"></i> ${item.main.humidity}%</span>
            <span class="text-sub"><i class="fa-solid fa-wind" style="color:#f1c40f;"></i> ${Math.round(item.wind.speed * 3.6)} km/h</span>
        `;
        hourlyList.appendChild(li);
    }
}

// --- 3. Leaflet Map Logic ---
let weatherMap = null;
let currentTileLayer = null;
let mapMarker = null; // New variable to hold the pin

function updateMap(lat, lon, cityName) {
    if (!weatherMap) {
        weatherMap = L.map('weatherMap').setView([lat, lon], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(weatherMap);
        setWeatherLayer('precipitation_new');
    } else {
        weatherMap.flyTo([lat, lon], 6);
    }

    // Remove the old pin if it exists
    if (mapMarker) {
        weatherMap.removeLayer(mapMarker);
    }

    // Drop a new pin at the city's exact coordinates
    mapMarker = L.marker([lat, lon]).addTo(weatherMap)
        .bindPopup(`<b>${cityName}</b>`) // Adds a popup with the city name!
        .openPopup();
}

function setWeatherLayer(layerType) {
    if (currentTileLayer) weatherMap.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${apiKey}`, { maxZoom: 18, opacity: 0.8 }).addTo(weatherMap);
}

document.querySelectorAll('.map-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if(e.target.id === 'btn-precip') setWeatherLayer('precipitation_new');
        if(e.target.id === 'btn-clouds') setWeatherLayer('clouds_new');
        if(e.target.id === 'btn-temp') setWeatherLayer('temp_new');
    });
});

// --- 4. Search Autocomplete ---
cityInput.addEventListener('input', async function() {
    const query = this.value.trim();
    if (query.length < 2) { cityDropdown.classList.add('hidden'); return; }
    try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
        const cities = await res.json();
        cityDropdown.innerHTML = ''; 
        if (cities.length === 0) { cityDropdown.classList.add('hidden'); return; }
        cities.forEach(city => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`;
            li.onclick = () => { cityInput.value = city.name; cityDropdown.classList.add('hidden'); getWeather(city.name); };
            cityDropdown.appendChild(li);
        });
        cityDropdown.classList.remove('hidden');
    } catch (error) { console.error(error); }
});
document.addEventListener('click', (e) => { if (e.target !== cityInput) cityDropdown.classList.add('hidden'); });

// --- 5. SPA Tab Navigation ---
const navLinks = document.querySelectorAll('.nav-links a');
const pageViews = document.querySelectorAll('.page-view');

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault(); 
        navLinks.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        pageViews.forEach(view => view.classList.add('hidden'));

        const target = this.getAttribute('data-target');
        document.getElementById(`view-${target}`).classList.remove('hidden');

        // Fix Leaflet sizing bug when unhiding
        if(target === 'map' && weatherMap) {
            setTimeout(() => weatherMap.invalidateSize(), 100);
        }
    });
});

// Settings UI toggles
document.querySelectorAll('.unit-toggle span').forEach(span => {
    span.addEventListener('click', function() {
        this.parentElement.querySelectorAll('span').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
    })
});

// Initialize
getWeather('Sangamner');