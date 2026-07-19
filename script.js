/**
 * IntraPulse Engine - Upstox API Integration
 * Auto-Connect & Autocomplete Version
 */

const UPSTOX_BASE_URL = 'https://api.upstox.com/v2';

// ⚠️ PASTE YOUR ACCESS TOKEN HERE 
let accessToken = 'eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJKUjIxMjQiLCJqdGkiOiI2YTVkMjcxZDJiOWNhODI2YTkwZDgyNjciLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaWF0IjoxNzg0NDg5NzU3LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3ODQ0OTg0MDB9.lFeQgaRRGfAzuWfGdp5TgfZrryTzFj8G1tzJnqYZCQI'; 

let activeInstrument = '';
let marketPollInterval = null;

const INDICES = {
    NIFTY: 'NSE_INDEX|Nifty 50',
    BANKNIFTY: 'NSE_INDEX|Nifty Bank',
    SENSEX: 'BSE_INDEX|SENSEX'
};

// Valid NSE Stocks for Autocomplete 
const VALID_NSE_STOCKS = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", 
    "SBIN", "BHARTIARTL", "ITC", "HINDUNILVR", "LT",
    "BAJFINANCE", "AXISBANK", "HCLTECH", "MARUTI", "SUNPHARMA",
    "KOTAKBANK", "ONGC", "TATAMOTORS", "NTPC", "TATASTEEL",
    "POWERGRID", "ULTRACEMCO", "TECHM", "BAJAJFINSV", "TITAN",
    "M&M", "WIPRO", "ASIANPAINT", "ADANIENT", "COALINDIA",
    "ZENSARTECH", "BHEL", "HAL", "SUZLON", "IRFC", "ZOMATO"
];

const dom = {
    statusDot: document.getElementById('connection-status'),
    statusText: document.getElementById('status-text'),
    
    niftyPrice: document.querySelector('#idx-nifty .ticker-price'),
    niftyChange: document.querySelector('#idx-nifty .ticker-change'),
    bankNiftyPrice: document.querySelector('#idx-banknifty .ticker-price'),
    bankNiftyChange: document.querySelector('#idx-banknifty .ticker-change'),
    sensexPrice: document.querySelector('#idx-sensex .ticker-price'),
    sensexChange: document.querySelector('#idx-sensex .ticker-change'),

    searchInput: document.getElementById('stock-search-input'),
    searchDropdown: document.getElementById('search-results-dropdown'),
    activeSymbol: document.getElementById('active-symbol'),
    activePrice: document.getElementById('active-price'),
    activeChange: document.getElementById('active-change'),

    consensusFill: document.getElementById('consensus-fill'),
    consensusText: document.getElementById('consensus-text'),
    
    indRsi: document.querySelector('#ind-rsi .ind-value'),
    indRsiSig: document.querySelector('#ind-rsi .ind-signal'),
    indMacd: document.querySelector('#ind-macd .ind-value'),
    indMacdSig: document.querySelector('#ind-macd .ind-signal'),
    indEma: document.querySelector('#ind-ema .ind-value'),
    indEmaSig: document.querySelector('#ind-ema .ind-signal'),
    indBb: document.querySelector('#ind-bb .ind-value'),
    indBbSig: document.querySelector('#ind-bb .ind-signal'),

    calcEntry: document.getElementById('calc-entry'),
    calcTarget: document.getElementById('calc-target'),
    calcStoploss: document.getElementById('calc-stoploss'),
};

window.addEventListener('DOMContentLoaded', () => {
    if (accessToken && accessToken !== 'PASTE_YOUR_ACCESS_TOKEN_HERE') {
        dom.statusText.textContent = "Connecting to Upstox...";
        initMarketStream();
    } else {
        dom.statusText.textContent = "Missing Token";
        console.error("Please add your Upstox Access Token to script.js");
    }
});

// --- Search & Autocomplete Logic ---
dom.searchInput.addEventListener('input', function() {
    const query = this.value.trim().toUpperCase();
    dom.searchDropdown.innerHTML = ''; 
    
    if (query.length === 0) {
        dom.searchDropdown.classList.add('hidden');
        return;
    }

    const matches = VALID_NSE_STOCKS.filter(stock => stock.includes(query));

    if (matches.length > 0) {
        dom.searchDropdown.classList.remove('hidden');
        matches.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            const highlightRegex = new RegExp(`(${query})`, 'gi');
            item.innerHTML = stock.replace(highlightRegex, "<span style='color: var(--color-buy);'>$1</span>");
            
            item.addEventListener('click', () => {
                dom.searchInput.value = stock;
                dom.searchDropdown.classList.add('hidden');
                
                activeInstrument = `NSE_EQ|${stock}`;
                analyzeStock(activeInstrument);
            });
            
            dom.searchDropdown.appendChild(item);
        });
    } else {
        dom.searchDropdown.classList.remove('hidden');
        const noResult = document.createElement('div');
        noResult.className = 'dropdown-item';
        noResult.style.color = "var(--color-text-muted)";
        noResult.textContent = "No valid stock found";
        dom.searchDropdown.appendChild(noResult);
    }
});

dom.searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') e.preventDefault(); 
});

document.addEventListener('click', function(e) {
    if (!dom.searchInput.contains(e.target) && !dom.searchDropdown.contains(e.target)) {
        dom.searchDropdown.classList.add('hidden');
    }
});

// --- Main API Fetch Controllers ---
async function fetchQuotes(instrumentKeys) {
    const keysParam = Array.isArray(instrumentKeys) 
        ? instrumentKeys.map(key => encodeURIComponent(key)).join(',') 
        : encodeURIComponent(instrumentKeys);
        
    try {
        const response = await fetch(`${UPSTOX_BASE_URL}/market-quote/quotes?instrument_key=${keysParam}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data;
        }
        throw new Error(data.errors?.[0]?.message || 'API Error');
    } catch (error) {
        console.error("Quote Fetch Error:", error);
        dom.statusText.textContent = "API Error (Check Console / Token Expired)";
        dom.statusText.style.color = "var(--color-sell)";
        return null;
    }
}

async function fetchIntradayCandles(instrumentKey) {
    try {
        const response = await fetch(`${UPSTOX_BASE_URL}/historical-candle/intraday/${encodeURIComponent(instrumentKey)}/1minute`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        if (data.status === 'success') return data.data.candles;
        throw new Error("Failed to fetch candles");
    } catch (error) {
        console.error("Candle Fetch Error:", error);
        return null;
    }
}

// --- Application Logic ---
async function initMarketStream() {
    const indexData = await fetchQuotes([INDICES.NIFTY, INDICES.BANKNIFTY, INDICES.SENSEX]);
    
    if (indexData) {
        dom.statusDot.classList.remove('disconnected');
        dom.statusDot.classList.add('connected');
        dom.statusText.textContent = "Live Stream Active";
        updateTickers(indexData);
        
        if (marketPollInterval) clearInterval(marketPollInterval);
        marketPollInterval = setInterval(async () => {
            const freshIndices = await fetchQuotes([INDICES.NIFTY, INDICES.BANKNIFTY, INDICES.SENSEX]);
            if (freshIndices) updateTickers(freshIndices);
            
            if (activeInstrument) {
                analyzeStock(activeInstrument);
            }
        }, 5000);
    }
}

function updateTickers(data) {
    if (data[INDICES.NIFTY]) {
        dom.niftyPrice.textContent = data[INDICES.NIFTY].last_price;
        dom.niftyChange.textContent = `(${data[INDICES.NIFTY].net_change}%)`;
    }
    if (data[INDICES.BANKNIFTY]) {
        dom.bankNiftyPrice.textContent = data[INDICES.BANKNIFTY].last_price;
        dom.bankNiftyChange.textContent = `(${data[INDICES.BANKNIFTY].net_change}%)`;
    }
    if (data[INDICES.SENSEX]) {
        dom.sensexPrice.textContent = data[INDICES.SENSEX].last_price;
        dom.sensexChange.textContent = `(${data[INDICES.SENSEX].net_change}%)`;
    }
}

async function analyzeStock(instrumentKey) {
    const quoteData = await fetchQuotes(instrumentKey);
    if (!quoteData || !quoteData[instrumentKey]) return;
    
    const quote = quoteData[instrumentKey];
    dom.activeSymbol.textContent = quote.symbol || instrumentKey.split('|')[1];
    dom.activePrice.textContent = `₹${quote.last_price}`;
    dom.activeChange.textContent = `${quote.net_change}%`;

    const candles = await fetchIntradayCandles(instrumentKey);
    if (!candles) return;

    const closePrices = candles.map(c => c[4]).reverse(); 

    const rsi = calculateRSI(closePrices, 14);
    const ema9 = calculateEMA(closePrices, 9);
    const ema21 = calculateEMA(closePrices, 21);
    
    let buySignals = 0;
    let totalSignals = 3;

    dom.indRsi.textContent = rsi.toFixed(2);
    if (rsi < 30) {
        dom.indRsiSig.textContent = "OVERSOLD / BUY";
        dom.indRsiSig.style.color = "var(--color-buy)";
        buySignals++;
    } else if (rsi > 70) {
        dom.indRsiSig.textContent = "OVERBOUGHT / SELL";
        dom.indRsiSig.style.color = "var(--color-sell)";
    } else {
        dom.indRsiSig.textContent = "NEUTRAL";
        dom.indRsiSig.style.color = "var(--color-hold)";
    }

    const emaVal = ema9[ema9.length - 1];
    dom.indEma.textContent = emaVal.toFixed(2);
    if (ema9[ema9.length - 1] > ema21[ema21.length - 1]) {
        dom.indEmaSig.textContent = "BULLISH CROSS";
        dom.indEmaSig.style.color = "var(--color-buy)";
        buySignals++;
    } else {
        dom.indEmaSig.textContent = "BEARISH CROSS";
        dom.indEmaSig.style.color = "var(--color-sell)";
    }

    const consensusPct = (buySignals / totalSignals) * 100;
    dom.consensusFill.style.width = `${consensusPct}%`;
    
    if (consensusPct >= 66) {
        dom.consensusText.textContent = "STRONG BUY";
        dom.consensusText.style.color = "var(--color-buy)";
    } else if (consensusPct > 33) {
        dom.consensusText.textContent = "HOLD / NEUTRAL";
        dom.consensusText.style.color = "var(--color-hold)";
    } else {
        dom.consensusText.textContent = "WEAK / SELL";
        dom.consensusText.style.color = "var(--color-sell)";
    }

    const currentPrice = quote.last_price;
    dom.calcEntry.textContent = `₹${currentPrice}`;
    dom.calcTarget.textContent = `₹${(currentPrice * 1.015).toFixed(2)}`;
    dom.calcStoploss.textContent = `₹${(currentPrice * 0.99).toFixed(2)}`;
}

function calculateRSI(prices, period) {
    if (prices.length < period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - diff) / period;
        }
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateEMA(prices, period) {
    if (!prices || prices.length === 0) return [0];
    const k = 2 / (period + 1);
    let emaArray = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}
