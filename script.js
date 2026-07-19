/**
 * IntraPulse Engine - Upstox API Integration
 * STRICT MODE: No mock data. All data is fetched live from Upstox API v2.
 */

// --- Global State & Configuration ---
const UPSTOX_BASE_URL = 'https://api.upstox.com/v2';

// TESTING ONLY: Hardcoded credentials. Remove or use environment variables in production.
const API_KEY = 'c1b0759d-0303-4abc-87cd-1bf7cb7042fa';
const API_SECRET = 'vycexnccr7';
let accessToken = 'eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJKUjIxMjQiLCJqdGkiOiI2YTVkMTZjNjA4YzFiODBkMjMyNzY2MzMiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaWF0IjoxNzg0NDg1NTc0LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3ODQ0OTg0MDB9._dlwsYewbVmcLDOibXkOOXE41qznjbuQJoka3IIjTqQ'; 

let activeInstrument = '';
let marketPollInterval = null;

// Major Index Instrument Keys for Upstox
const INDICES = {
    NIFTY: 'NSE_INDEX|Nifty 50',
    BANKNIFTY: 'NSE_INDEX|Nifty Bank',
    SENSEX: 'BSE_INDEX|SENSEX'
};

// --- DOM Elements ---
const dom = {
    tokenInput: document.getElementById('access-token'),
    btnConnect: document.getElementById('btn-connect'),
    statusDot: document.getElementById('connection-status'),
    
    // Tickers
    niftyPrice: document.querySelector('#idx-nifty .ticker-price'),
    niftyChange: document.querySelector('#idx-nifty .ticker-change'),
    bankNiftyPrice: document.querySelector('#idx-banknifty .ticker-price'),
    bankNiftyChange: document.querySelector('#idx-banknifty .ticker-change'),
    sensexPrice: document.querySelector('#idx-sensex .ticker-price'),
    sensexChange: document.querySelector('#idx-sensex .ticker-change'),

    // Search & Active Symbol
    searchInput: document.getElementById('stock-search-input'),
    activeSymbol: document.getElementById('active-symbol'),
    activePrice: document.getElementById('active-price'),
    activeChange: document.getElementById('active-change'),

    // Dashboard
    consensusFill: document.getElementById('consensus-fill'),
    consensusText: document.getElementById('consensus-text'),
    
    // Indicators
    indRsi: document.querySelector('#ind-rsi .ind-value'),
    indRsiSig: document.querySelector('#ind-rsi .ind-signal'),
    indMacd: document.querySelector('#ind-macd .ind-value'),
    indMacdSig: document.querySelector('#ind-macd .ind-signal'),
    indEma: document.querySelector('#ind-ema .ind-value'),
    indEmaSig: document.querySelector('#ind-ema .ind-signal'),
    indBb: document.querySelector('#ind-bb .ind-value'),
    indBbSig: document.querySelector('#ind-bb .ind-signal'),

    // Matrix
    calcEntry: document.getElementById('calc-entry'),
    calcTarget: document.getElementById('calc-target'),
    calcStoploss: document.getElementById('calc-stoploss'),

    // Screeners
    buyScreenerBody: document.getElementById('buy-screener-body'),
    sellScreenerBody: document.getElementById('sell-screener-body')
};

// --- Authentication & Initialization ---

// Auto-initialize on page load since token is hardcoded
window.addEventListener('DOMContentLoaded', () => {
    if (accessToken && accessToken !== 'PASTE_YOUR_ACCESS_TOKEN_HERE') {
        dom.tokenInput.value = "Using Hardcoded Token...";
        dom.tokenInput.disabled = true;
        dom.btnConnect.textContent = "Connecting...";
        initMarketStream();
    }
});

// Keep manual button functional just in case
dom.btnConnect.addEventListener('click', () => {
    if (!dom.tokenInput.disabled) {
        accessToken = dom.tokenInput.value.trim();
    }
    
    if (!accessToken || accessToken === 'PASTE_YOUR_ACCESS_TOKEN_HERE') {
        alert("Please enter a valid Upstox Access Token or hardcode it in script.js.");
        return;
    }
    
    dom.btnConnect.textContent = "Connecting...";
    initMarketStream();
});

// --- Main API Fetch Controllers ---

async function fetchQuotes(instrumentKeys) {
    const keysParam = Array.isArray(instrumentKeys) ? instrumentKeys.join(',') : instrumentKeys;
    try {
        const response = await fetch(`${UPSTOX_BASE_URL}/market-quote/quotes?instrument_key=${encodeURIComponent(keysParam)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        if (data.status === 'success') return data.data;
        throw new Error(data.errors?.[0]?.message || 'API Error');
    } catch (error) {
        console.error("Quote Fetch Error:", error);
        return null;
    }
}

async function fetchIntradayCandles(instrumentKey) {
    try {
        // Fetching 1-minute historical intraday data for indicator calculation
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
    // Initial fetch for top ticker
    const indexData = await fetchQuotes([INDICES.NIFTY, INDICES.BANKNIFTY, INDICES.SENSEX]);
    
    if (indexData) {
        dom.statusDot.classList.remove('disconnected');
        dom.statusDot.classList.add('connected');
        dom.btnConnect.textContent = "Connected Live";
        updateTickers(indexData);
        
        // Start polling (Upstox API rate limits apply, poll every 5 seconds)
        if (marketPollInterval) clearInterval(marketPollInterval);
        marketPollInterval = setInterval(async () => {
            const freshIndices = await fetchQuotes([INDICES.NIFTY, INDICES.BANKNIFTY, INDICES.SENSEX]);
            if (freshIndices) updateTickers(freshIndices);
            
            if (activeInstrument) {
                analyzeStock(activeInstrument);
            }
        }, 5000);
    } else {
        dom.btnConnect.textContent = "Connection Failed";
        alert("Failed to connect. Check Access Token or CORS policy.");
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

// Search listener (Expects Upstox Instrument Key format: NSE_EQ|INE123456789)
dom.searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        activeInstrument = this.value.trim();
        if(activeInstrument) analyzeStock(activeInstrument);
    }
});

async function analyzeStock(instrumentKey) {
    // 1. Fetch live quote
    const quoteData = await fetchQuotes(instrumentKey);
    if (!quoteData || !quoteData[instrumentKey]) return;
    
    const quote = quoteData[instrumentKey];
    dom.activeSymbol.textContent = quote.symbol || instrumentKey.split('|')[1];
    dom.activePrice.textContent = `₹${quote.last_price}`;
    dom.activeChange.textContent = `${quote.net_change}%`;

    // 2. Fetch candles for Math
    const candles = await fetchIntradayCandles(instrumentKey);
    if (!candles) return;

    // Upstox returns candles as: [timestamp, open, high, low, close, volume, open_interest]
    // We need closing prices (index 4) from oldest to newest for indicator math
    const closePrices = candles.map(c => c[4]).reverse(); 

    // 3. Calculate Indicators
    const rsi = calculateRSI(closePrices, 14);
    const ema9 = calculateEMA(closePrices, 9);
    const ema21 = calculateEMA(closePrices, 21);
    
    // 4. Update UI & Signals
    let buySignals = 0;
    let totalSignals = 3; // RSI, EMA Cross, Price Action

    // RSI Logic
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

    // EMA Logic (9 vs 21)
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

    // Consensus Meter
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

    // Dynamic Trade Levels Matrix (Based on basic percentages applied to live fetched price)
    const currentPrice = quote.last_price;
    dom.calcEntry.textContent = `₹${currentPrice}`;
    dom.calcTarget.textContent = `₹${(currentPrice * 1.015).toFixed(2)}`; // Target 1.5% live
    dom.calcStoploss.textContent = `₹${(currentPrice * 0.99).toFixed(2)}`; // Stoploss 1% live
}

// --- Mathematical Indicator Functions ---
// Pure JS calculations using the fetched live data points.

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
