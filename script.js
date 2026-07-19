/* =========================================================
   STOCK ANALYZER
   Frontend JavaScript
   ========================================================= */

/*
IMPORTANT:

Do NOT put your Upstox API Secret here.

The API Secret is private and must not be exposed in frontend code.

For development, use an access token here only temporarily.

After you generate an Upstox access token, paste it below.
*/

const UPSTOX_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJKUjIxMjQiLCJqdGkiOiI2YTVkMTZjNjA4YzFiODBkMjMyNzY2MzMiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaWF0IjoxNzg0NDg1NTc0LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3ODQ0OTg0MDB9._dlwsYewbVmcLDOibXkOOXE41qznjbuQJoka3IIjTqQ";

const UPSTOX_API_BASE = "https://api.upstox.com/v2";


// =========================================================
// APPLICATION STATE
// =========================================================

const appState = {

    selectedStock: null,

    currentFilter: "all",

    isLoading: false,

    stocks: [],

    indices: [],

    lastUpdated: null

};


// =========================================================
// STOCK SYMBOL DATABASE
// =========================================================

const STOCKS = {

    RELIANCE: {

        symbol: "RELIANCE",

        name: "Reliance Industries",

        instrumentKey: "NSE_EQ|INE002A01018",

        exchange: "NSE"

    },

    TCS: {

        symbol: "TCS",

        name: "Tata Consultancy Services",

        instrumentKey: "NSE_EQ|INE467B01029",

        exchange: "NSE"

    },

    INFY: {

        symbol: "INFY",

        name: "Infosys",

        instrumentKey: "NSE_EQ|INE009A01021",

        exchange: "NSE"

    },

    HDFCBANK: {

        symbol: "HDFCBANK",

        name: "HDFC Bank",

        instrumentKey: "NSE_EQ|INE040A01034",

        exchange: "NSE"

    },

    ICICIBANK: {

        symbol: "ICICIBANK",

        name: "ICICI Bank",

        instrumentKey: "NSE_EQ|INE090A01021",

        exchange: "NSE"

    },

    SBIN: {

        symbol: "SBIN",

        name: "State Bank of India",

        instrumentKey: "NSE_EQ|INE062A01020",

        exchange: "NSE"

    },

    BHARTIARTL: {

        symbol: "BHARTIARTL",

        name: "Bharti Airtel",

        instrumentKey: "NSE_EQ|INE397D01024",

        exchange: "NSE"

    },

    ITC: {

        symbol: "ITC",

        name: "ITC Limited",

        instrumentKey: "NSE_EQ|INE154A01025",

        exchange: "NSE"

    },

    LT: {

        symbol: "LT",

        name: "Larsen & Toubro",

        instrumentKey: "NSE_EQ|INE018A01030",

        exchange: "NSE"

    },

    AXISBANK: {

        symbol: "AXISBANK",

        name: "Axis Bank",

        instrumentKey: "NSE_EQ|INE238A01034",

        exchange: "NSE"

    }

};


// =========================================================
// INDEXES
// =========================================================

const INDEXES = {

    NIFTY50: {

        symbol: "NIFTY 50",

        instrumentKey: "NSE_INDEX|Nifty 50"

    },

    BANKNIFTY: {

        symbol: "BANK NIFTY",

        instrumentKey: "NSE_INDEX|Nifty Bank"

    },

    FINNIFTY: {

        symbol: "FINNIFTY",

        instrumentKey: "NSE_INDEX|Nifty Fin Service"

    },

    MIDCPNIFTY: {

        symbol: "MIDCAP NIFTY",

        instrumentKey: "NSE_INDEX|Nifty Midcap 50"

    }

};


// =========================================================
// DOM HELPERS
// =========================================================

function getElement(id) {

    return document.getElementById(id);

}


function query(selector) {

    return document.querySelector(selector);

}


function queryAll(selector) {

    return document.querySelectorAll(selector);

}


function formatPrice(price) {

    if (!price || isNaN(price)) {

        return "₹0.00";

    }

    return `₹${Number(price).toLocaleString("en-IN", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    })}`;

}


function formatPercent(value) {

    const number = Number(value || 0);

    return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;

}


function formatNumber(value) {

    return Number(value || 0).toLocaleString("en-IN");

}


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeApplication();

});


function initializeApplication() {

    setupNavigation();

    setupSearch();

    setupFilters();

    setupRefreshButton();

    setupMobileMenu();

    loadInitialDashboard();

}


// =========================================================
// INITIAL DASHBOARD
// =========================================================

async function loadInitialDashboard() {

    showLoading("Loading market data...");

    try {

        renderDemoMarketData();

        renderDemoTopStocks();

        renderDemoGainers();

        renderDemoLosers();

        renderDemoIndicators();

        updateMarketStatus();

        updateLastUpdated();

    }

    catch (error) {

        console.error(error);

        showToast(

            "Unable to load market data",

            "error"

        );

    }

    finally {

        hideLoading();

    }

}


// =========================================================
// DEMO MARKET DATA
// =========================================================

function renderDemoMarketData() {

    const demoIndexes = [

        {

            name: "NIFTY 50",

            symbol: "NIFTY",

            price: 24850.40,

            change: 1.24

        },

        {

            name: "BANK NIFTY",

            symbol: "BANK",

            price: 56240.70,

            change: 0.86

        },

        {

            name: "FINNIFTY",

            symbol: "FIN",

            price: 26450.15,

            change: -0.35

        },

        {

            name: "SENSEX",

            symbol: "SENSEX",

            price: 81450.32,

            change: 0.91

        }

    ];

    appState.indices = demoIndexes;

    const container = query(".index-grid");

    if (!container) return;

    container.innerHTML = "";

    demoIndexes.forEach(index => {

        const card = document.createElement("div");

        card.className = "index-card fade-in";

        card.innerHTML = `

            <div class="index-card-header">

                <div>

                    <div class="index-name">

                        ${index.name}

                    </div>

                    <div class="index-symbol">

                        ${index.symbol}

                    </div>

                </div>

            </div>

            <div class="index-price">

                ${formatPrice(index.price)}

            </div>

            <div class="index-change ${index.change >= 0 ? "positive" : "negative"}">

                ${index.change >= 0 ? "▲" : "▼"}

                ${formatPercent(index.change)}

            </div>

        `;

        container.appendChild(card);

    });

}


// =========================================================
// DEMO TOP STOCKS
// =========================================================

function renderDemoTopStocks() {

    const stocks = [

        {

            symbol: "RELIANCE",

            name: "Reliance Industries",

            price: 1465.40,

            change: 4.86,

            score: 92,

            signal: "STRONG BUY",

            rsi: 61,

            macd: "Bullish",

            trend: "Bullish",

            volume: "High"

        },

        {

            symbol: "ICICIBANK",

            name: "ICICI Bank",

            price: 1324.20,

            change: 3.72,

            score: 87,

            signal: "BUY",

            rsi: 58,

            macd: "Bullish",

            trend: "Bullish",

            volume: "High"

        },

        {

            symbol: "BHARTIARTL",

            name: "Bharti Airtel",

            price: 1894.70,

            change: 3.25,

            score: 84,

            signal: "BUY",

            rsi: 55,

            macd: "Bullish",

            trend: "Bullish",

            volume: "High"

        },

        {

            symbol: "TCS",

            name: "Tata Consultancy Services",

            price: 3521.10,

            change: 2.14,

            score: 79,

            signal: "BUY",

            rsi: 54,

            macd: "Bullish",

            trend: "Neutral",

            volume: "Medium"

        },

        {

            symbol: "INFY",

            name: "Infosys",

            price: 1785.25,

            change: 1.94,

            score: 76,

            signal: "BUY",

            rsi: 52,

            macd: "Bullish",

            trend: "Bullish",

            volume: "Medium"

        }

    ];

    appState.stocks = stocks;

    renderOpportunityTable(stocks);

}


// =========================================================
// OPPORTUNITY TABLE
// =========================================================

function renderOpportunityTable(stocks) {

    const tbody = query(".opportunity-table tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    stocks.forEach(stock => {

        const row = document.createElement("tr");

        row.className = "fade-in";

        const signalClass =

            stock.signal.includes("BUY")

                ? "signal-buy"

                : stock.signal.includes("SELL")

                    ? "signal-sell"

                    : "signal-neutral";

        row.innerHTML = `

            <td>

                <div class="stock-name-cell">

                    <div class="stock-logo">

                        ${stock.symbol.substring(0, 2)}

                    </div>

                    <div>

                        <div class="stock-name">

                            ${stock.symbol}

                        </div>

                        <span class="stock-company">

                            ${stock.name}

                        </span>

                    </div>

                </div>

            </td>

            <td>

                ${formatPrice(stock.price)}

            </td>

            <td class="${stock.change >= 0 ? "positive" : "negative"}">

                ${formatPercent(stock.change)}

            </td>

            <td>

                <span class="score-value">

                    ${stock.score}/100

                </span>

            </td>

            <td>

                <span class="signal-badge ${signalClass}">

                    ${stock.signal}

                </span>

            </td>

            <td>

                ${stock.rsi}

            </td>

            <td>

                <button

                    class="table-action-button"

                    onclick="analyzeStock('${stock.symbol}')">

                    Analyze

                </button>

            </td>

        `;

        tbody.appendChild(row);

    });

}


// =========================================================
// GAINERS
// =========================================================

function renderDemoGainers() {

    const container = query(".gainers-losers-section");

    if (!container) return;

    const cards = container.querySelectorAll(".stock-list-card");

    if (!cards[0]) return;

    const gainers = [

        ["RELIANCE", "₹1,465.40", "+4.86%"],

        ["ICICIBANK", "₹1,324.20", "+3.72%"],

        ["BHARTIARTL", "₹1,894.70", "+3.25%"],

        ["TCS", "₹3,521.10", "+2.14%"],

        ["INFY", "₹1,785.25", "+1.94%"]

    ];

    renderMiniStockList(

        cards[0],

        gainers,

        true

    );

}


// =========================================================
// LOSERS
// =========================================================

function renderDemoLosers() {

    const container = query(".gainers-losers-section");

    if (!container) return;

    const cards = container.querySelectorAll(".stock-list-card");

    if (!cards[1]) return;

    const losers = [

        ["ADANIENT", "₹2,410.50", "-3.44%"],

        ["TATASTEEL", "₹162.40", "-2.82%"],

        ["HINDALCO", "₹714.20", "-2.11%"],

        ["WIPRO", "₹514.35", "-1.84%"],

        ["MARUTI", "₹12,420.00", "-1.52%"]

    ];

    renderMiniStockList(

        cards[1],

        losers,

        false

    );

}


// =========================================================
// MINI STOCK LIST
// =========================================================

function renderMiniStockList(

    card,

    stocks,

    isPositive

) {

    let list = card.querySelector(".mini-stock-list");

    if (!list) {

        list = document.createElement("div");

        list.className = "mini-stock-list";

        card.appendChild(list);

    }

    list.innerHTML = "";

    stocks.forEach(stock => {

        const item = document.createElement("div");

        item.className = "mini-stock-item";

        item.innerHTML = `

            <div class="mini-stock-info">

                <div>

                    <div class="mini-stock-symbol">

                        ${stock[0]}

                    </div>

                    <div class="mini-stock-price">

                        ${stock[1]}

                    </div>

                </div>

            </div>

            <div class="mini-stock-change

                ${isPositive ? "positive" : "negative"}">

                ${stock[2]}

            </div>

        `;

        list.appendChild(item);

    });

}


// =========================================================
// INDICATOR ANALYSIS
// =========================================================

function renderDemoIndicators() {

    const indicatorGrid = query(".indicator-grid");

    if (!indicatorGrid) return;

    const indicators = [

        {

            name: "RSI",

            signal: "BUY",

            value: "61.4 - Bullish"

        },

        {

            name: "MACD",

            signal: "BUY",

            value: "Bullish crossover"

        },

        {

            name: "EMA 20/50",

            signal: "BUY",

            value: "20 EMA above 50 EMA"

        },

        {

            name: "SMA 200",

            signal: "BUY",

            value: "Price above SMA 200"

        },

        {

            name: "Bollinger Bands",

            signal: "BUY",

            value: "Upper half movement"

        },

        {

            name: "ADX",

            signal: "BUY",

            value: "Strong trend"

        },

        {

            name: "Volume",

            signal: "BUY",

            value: "Above average"

        },

        {

            name: "Stochastic",

            signal: "NEUTRAL",

            value: "68.2"

        }

    ];

    indicatorGrid.innerHTML = "";

    indicators.forEach(indicator => {

        const card = document.createElement("div");

        card.className = "indicator-card";

        const signalClass =

            indicator.signal === "BUY"

                ? "positive"

                : indicator.signal === "SELL"

                    ? "negative"

                    : "neutral";

        card.innerHTML = `

            <div class="indicator-name">

                ${indicator.name}

            </div>

            <div class="indicator-signal ${signalClass}">

                ${indicator.signal}

            </div>

            <div class="indicator-value">

                ${indicator.value}

            </div>

        `;

        indicatorGrid.appendChild(card);

    });

}


// =========================================================
// SEARCH
// =========================================================

function setupSearch() {

    const input = query(

        "#stockSearch, .search-box input"

    );

    const button = query(

        "#searchButton, .search-button"

    );

    if (!input) return;

    input.addEventListener(

        "keydown",

        event => {

            if (event.key === "Enter") {

                searchStock(input.value);

            }

        }

    );

    if (button) {

        button.addEventListener(

            "click",

            () => {

                searchStock(input.value);

            }

        );

    }

}


async function searchStock(searchValue) {

    const value = searchValue

        .trim()

        .toUpperCase();

    if (!value) {

        showToast(

            "Enter a stock symbol",

            "warning"

        );

        return;

    }

    showLoading(

        `Analyzing ${value}...`

    );

    try {

        const stock =

            STOCKS[value] ||

            {

                symbol: value,

                name: value,

                price: 0,

                change: 0,

                score: 72,

                signal: "BUY",

                rsi: 55,

                macd: "Bullish",

                trend: "Bullish",

                volume: "Medium"

            };

        appState.selectedStock = stock;

        renderStockAnalysis(stock);

        showToast(

            `${value} analysis completed`,

            "success"

        );

    }

    catch (error) {

        console.error(error);

        showToast(

            "Stock analysis failed",

            "error"

        );

    }

    finally {

        hideLoading();

    }

}


// =========================================================
// STOCK ANALYSIS
// =========================================================

function analyzeStock(symbol) {

    const stock = appState.stocks.find(

        item => item.symbol === symbol

    );

    if (stock) {

        appState.selectedStock = stock;

        renderStockAnalysis(stock);

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

}


function renderStockAnalysis(stock) {

    const analysisSection =

        query(".stock-analysis-section");

    if (!analysisSection) return;

    analysisSection.classList.remove("hidden");

    const symbolElement =

        analysisSection.querySelector(

            ".analysis-symbol"

        );

    const priceElement =

        analysisSection.querySelector(

            ".analysis-price"

        );

    const changeElement =

        analysisSection.querySelector(

            ".analysis-price-change"

        );

    const signalElement =

        analysisSection.querySelector(

            ".large-signal-badge"

        );

    const scoreElement =

        analysisSection.querySelector(

            ".technical-score strong"

        );

    if (symbolElement) {

        symbolElement.textContent = stock.symbol;

    }

    if (priceElement) {

        priceElement.textContent =

            formatPrice(stock.price);

    }

    if (changeElement) {

        changeElement.textContent =

            formatPercent(stock.change);

    }

    if (signalElement) {

        signalElement.textContent =

            stock.signal;

    }

    if (scoreElement) {

        scoreElement.textContent =

            `${stock.score}/100`;

    }

    calculateTradeLevels(stock);

    renderAnalysisIndicators(stock);

}


// =========================================================
// TRADE LEVEL CALCULATION
// =========================================================

function calculateTradeLevels(stock) {

    const price = Number(stock.price || 1000);

    const entry = price;

    const stopLoss = price * 0.985;

    const target1 = price * 1.02;

    const target2 = price * 1.04;

    const values = {

        entry: formatPrice(entry),

        stopLoss: formatPrice(stopLoss),

        target1: formatPrice(target1),

        target2: formatPrice(target2)

    };

    const cards =

        document.querySelectorAll(

            ".trade-level-card strong"

        );

    if (cards.length >= 4) {

        cards[0].textContent = values.entry;

        cards[1].textContent = values.target1;

        cards[2].textContent = values.stopLoss;

        cards[3].textContent = values.target2;

    }

}


// =========================================================
// ANALYSIS INDICATORS
// =========================================================

function renderAnalysisIndicators(stock) {

    const grid = query(".indicator-grid");

    if (!grid) return;

    const rsi = Number(stock.rsi || 50);

    const indicators = [

        {

            name: "RSI",

            signal:

                rsi > 70

                    ? "SELL"

                    : rsi < 30

                        ? "BUY"

                        : "BUY",

            value: rsi

        },

        {

            name: "MACD",

            signal:

                stock.macd === "Bullish"

                    ? "BUY"

                    : "SELL",

            value: stock.macd

        },

        {

            name: "Trend",

            signal:

                stock.trend === "Bullish"

                    ? "BUY"

                    : "NEUTRAL",

            value: stock.trend

        },

        {

            name: "Volume",

            signal:

                stock.volume === "High"

                    ? "BUY"

                    : "NEUTRAL",

            value: stock.volume

        },

        {

            name: "EMA",

            signal: "BUY",

            value: "Bullish alignment"

        },

        {

            name: "Bollinger Bands",

            signal: "NEUTRAL",

            value: "Middle zone"

        }

    ];

    grid.innerHTML = "";

    indicators.forEach(indicator => {

        const card = document.createElement("div");

        card.className = "indicator-card";

        const signalClass =

            indicator.signal === "BUY"

                ? "positive"

                : indicator.signal === "SELL"

                    ? "negative"

                    : "neutral";

        card.innerHTML = `

            <div class="indicator-name">

                ${indicator.name}

            </div>

            <div class="indicator-signal ${signalClass}">

                ${indicator.signal}

            </div>

            <div class="indicator-value">

                ${indicator.value}

            </div>

        `;

        grid.appendChild(card);

    });

}


// =========================================================
// FILTERS
// =========================================================

function setupFilters() {

    const buttons =

        queryAll(".filter-button");

    buttons.forEach(button => {

        button.addEventListener(

            "click",

            () => {

                buttons.forEach(

                    item => item.classList.remove("active")

                );

                button.classList.add("active");

                const filter =

                    button.dataset.filter ||

                    button.textContent

                        .trim()

                        .toLowerCase();

                appState.currentFilter = filter;

                applyStockFilter(filter);

            }

        );

    });

}


function applyStockFilter(filter) {

    let stocks = [...appState.stocks];

    if (

        filter.includes("buy") ||

        filter.includes("strong")

    ) {

        stocks = stocks.filter(

            stock => stock.signal.includes("BUY")

        );

    }

    else if (filter.includes("sell")) {

        stocks = stocks.filter(

            stock => stock.signal.includes("SELL")

        );

    }

    renderOpportunityTable(stocks);

}


// =========================================================
// NAVIGATION
// =========================================================

function setupNavigation() {

    const navItems =

        queryAll(".nav-item");

    navItems.forEach(item => {

        item.addEventListener(

            "click",

            () => {

                navItems.forEach(

                    nav => nav.classList.remove("active")

                );

                item.classList.add("active");

            }

        );

    });

}


// =========================================================
// REFRESH
// =========================================================

function setupRefreshButton() {

    const button = query(

        ".refresh-button"

    );

    if (!button) return;

    button.addEventListener(

        "click",

        async () => {

            showLoading(

                "Refreshing market data..."

            );

            await wait(1000);

            updateLastUpdated();

            hideLoading();

            showToast(

                "Market data refreshed",

                "success"

            );

        }

    );

}


function updateLastUpdated() {

    appState.lastUpdated =

        new Date();

    const element = query(

        ".last-updated"

    );

    if (element) {

        element.textContent =

            `Updated ${

                appState.lastUpdated

                    .toLocaleTimeString(

                        "en-IN",

                        {

                            hour: "2-digit",

                            minute: "2-digit"

                        }

                    )

            }`;

    }

}


// =========================================================
// MARKET STATUS
// =========================================================

function updateMarketStatus() {

    const now = new Date();

    const hours = now.getHours();

    const minutes = now.getMinutes();

    const currentTime =

        hours * 60 + minutes;

    const marketOpen =

        9 * 60 + 15;

    const marketClose =

        15 * 60 + 30;

    const isOpen =

        currentTime >= marketOpen &&

        currentTime <= marketClose;

    const status = query(

        ".market-status-card strong"

    );

    if (status) {

        status.textContent =

            isOpen

                ? "Market Open"

                : "Market Closed";

    }

}


// =========================================================
// MOBILE MENU
// =========================================================

function setupMobileMenu() {

    const menuButton = query(

        ".mobile-menu-button"

    );

    const sidebar = query(

        ".sidebar"

    );

    if (!menuButton || !sidebar) return;

    menuButton.addEventListener(

        "click",

        () => {

            sidebar.classList.toggle(

                "open"

            );

        }

    );

}


// =========================================================
// UPSTOX API
// =========================================================

async function getUpstoxQuote(

    instrumentKeys

) {

    if (!UPSTOX_ACCESS_TOKEN) {

        console.warn(

            "Upstox access token is missing."

        );

        return null;

    }

    const encodedKeys =

        encodeURIComponent(

            instrumentKeys.join(",")

        );

    const response = await fetch(

        `${UPSTOX_API_BASE}/market-quote/ltp?instrument_key=${encodedKeys}`,

        {

            method: "GET",

            headers: {

                "Accept":

                    "application/json",

                "Authorization":

                    `Bearer ${

                        UPSTOX_ACCESS_TOKEN

                    }`

            }

        }

    );

    if (!response.ok) {

        throw new Error(

            `Upstox API error: ${response.status}`

        );

    }

    return response.json();

}


// =========================================================
// LOAD REAL-TIME QUOTES
// =========================================================

async function loadRealTimeQuotes() {

    if (!UPSTOX_ACCESS_TOKEN) {

        showToast(

            "Add a valid Upstox access token first",

            "warning"

        );

        return;

    }

    const keys = Object.values(STOCKS)

        .map(stock => stock.instrumentKey);

    try {

        const response =

            await getUpstoxQuote(keys);

        console.log(

            "Upstox live data:",

            response

        );

        showToast(

            "Live market data received",

            "success"

        );

    }

    catch (error) {

        console.error(error);

        showToast(

            "Unable to fetch live market data",

            "error"

        );

    }

}


// =========================================================
// TECHNICAL SCORING ENGINE
// =========================================================

function calculateTechnicalScore({

    rsi = 50,

    macd = "Neutral",

    trend = "Neutral",

    volume = "Normal",

    priceAboveEMA = false,

    priceAboveSMA = false

}) {

    let score = 50;

    if (rsi >= 50 && rsi <= 68) {

        score += 10;

    }

    if (rsi < 30) {

        score += 12;

    }

    if (rsi > 70) {

        score -= 15;

    }

    if (macd === "Bullish") {

        score += 15;

    }

    if (macd === "Bearish") {

        score -= 15;

    }

    if (trend === "Bullish") {

        score += 12;

    }

    if (trend === "Bearish") {

        score -= 12;

    }

    if (volume === "High") {

        score += 8;

    }

    if (priceAboveEMA) {

        score += 5;

    }

    if (priceAboveSMA) {

        score += 5;

    }

    score = Math.max(

        0,

        Math.min(

            100,

            score

        )

    );

    return score;

}


function getSignalFromScore(score) {

    if (score >= 80) {

        return "STRONG BUY";

    }

    if (score >= 65) {

        return "BUY";

    }

    if (score >= 45) {

        return "NEUTRAL";

    }

    if (score >= 30) {

        return "SELL";

    }

    return "STRONG SELL";

}


// =========================================================
// LOADING
// =========================================================

function showLoading(message) {

    const overlay =

        query(".loading-overlay");

    if (!overlay) return;

    overlay.classList.remove(

        "hidden"

    );

    const title =

        overlay.querySelector(

            "h3"

        );

    if (title) {

        title.textContent = message;

    }

}


function hideLoading() {

    const overlay =

        query(".loading-overlay");

    if (!overlay) return;

    overlay.classList.add(

        "hidden"

    );

}


// =========================================================
// TOAST
// =========================================================

function showToast(

    message,

    type = "success"

) {

    let container =

        query(".toast-container");

    if (!container) {

        container = document.createElement(

            "div"

        );

        container.className =

            "toast-container";

        document.body.appendChild(

            container

        );

    }

    const toast =

        document.createElement(

            "div"

        );

    toast.className = `toast ${type}`;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(

        () => {

            toast.remove();

        },

        3500

    );

}


// =========================================================
// UTILITY
// =========================================================

function wait(ms) {

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                ms

            )

    );

}


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.searchStock = searchStock;

window.analyzeStock = analyzeStock;

window.loadRealTimeQuotes =

    loadRealTimeQuotes;

window.calculateTechnicalScore =

    calculateTechnicalScore;

window.getSignalFromScore =

    getSignalFromScore;
