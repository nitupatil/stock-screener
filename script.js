/* =========================================================
   REAL-TIME INDIAN STOCK TECHNICAL ANALYZER
   Data Provider: Upstox API

   Required:
   - Upstox Access Token

   This version does NOT create fake stock data.
   A stock must be found and selected before analysis.
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

// Paste your valid Upstox access token here
const UPSTOX_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJKUjIxMjQiLCJqdGkiOiI2YTVkMTZjNjA4YzFiODBkMjMyNzY2MzMiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaWF0IjoxNzg0NDg1NTc0LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3ODQ0OTg0MDB9._dlwsYewbVmcLDOibXkOOXE41qznjbuQJoka3IIjTqQ";

const UPSTOX_API_BASE = "https://api.upstox.com/v2";


/* =========================================================
   APPLICATION STATE
========================================================= */

const appState = {

    selectedInstrument: null,

    selectedQuote: null,

    candles: [],

    indicators: null,

    analysis: null,

    searchTimeout: null,

    isLoading: false,

    lastUpdated: null

};


/* =========================================================
   DOM HELPERS
========================================================= */

function query(selector) {

    return document.querySelector(selector);

}


function queryAll(selector) {

    return document.querySelectorAll(selector);

}


function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeApp();

    }

);


function initializeApp() {

    setupSearch();

    setupRefreshButton();

    setupNavigation();

    setupMobileMenu();

    hideAnalysis();

    updateMarketStatus();

    setInterval(

        updateMarketStatus,

        30000

    );

}


/* =========================================================
   API REQUEST
========================================================= */

async function upstoxRequest(

    endpoint

) {

    if (

        !UPSTOX_ACCESS_TOKEN ||

        UPSTOX_ACCESS_TOKEN ===

        "YOUR_UPSTOX_ACCESS_TOKEN"

    ) {

        throw new Error(

            "Upstox access token is missing."

        );

    }


    const response = await fetch(

        `${UPSTOX_API_BASE}${endpoint}`,

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


    let data = null;


    try {

        data = await response.json();

    }

    catch {

        data = null;

    }


    if (!response.ok) {

        throw new Error(

            data?.errors?.[0]?.message ||

            `API Error: ${response.status}`

        );

    }


    return data;

}


/* =========================================================
   SEARCH SETUP
========================================================= */

function setupSearch() {

    const searchInput =

        query(

            "#stockSearch, .search-box input"

        );


    if (!searchInput) {

        console.warn(

            "Search input not found."

        );

        return;

    }


    searchInput.addEventListener(

        "input",

        () => {

            const searchText =

                searchInput.value.trim();


            clearTimeout(

                appState.searchTimeout

            );


            if (

                searchText.length < 2

            ) {

                hideSuggestions();

                return;

            }


            appState.searchTimeout =

                setTimeout(

                    () => {

                        searchStocks(

                            searchText

                        );

                    },

                    400

                );

        }

    );


    searchInput.addEventListener(

        "keydown",

        event => {

            if (

                event.key === "Enter"

            ) {

                const firstSuggestion =

                    query(

                        ".stock-suggestion"

                    );


                if (

                    firstSuggestion

                ) {

                    firstSuggestion.click();

                }

            }

        }

    );

}


/* =========================================================
   SEARCH REAL STOCKS
========================================================= */

async function searchStocks(

    searchText

) {

    try {

        showSearchLoading();


        const encodedSearch =

            encodeURIComponent(

                searchText

            );


        const response =

            await upstoxRequest(

                `/search/instrument?query=${

                    encodedSearch

                }`

            );


        const instruments =

            extractSearchResults(

                response

            );


        renderSuggestions(

            instruments

        );

    }

    catch (error) {

        console.error(

            "Search error:",

            error

        );


        renderNoSuggestions(

            error.message

        );

    }

}


/* =========================================================
   EXTRACT SEARCH RESULTS
========================================================= */

function extractSearchResults(

    response

) {

    if (

        !response ||

        !response.data

    ) {

        return [];

    }


    const data =

        Array.isArray(

            response.data

        )

            ? response.data

            : [];


    return data

        .filter(

            item => {

                return (

                    item.instrument_key &&

                    (

                        item.exchange ===

                        "NSE" ||

                        item.exchange ===

                        "BSE"

                    )

                );

            }

        )

        .slice(

            0,

            10

        );

}


/* =========================================================
   RENDER SEARCH SUGGESTIONS
========================================================= */

function renderSuggestions(

    instruments

) {

    let container =

        query(

            ".stock-suggestions"

        );


    if (!container) {

        const searchBox =

            query(

                ".search-box"

            );


        if (!searchBox) return;


        container =

            document.createElement(

                "div"

            );


        container.className =

            "stock-suggestions";


        searchBox.appendChild(

            container

        );

    }


    container.innerHTML = "";


    if (

        !instruments.length

    ) {

        container.innerHTML = `

            <div class="no-suggestion">

                No matching stock found

            </div>

        `;


        container.classList.add(

            "visible"

        );


        return;

    }


    instruments.forEach(

        instrument => {

            const item =

                document.createElement(

                    "div"

                );


            item.className =

                "stock-suggestion";


            item.innerHTML = `

                <div>

                    <strong>

                        ${

                            escapeHTML(

                                instrument.trading_symbol ||

                                instrument.short_name ||

                                "Unknown"

                            )

                        }

                    </strong>


                    <span>

                        ${

                            escapeHTML(

                                instrument.name ||

                                "Unknown Company"

                            )

                        }

                    </span>

                </div>


                <small>

                    ${

                        escapeHTML(

                            instrument.exchange ||

                            ""

                        )

                    }

                </small>

            `;


            item.addEventListener(

                "click",

                () => {

                    selectStock(

                        instrument

                    );

                }

            );


            container.appendChild(

                item

            );

        }

    );


    container.classList.add(

        "visible"

    );

}


/* =========================================================
   SELECT REAL STOCK
========================================================= */

async function selectStock(

    instrument

) {

    appState.selectedInstrument =

        instrument;


    hideSuggestions();


    const searchInput =

        query(

            "#stockSearch, .search-box input"

        );


    if (

        searchInput

    ) {

        searchInput.value =

            instrument.trading_symbol ||

            instrument.short_name ||

            "";

    }


    await analyzeSelectedStock();

}


/* =========================================================
   ANALYZE SELECTED STOCK
========================================================= */

async function analyzeSelectedStock() {

    const instrument =

        appState.selectedInstrument;


    if (

        !instrument ||

        !instrument.instrument_key

    ) {

        showToast(

            "Please select a valid stock from search suggestions.",

            "warning"

        );


        return;

    }


    try {

        showLoading(

            `Analyzing ${

                instrument.trading_symbol ||

                instrument.name

            }...`

        );


        clearAnalysis();


        const quote =

            await getLiveQuote(

                instrument.instrument_key

            );


        if (

            !quote

        ) {

            throw new Error(

                "Live quote unavailable."

            );

        }


        const candles =

            await getHistoricalCandles(

                instrument.instrument_key

            );


        if (

            !candles ||

            candles.length < 50

        ) {

            throw new Error(

                "Not enough historical data to calculate indicators."

            );

        }


        const indicators =

            calculateAllIndicators(

                candles

            );


        const analysis =

            calculateTechnicalAnalysis(

                quote,

                indicators

            );


        appState.selectedQuote =

            quote;


        appState.candles =

            candles;


        appState.indicators =

            indicators;


        appState.analysis =

            analysis;


        renderRealAnalysis(

            instrument,

            quote,

            indicators,

            analysis

        );


        updateLastUpdated();


        showToast(

            "Real stock analysis completed.",

            "success"

        );

    }

    catch (error) {

        console.error(

            "Analysis error:",

            error

        );


        hideAnalysis();


        showToast(

            error.message ||

            "Unable to analyze this stock.",

            "error"

        );

    }

    finally {

        hideLoading();

    }

}


/* =========================================================
   LIVE QUOTE
========================================================= */

async function getLiveQuote(

    instrumentKey

) {

    const encodedKey =

        encodeURIComponent(

            instrumentKey

        );


    const response =

        await upstoxRequest(

            `/market-quote/ltp?instrument_key=${

                encodedKey

            }`

        );


    if (

        !response ||

        !response.data

    ) {

        throw new Error(

            "No live price data received."

        );

    }


    const quoteData =

        Object.values(

            response.data

        )[0];


    if (

        !quoteData ||

        !quoteData.last_price

    ) {

        throw new Error(

            "Invalid live price received."

        );

    }


    return {

        price:

            Number(

                quoteData.last_price

            ),

        change:

            Number(

                quoteData.net_change ||

                0

            ),

        percentChange:

            Number(

                quoteData.percent_change ||

                0

            )

    };

}


/* =========================================================
   HISTORICAL CANDLES
========================================================= */

async function getHistoricalCandles(

    instrumentKey

) {

    const today =

        new Date();


    const toDate =

        formatDate(

            today

        );


    const fromDate =

        new Date(

            today

        );


    fromDate.setDate(

        fromDate.getDate() - 365

    );


    const fromDateString =

        formatDate(

            fromDate

        );


    const encodedKey =

        encodeURIComponent(

            instrumentKey

        );


    const response =

        await upstoxRequest(

            `/historical-candle/${

                encodedKey

            }/day/1/${

                toDate

            }/${

                fromDateString

            }`

        );


    const candles =

        response?.data?.candles;


    if (

        !Array.isArray(

            candles

        )

    ) {

        throw new Error(

            "Historical candle data unavailable."

        );

    }


    return candles

        .map(

            candle => ({

                timestamp:

                    candle[0],

                open:

                    Number(

                        candle[1]

                    ),

                high:

                    Number(

                        candle[2]

                    ),

                low:

                    Number(

                        candle[3]

                    ),

                close:

                    Number(

                        candle[4]

                    ),

                volume:

                    Number(

                        candle[5]

                    )

            })

        )

        .reverse();

}


/* =========================================================
   INDICATOR CALCULATIONS
========================================================= */

function calculateAllIndicators(

    candles

) {

    const closes =

        candles.map(

            candle => candle.close

        );


    const highs =

        candles.map(

            candle => candle.high

        );


    const lows =

        candles.map(

            candle => candle.low

        );


    const volumes =

        candles.map(

            candle => candle.volume

        );


    const ema20 =

        calculateEMA(

            closes,

            20

        );


    const ema50 =

        calculateEMA(

            closes,

            50

        );


    const sma200 =

        calculateSMA(

            closes,

            200

        );


    const rsi =

        calculateRSI(

            closes,

            14

        );


    const macd =

        calculateMACD(

            closes

        );


    const bollinger =

        calculateBollingerBands(

            closes,

            20,

            2

        );


    const atr =

        calculateATR(

            candles,

            14

        );


    const adx =

        calculateADX(

            candles,

            14

        );


    const averageVolume =

        calculateSMA(

            volumes,

            20

        );


    const currentVolume =

        volumes[

            volumes.length - 1

        ];


    return {

        rsi,

        ema20,

        ema50,

        sma200,

        macd,

        bollinger,

        atr,

        adx,

        averageVolume,

        currentVolume

    };

}


/* =========================================================
   SMA
========================================================= */

function calculateSMA(

    values,

    period

) {

    if (

        values.length < period

    ) {

        return null;

    }


    const recent =

        values.slice(

            -period

        );


    return (

        recent.reduce(

            (

                total,

                value

            ) => total + value,

            0

        ) / period

    );

}


/* =========================================================
   EMA
========================================================= */

function calculateEMA(

    values,

    period

) {

    if (

        values.length < period

    ) {

        return null;

    }


    const multiplier =

        2 /

        (

            period + 1

        );


    let ema =

        calculateSMA(

            values.slice(

                0,

                period

            ),

            period

        );


    for (

        let i = period;

        i < values.length;

        i++

    ) {

        ema =

            (

                values[i] -

                ema

            ) *

            multiplier +

            ema;

    }


    return ema;

}


/* =========================================================
   RSI
========================================================= */

function calculateRSI(

    values,

    period = 14

) {

    if (

        values.length <= period

    ) {

        return null;

    }


    let gains = 0;

    let losses = 0;


    for (

        let i = 1;

        i <= period;

        i++

    ) {

        const change =

            values[i] -

            values[i - 1];


        if (

            change >= 0

        ) {

            gains += change;

        }

        else {

            losses +=

                Math.abs(

                    change

                );

        }

    }


    let averageGain =

        gains / period;


    let averageLoss =

        losses / period;


    for (

        let i = period + 1;

        i < values.length;

        i++

    ) {

        const change =

            values[i] -

            values[i - 1];


        const gain =

            change > 0

                ? change

                : 0;


        const loss =

            change < 0

                ? Math.abs(

                    change

                )

                : 0;


        averageGain =

            (

                averageGain *

                (

                    period - 1

                ) +

                gain

            ) / period;


        averageLoss =

            (

                averageLoss *

                (

                    period - 1

                ) +

                loss

            ) / period;

    }


    if (

        averageLoss === 0

    ) {

        return 100;

    }


    const relativeStrength =

        averageGain /

        averageLoss;


    return (

        100 -

        (

            100 /

            (

                1 +

                relativeStrength

            )

        )

    );

}


/* =========================================================
   MACD
========================================================= */

function calculateMACD(

    values

) {

    const ema12 =

        calculateEMA(

            values,

            12

        );


    const ema26 =

        calculateEMA(

            values,

            26

        );


    if (

        ema12 === null ||

        ema26 === null

    ) {

        return {

            value: null,

            signal: "NEUTRAL"

        };

    }


    const value =

        ema12 -

        ema26;


    return {

        value,

        signal:

            value > 0

                ? "BULLISH"

                : "BEARISH"

    };

}


/* =========================================================
   BOLLINGER BANDS
========================================================= */

function calculateBollingerBands(

    values,

    period = 20,

    standardDeviations = 2

) {

    const sma =

        calculateSMA(

            values,

            period

        );


    if (

        sma === null

    ) {

        return null;

    }


    const recent =

        values.slice(

            -period

        );


    const variance =

        recent.reduce(

            (

                total,

                value

            ) => {

                return total +

                    Math.pow(

                        value -

                        sma,

                        2

                    );

            },

            0

        ) / period;


    const standardDeviation =

        Math.sqrt(

            variance

        );


    return {

        middle: sma,

        upper:

            sma +

            (

                standardDeviation *

                standardDeviations

            ),

        lower:

            sma -

            (

                standardDeviation *

                standardDeviations

            )

    };

}


/* =========================================================
   ATR
========================================================= */

function calculateATR(

    candles,

    period = 14

) {

    if (

        candles.length <

        period + 1

    ) {

        return null;

    }


    const trueRanges = [];


    for (

        let i = 1;

        i < candles.length;

        i++

    ) {

        const current =

            candles[i];


        const previous =

            candles[i - 1];


        const trueRange =

            Math.max(

                current.high -

                current.low,


                Math.abs(

                    current.high -

                    previous.close

                ),


                Math.abs(

                    current.low -

                    previous.close

                )

            );


        trueRanges.push(

            trueRange

        );

    }


    return calculateSMA(

        trueRanges,

        period

    );

}


/* =========================================================
   ADX - TREND STRENGTH APPROXIMATION
========================================================= */

function calculateADX(

    candles,

    period = 14

) {

    if (

        candles.length <

        period + 1

    ) {

        return null;

    }


    const directionalMovements = [];


    for (

        let i = 1;

        i < candles.length;

        i++

    ) {

        const current =

            candles[i];


        const previous =

            candles[i - 1];


        const upMove =

            current.high -

            previous.high;


        const downMove =

            previous.low -

            current.low;


        let movement = 0;


        if (

            upMove > downMove &&

            upMove > 0

        ) {

            movement =

                upMove;

        }

        else if (

            downMove > upMove &&

            downMove > 0

        ) {

            movement =

                -downMove;

        }


        directionalMovements.push(

            movement

        );

    }


    const absoluteMovements =

        directionalMovements.map(

            value =>

                Math.abs(

                    value

                )

        );


    const averageMovement =

        calculateSMA(

            absoluteMovements,

            period

        );


    if (

        !averageMovement

    ) {

        return null;

    }


    const recentMovement =

        Math.abs(

            directionalMovements[

                directionalMovements.length - 1

            ]

        );


    const adx =

        (

            recentMovement /

            averageMovement

        ) *

        25;


    return Math.min(

        100,

        adx

    );

}


/* =========================================================
   TECHNICAL SCORING
========================================================= */

function calculateTechnicalAnalysis(

    quote,

    indicators

) {

    const price =

        quote.price;


    let score = 0;

    let buySignals = 0;

    let sellSignals = 0;

    let totalSignals = 0;


    const signals = {};


    /* RSI */

    if (

        indicators.rsi !== null

    ) {

        totalSignals++;


        if (

            indicators.rsi >= 50 &&

            indicators.rsi <= 68

        ) {

            score += 15;

            buySignals++;

            signals.rsi = "BUY";

        }

        else if (

            indicators.rsi < 30

        ) {

            score += 15;

            buySignals++;

            signals.rsi = "BUY";

        }

        else if (

            indicators.rsi > 70

        ) {

            score -= 15;

            sellSignals++;

            signals.rsi = "SELL";

        }

        else {

            score += 7;

            signals.rsi = "NEUTRAL";

        }

    }


    /* MACD */

    totalSignals++;


    if (

        indicators.macd.signal ===

        "BULLISH"

    ) {

        score += 15;

        buySignals++;

        signals.macd = "BUY";

    }

    else {

        score -= 15;

        sellSignals++;

        signals.macd = "SELL";

    }


    /* EMA 20 / 50 */

    if (

        indicators.ema20 !== null &&

        indicators.ema50 !== null

    ) {

        totalSignals++;


        if (

            indicators.ema20 >

            indicators.ema50

        ) {

            score += 15;

            buySignals++;

            signals.ema = "BUY";

        }

        else {

            score -= 15;

            sellSignals++;

            signals.ema = "SELL";

        }

    }


    /* SMA 200 */

    if (

        indicators.sma200 !== null

    ) {

        totalSignals++;


        if (

            price >

            indicators.sma200

        ) {

            score += 10;

            buySignals++;

            signals.sma = "BUY";

        }

        else {

            score -= 10;

            sellSignals++;

            signals.sma = "SELL";

        }

    }


    /* Bollinger Bands */

    if (

        indicators.bollinger

    ) {

        totalSignals++;


        if (

            price >

            indicators.bollinger.middle

        ) {

            score += 10;

            buySignals++;

            signals.bollinger = "BUY";

        }

        else {

            score += 5;

            signals.bollinger = "NEUTRAL";

        }

    }


    /* ADX */

    if (

        indicators.adx !== null

    ) {

        totalSignals++;


        if (

            indicators.adx >= 25

        ) {

            score += 10;

            buySignals++;

            signals.adx = "BUY";

        }

        else {

            score += 5;

            signals.adx = "NEUTRAL";

        }

    }


    /* Volume */

    if (

        indicators.averageVolume &&

        indicators.currentVolume

    ) {

        totalSignals++;


        const volumeRatio =

            indicators.currentVolume /

            indicators.averageVolume;


        if (

            volumeRatio >= 1.2

        ) {

            score += 10;

            buySignals++;

            signals.volume = "BUY";

        }

        else {

            score += 5;

            signals.volume = "NEUTRAL";

        }

    }


    const maxPossibleScore =

        85;


    const normalizedScore =

        Math.max(

            0,

            Math.min(

                100,

                Math.round(

                    (

                        score /

                        maxPossibleScore

                    ) *

                    100

                )

            )

        );


    let signal =

        "NEUTRAL";


    if (

        normalizedScore >= 75

    ) {

        signal =

            "STRONG BUY";

    }

    else if (

        normalizedScore >= 60

    ) {

        signal =

            "BUY";

    }

    else if (

        normalizedScore <= 25

    ) {

        signal =

            "STRONG SELL";

    }

    else if (

        normalizedScore <= 40

    ) {

        signal =

            "SELL";

    }


    const tradeLevels =

        calculateTradeLevels(

            price,

            indicators,

            signal

        );


    return {

        score:

            normalizedScore,

        signal,

        buySignals,

        sellSignals,

        totalSignals,

        signals,

        tradeLevels

    };

}


/* =========================================================
   TRADE LEVELS
========================================================= */

function calculateTradeLevels(

    price,

    indicators,

    signal

) {

    const atr =

        indicators.atr;


    if (

        !atr

    ) {

        return {

            entry: price,

            target: null,

            stopLoss: null,

            exit: null

        };

    }


    let entry = price;


    let stopLoss;


    let target;


    if (

        signal.includes(

            "BUY"

        )

    ) {

        stopLoss =

            price -

            (

                atr *

                1.5

            );


        target =

            price +

            (

                atr *

                2

            );

    }

    else if (

        signal.includes(

            "SELL"

        )

    ) {

        stopLoss =

            price +

            (

                atr *

                1.5

            );


        target =

            price -

            (

                atr *

                2

            );

    }

    else {

        stopLoss =

            price -

            atr;


        target =

            price +

            atr;

    }


    return {

        entry,

        target,

        stopLoss,

        exit: target

    };

}


/* =========================================================
   RENDER REAL ANALYSIS
========================================================= */

function renderRealAnalysis(

    instrument,

    quote,

    indicators,

    analysis

) {

    const section =

        query(

            ".stock-analysis-section"

        );


    if (

        !section

    ) {

        console.warn(

            "Analysis section not found."

        );

        return;

    }


    section.classList.remove(

        "hidden"

    );


    const symbol =

        instrument.trading_symbol ||

        instrument.short_name ||

        instrument.name;


    setText(

        section,

        ".analysis-symbol",

        symbol

    );


    setText(

        section,

        ".analysis-price",

        formatPrice(

            quote.price

        )

    );


    setText(

        section,

        ".analysis-price-change",

        `${

            quote.percentChange >= 0

                ? "+"

                : ""

        }${

            quote.percentChange.toFixed(

                2

            )

        }%`

    );


    setText(

        section,

        ".large-signal-badge",

        analysis.signal

    );


    setText(

        section,

        ".technical-score strong",

        `${

            analysis.score

        }/100`

    );


    renderTradeLevels(

        section,

        analysis.tradeLevels

    );


    renderIndicators(

        section,

        indicators,

        analysis

    );


    renderAdditionalMetrics(

        section,

        indicators

    );

}


/* =========================================================
   RENDER TRADE LEVELS
========================================================= */

function renderTradeLevels(

    section,

    levels

) {

    const cards =

        section.querySelectorAll(

            ".trade-level-card strong"

        );


    if (

        cards.length >= 4

    ) {

        cards[0].textContent =

            formatPrice(

                levels.entry

            );


        cards[1].textContent =

            levels.target

                ? formatPrice(

                    levels.target

                )

                : "--";


        cards[2].textContent =

            levels.stopLoss

                ? formatPrice(

                    levels.stopLoss

                )

                : "--";


        cards[3].textContent =

            levels.exit

                ? formatPrice(

                    levels.exit

                )

                : "--";

    }

}


/* =========================================================
   RENDER INDICATORS
========================================================= */

function renderIndicators(

    section,

    indicators,

    analysis

) {

    const grid =

        section.querySelector(

            ".indicator-grid"

        );


    if (

        !grid

    ) return;


    const indicatorData = [

        {

            name: "RSI",

            signal:

                analysis.signals.rsi ||

                "N/A",

            value:

                indicators.rsi !== null

                    ? indicators.rsi.toFixed(

                        2

                    )

                    : "--"

        },

        {

            name: "MACD",

            signal:

                analysis.signals.macd ||

                "N/A",

            value:

                indicators.macd.signal

        },

        {

            name: "EMA 20 / 50",

            signal:

                analysis.signals.ema ||

                "N/A",

            value:

                indicators.ema20 &&

                indicators.ema50

                    ? `${

                        indicators.ema20.toFixed(

                            2

                        )

                    } / ${

                        indicators.ema50.toFixed(

                            2

                        )

                    }`

                    : "--"

        },

        {

            name: "SMA 200",

            signal:

                analysis.signals.sma ||

                "N/A",

            value:

                indicators.sma200

                    ? indicators.sma200.toFixed(

                        2

                    )

                    : "--"

        },

        {

            name: "Bollinger Bands",

            signal:

                analysis.signals.bollinger ||

                "N/A",

            value:

                indicators.bollinger

                    ? `Upper: ${

                        indicators.bollinger.upper.toFixed(

                            2

                        )

                    }`

                    : "--"

        },

        {

            name: "ADX",

            signal:

                analysis.signals.adx ||

                "N/A",

            value:

                indicators.adx !== null

                    ? indicators.adx.toFixed(

                        2

                    )

                    : "--"

        },

        {

            name: "Volume",

            signal:

                analysis.signals.volume ||

                "N/A",

            value:

                indicators.averageVolume

                    ? `${

                        (

                            indicators.currentVolume /

                            indicators.averageVolume

                        ).toFixed(

                            2

                        )

                    }x average`

                    : "--"

        }

    ];


    grid.innerHTML = "";


    indicatorData.forEach(

        indicator => {

            const card =

                document.createElement(

                    "div"

                );


            card.className =

                "indicator-card";


            const signalClass =

                indicator.signal ===

                "BUY"

                    ? "positive"

                    : indicator.signal ===

                        "SELL"

                        ? "negative"

                        : "neutral";


            card.innerHTML = `

                <div class="indicator-name">

                    ${

                        indicator.name

                    }

                </div>


                <div class="indicator-signal ${

                    signalClass

                }">

                    ${

                        indicator.signal

                    }

                </div>


                <div class="indicator-value">

                    ${

                        indicator.value

                    }

                </div>

            `;


            grid.appendChild(

                card

            );

        }

    );

}


/* =========================================================
   ADDITIONAL METRICS
========================================================= */

function renderAdditionalMetrics(

    section,

    indicators

) {

    const atr =

        indicators.atr;


    const adx =

        indicators.adx;


    const volumeRatio =

        indicators.averageVolume

            ? indicators.currentVolume /

            indicators.averageVolume

            : null;


    setText(

        section,

        ".trend-strength",

        adx !== null

            ? adx.toFixed(

                2

            )

            : "--"

    );


    setText(

        section,

        ".volume-strength",

        volumeRatio !== null

            ? `${

                volumeRatio.toFixed(

                    2

                )

            }x average`

            : "--"

    );


    setText(

        section,

        ".atr-value",

        atr !== null

            ? formatPrice(

                atr

            )

            : "--"

    );

}


/* =========================================================
   REFRESH
========================================================= */

function setupRefreshButton() {

    const button =

        query(

            ".refresh-button"

        );


    if (

        !button

    ) return;


    button.addEventListener(

        "click",

        () => {

            if (

                appState.selectedInstrument

            ) {

                analyzeSelectedStock();

            }

            else {

                showToast(

                    "Select a stock first.",

                    "warning"

                );

            }

        }

    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    queryAll(

        ".nav-item"

    ).forEach(

        item => {

            item.addEventListener(

                "click",

                () => {

                    queryAll(

                        ".nav-item"

                    ).forEach(

                        nav => {

                            nav.classList.remove(

                                "active"

                            );

                        }

                    );


                    item.classList.add(

                        "active"

                    );

                }

            );

        }

    );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    const button =

        query(

            ".mobile-menu-button"

        );


    const sidebar =

        query(

            ".sidebar"

        );


    if (

        !button ||

        !sidebar

    ) return;


    button.addEventListener(

        "click",

        () => {

            sidebar.classList.toggle(

                "open"

            );

        }

    );

}


/* =========================================================
   MARKET STATUS
========================================================= */

function updateMarketStatus() {

    const now =

        new Date();


    const day =

        now.getDay();


    const minutes =

        now.getHours() *

        60 +

        now.getMinutes();


    const marketOpen =

        9 *

        60 +

        15;


    const marketClose =

        15 *

        60 +

        30;


    const isWeekday =

        day >= 1 &&

        day <= 5;


    const isOpen =

        isWeekday &&

        minutes >= marketOpen &&

        minutes <= marketClose;


    const status =

        query(

            ".market-status-card strong"

        );


    if (

        status

    ) {

        status.textContent =

            isOpen

                ? "Market Open"

                : "Market Closed";

    }

}


/* =========================================================
   HIDE ANALYSIS
========================================================= */

function hideAnalysis() {

    const section =

        query(

            ".stock-analysis-section"

        );


    if (

        section

    ) {

        section.classList.add(

            "hidden"

        );

    }

}


function clearAnalysis() {

    hideAnalysis();

}


/* =========================================================
   SUGGESTION HELPERS
========================================================= */

function hideSuggestions() {

    const container =

        query(

            ".stock-suggestions"

        );


    if (

        container

    ) {

        container.classList.remove(

            "visible"

        );

    }

}


function showSearchLoading() {

    let container =

        query(

            ".stock-suggestions"

        );


    if (

        !container

    ) {

        const searchBox =

            query(

                ".search-box"

            );


        if (

            !searchBox

        ) return;


        container =

            document.createElement(

                "div"

            );


        container.className =

            "stock-suggestions";


        searchBox.appendChild(

            container

        );

    }


    container.innerHTML = `

        <div class="no-suggestion">

            Searching real stocks...

        </div>

    `;


    container.classList.add(

        "visible"

    );

}


function renderNoSuggestions(

    message

) {

    const container =

        query(

            ".stock-suggestions"

        );


    if (

        !container

    ) return;


    container.innerHTML = `

        <div class="no-suggestion">

            ${

                escapeHTML(

                    message ||

                    "No stock found"

                )

            }

        </div>

    `;


    container.classList.add(

        "visible"

    );

}


/* =========================================================
   UI HELPERS
========================================================= */

function setText(

    parent,

    selector,

    value

) {

    const element =

        parent.querySelector(

            selector

        );


    if (

        element

    ) {

        element.textContent =

            value;

    }

}


function formatPrice(

    value

) {

    if (

        value === null ||

        value === undefined ||

        isNaN(

            value

        )

    ) {

        return "--";

    }


    return `₹${

        Number(

            value

        ).toLocaleString(

            "en-IN",

            {

                minimumFractionDigits: 2,

                maximumFractionDigits: 2

            }

        )

    }`;

}


function formatDate(

    date

) {

    const year =

        date.getFullYear();


    const month =

        String(

            date.getMonth() + 1

        ).padStart(

            2,

            "0"

        );


    const day =

        String(

            date.getDate()

        ).padStart(

            2,

            "0"

        );


    return `${

        year

    }-${

        month

    }-${

        day

    }`;

}


function updateLastUpdated() {

    appState.lastUpdated =

        new Date();


    const element =

        query(

            ".last-updated"

        );


    if (

        element

    ) {

        element.textContent =

            `Last updated: ${

                appState.lastUpdated.toLocaleTimeString(

                    "en-IN"

                )

            }`;

    }

}


/* =========================================================
   LOADING
========================================================= */

function showLoading(

    message

) {

    const overlay =

        query(

            ".loading-overlay"

        );


    if (

        !overlay

    ) return;


    overlay.classList.remove(

        "hidden"

    );


    const title =

        overlay.querySelector(

            "h3"

        );


    if (

        title

    ) {

        title.textContent =

            message;

    }

}


function hideLoading() {

    const overlay =

        query(

            ".loading-overlay"

        );


    if (

        overlay

    ) {

        overlay.classList.add(

            "hidden"

        );

    }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(

    message,

    type = "success"

) {

    let container =

        query(

            ".toast-container"

        );


    if (

        !container

    ) {

        container =

            document.createElement(

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


    toast.className =

        `toast ${

            type

        }`;


    toast.textContent =

        message;


    container.appendChild(

        toast

    );


    setTimeout(

        () => {

            toast.remove();

        },

        4000

    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(

    value

) {

    return String(

        value

    )

        .replace(

            /&/g,

            "&amp;"

        )

        .replace(

            /</g,

            "&lt;"

        )

        .replace(

            />/g,

            "&gt;"

        )

        .replace(

            /"/g,

            "&quot;"

        )

        .replace(

            /'/g,

            "&#039;"

        );

}


/* =========================================================
   CLOSE SUGGESTIONS WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener(

    "click",

    event => {

        const searchBox =

            query(

                ".search-box"

            );


        if (

            searchBox &&

            !searchBox.contains(

                event.target

            )

        ) {

            hideSuggestions();

        }

    }

);


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.searchStocks =

    searchStocks;


window.selectStock =

    selectStock;


window.analyzeSelectedStock =

    analyzeSelectedStock;
