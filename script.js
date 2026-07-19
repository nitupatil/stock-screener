/* =========================================================
   INTRADAY STOCK SCREENER
   Complete replacement script.js

   Data:
   - Upstox API
   - Real quotes
   - Real historical candles

   Features:
   - Dashboard
   - Buy Signals
   - Sell Signals
   - Market Overview
   - Watchlist
   - Real stock search
   - Technical analysis
   - Stock detail modal
   - Price chart
   - Top gainers
   - Top losers
   - Local watchlist

   IMPORTANT:
   Add your Upstox Access Token below.
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const UPSTOX_ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJKUjIxMjQiLCJqdGkiOiI2YTVkMTZjNjA4YzFiODBkMjMyNzY2MzMiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6dHJ1ZSwiaWF0IjoxNzg0NDg1NTc0LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3ODQ0OTg0MDB9._dlwsYewbVmcLDOibXkOOXE41qznjbuQJoka3IIjTqQ";

const UPSTOX_API_BASE = "https://api.upstox.com/v2";

const API_HEADERS = {
    "Accept": "application/json",
    "Authorization": `Bearer ${UPSTOX_ACCESS_TOKEN}`
};


/*
   For dashboard scanning, the application needs actual
   instrument keys.

   These can be loaded from the official Upstox instrument
   master file. The code below attempts to load the NSE
   equity instrument file.

   If your browser blocks this request because of CORS,
   use a local instrument JSON file or backend later.
*/

const INSTRUMENT_MASTER_URL =
    "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {

    currentPage: "dashboard",

    selectedStock: null,

    selectedQuote: null,

    selectedCandles: [],

    selectedAnalysis: null,

    instruments: [],

    filteredInstruments: [],

    dashboardStocks: [],

    topGainers: [],

    topLosers: [],

    buySignals: [],

    sellSignals: [],

    watchlist: loadWatchlist(),

    instrumentDataLoaded: false,

    dashboardLoaded: false,

    isLoading: false,

    searchTimer: null,

    currentChart: null,

    lastDashboardUpdate: null

};


/* =========================================================
   DOM SHORTCUTS
========================================================= */

const $ = selector => document.querySelector(selector);

const $$ = selector => document.querySelectorAll(selector);

const byId = id => document.getElementById(id);


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        setupNavigation();

        setupSearch();

        setupButtons();

        setupFilters();

        setupModal();

        setupMobileMenu();

        updateMarketStatus();

        renderWatchlist();

        await initializeDashboard();

    }

);


/* =========================================================
   DASHBOARD INITIALIZATION
========================================================= */

async function initializeDashboard() {

    try {

        showLoading(

            "Loading real market data..."

        );


        if (

            !UPSTOX_ACCESS_TOKEN ||

            UPSTOX_ACCESS_TOKEN ===

            "PASTE_YOUR_ACCESS_TOKEN_HERE"

        ) {

            throw new Error(

                "Upstox access token is missing."

            );

        }


        await loadInstrumentMaster();


        const stocks =

            getDashboardUniverse();


        if (

            !stocks.length

        ) {

            throw new Error(

                "No real stock instruments found."

            );

        }


        const quotes =

            await fetchQuotesInBatches(

                stocks

            );


        const analyzedStocks = [];


        for (

            const stock of quotes

        ) {

            try {

                const candles =

                    await fetchHistoricalCandles(

                        stock.instrument_key,

                        "day",

                        1,

                        120

                    );


                if (

                    candles.length < 50

                ) {

                    continue;

                }


                const indicators =

                    calculateIndicators(

                        candles

                    );


                const analysis =

                    calculateScore(

                        stock,

                        indicators

                    );


                analyzedStocks.push({

                    ...stock,

                    candles,

                    indicators,

                    analysis

                });

            }

            catch (

                error

            ) {

                console.warn(

                    "Skipping stock:",

                    stock.trading_symbol,

                    error.message

                );

            }

        }


        if (

            !analyzedStocks.length

        ) {

            throw new Error(

                "No technical analysis data could be calculated."

            );

        }


        state.dashboardStocks =

            analyzedStocks;


        state.topGainers =

            [...analyzedStocks]

                .sort(

                    (

                        a,

                        b

                    ) =>

                        b.percent_change -

                        a.percent_change

                )

                .slice(

                    0,

                    5

                );


        state.topLosers =

            [...analyzedStocks]

                .sort(

                    (

                        a,

                        b

                    ) =>

                        a.percent_change -

                        b.percent_change

                )

                .slice(

                    0,

                    5

                );


        state.buySignals =

            [...analyzedStocks]

                .filter(

                    stock =>

                        stock.analysis.score >= 60

                )

                .sort(

                    (

                        a,

                        b

                    ) =>

                        b.analysis.score -

                        a.analysis.score

                );


        state.sellSignals =

            [...analyzedStocks]

                .filter(

                    stock =>

                        stock.analysis.score <= 40

                )

                .sort(

                    (

                        a,

                        b

                    ) =>

                        a.analysis.score -

                        b.analysis.score

                );


        renderDashboard();

        state.dashboardLoaded = true;

        state.lastDashboardUpdate = new Date();

        updateLastScan();


        showToast(

            "Real market data loaded.",

            "success"

        );

    }

    catch (

        error

    ) {

        console.error(

            error

        );


        renderDashboardError(

            error.message

        );


        showToast(

            error.message,

            "error"

        );

    }

    finally {

        hideLoading();

    }

}


/* =========================================================
   UPSTOX API REQUEST
========================================================= */

async function upstoxRequest(

    endpoint

) {

    const response =

        await fetch(

            `${

                UPSTOX_API_BASE

            }${

                endpoint

            }`,

            {

                method: "GET",

                headers: API_HEADERS

            }

        );


    let data;


    try {

        data = await response.json();

    }

    catch {

        data = null;

    }


    if (

        !response.ok

    ) {

        const message =

            data?.errors?.[0]?.message ||

            `Upstox API error ${

                response.status

            }`;


        throw new Error(

            message

        );

    }


    return data;

}


/* =========================================================
   INSTRUMENT MASTER
========================================================= */

async function loadInstrumentMaster() {

    if (

        state.instrumentDataLoaded

    ) {

        return;

    }


    /*
       The complete instrument master is a compressed file.

       Browser support for .gz JSON depends on the response.
       If direct loading fails, use the fallback list below
       only for instrument identity.

       No prices or technical values are hardcoded.
    */

    try {

        const response =

            await fetch(

                INSTRUMENT_MASTER_URL

            );


        if (

            !response.ok

        ) {

            throw new Error(

                "Instrument master unavailable."

            );

        }


        const buffer =

            await response.arrayBuffer();


        const text =

            await decompressGzip(

                buffer

            );


        const parsed =

            JSON.parse(

                text

            );


        state.instruments =

            Array.isArray(

                parsed

            )

                ? parsed

                : Object.values(

                    parsed

                );


        state.instrumentDataLoaded =

            true;

    }

    catch (

        error

    ) {

        console.warn(

            "Instrument master loading failed:",

            error.message

        );


        /*
           Real instrument keys for major Indian indices.
           These are identifiers only.

           Prices, candles and indicators are still fetched
           from the API.
        */

        state.instruments = [

            {

                instrument_key:

                    "NSE_INDEX|Nifty 50",

                trading_symbol:

                    "NIFTY 50",

                name:

                    "NIFTY 50",

                exchange:

                    "NSE_INDEX",

                instrument_type:

                    "INDEX"

            },

            {

                instrument_key:

                    "NSE_INDEX|Nifty Bank",

                trading_symbol:

                    "NIFTY BANK",

                name:

                    "NIFTY BANK",

                exchange:

                    "NSE_INDEX",

                instrument_type:

                    "INDEX"

            }

        ];

    }

}


/* =========================================================
   DASHBOARD UNIVERSE
========================================================= */

function getDashboardUniverse() {

    const stocks =

        state.instruments

            .filter(

                instrument => {

                    const exchange =

                        String(

                            instrument.exchange ||

                            ""

                        ).toUpperCase();


                    const type =

                        String(

                            instrument.instrument_type ||

                            ""

                        ).toUpperCase();


                    return (

                        exchange === "NSE_EQ" &&

                        type === "EQUITY"

                    );

                }

            );


    /*
       We cannot scan every NSE stock using a
       free API without considering rate limits.

       Use the first available real equity instruments
       for the dashboard scan.

       Later we can replace this with a proper NIFTY 50
       universe.
    */

    return stocks.slice(

        0,

        40

    );

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const input =

        byId(

            "stock-search"

        );


    if (

        !input

    ) return;


    input.addEventListener(

        "input",

        event => {

            const text =

                event.target.value.trim();


            clearTimeout(

                state.searchTimer

            );


            if (

                text.length < 2

            ) {

                hideSuggestions();

                return;

            }


            state.searchTimer =

                setTimeout(

                    () => {

                        renderSearchSuggestions(

                            text

                        );

                    },

                    250

                );

        }

    );


    input.addEventListener(

        "keydown",

        event => {

            if (

                event.key === "Enter"

            ) {

                const first =

                    $(".stock-suggestion");


                if (

                    first

                ) {

                    first.click();

                }

            }

        }

    );


    byId(

        "search-clear"

    )?.addEventListener(

        "click",

        () => {

            input.value = "";

            hideSuggestions();

            closeAnalysis();

        }

    );

}


function renderSearchSuggestions(

    text

) {

    const search =

        text.toLowerCase();


    const matches =

        state.instruments

            .filter(

                instrument => {

                    const symbol =

                        String(

                            instrument.trading_symbol ||

                            ""

                        ).toLowerCase();


                    const name =

                        String(

                            instrument.name ||

                            ""

                        ).toLowerCase();


                    return (

                        symbol.includes(

                            search

                        ) ||

                        name.includes(

                            search

                        )

                    );

                }

            )

            .filter(

                instrument =>

                    instrument.instrument_key

            )

            .slice(

                0,

                10

            );


    let container =

        $(".stock-suggestions");


    if (

        !container

    ) {

        container =

            document.createElement(

                "div"

            );


        container.className =

            "stock-suggestions";


        $(".search-box")?.appendChild(

            container

        );

    }


    container.innerHTML = "";


    if (

        !matches.length

    ) {

        container.innerHTML = `

            <div class="no-suggestion">

                No real stock found

            </div>

        `;


        container.classList.add(

            "visible"

        );


        return;

    }


    matches.forEach(

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

                                "Unknown company"

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


function hideSuggestions() {

    $(".stock-suggestions")

        ?.classList

        .remove(

            "visible"

        );

}


/* =========================================================
   SELECT STOCK
========================================================= */

async function selectStock(

    instrument

) {

    state.selectedStock =

        instrument;


    hideSuggestions();


    const input =

        byId(

            "stock-search"

        );


    if (

        input

    ) {

        input.value =

            instrument.trading_symbol ||

            instrument.short_name ||

            "";

    }


    await analyzeStock(

        instrument

    );

}


/* =========================================================
   ANALYZE SELECTED STOCK
========================================================= */

async function analyzeStock(

    instrument

) {

    try {

        showLoading(

            `Analyzing ${

                instrument.trading_symbol

            }...`

        );


        const quote =

            await fetchQuote(

                instrument.instrument_key

            );


        const candles =

            await fetchHistoricalCandles(

                instrument.instrument_key,

                "minutes",

                5,

                100

            );


        const usableCandles =

            candles.length >= 50

                ? candles

                : await fetchHistoricalCandles(

                    instrument.instrument_key,

                    "day",

                    1,

                    120

                );


        if (

            usableCandles.length < 50

        ) {

            throw new Error(

                "Insufficient real historical data."

            );

        }


        const indicators =

            calculateIndicators(

                usableCandles

            );


        const analysis =

            calculateScore(

                quote,

                indicators

            );


        state.selectedQuote =

            quote;


        state.selectedCandles =

            usableCandles;


        state.selectedAnalysis =

            analysis;


        renderAnalysis(

            instrument,

            quote,

            indicators,

            analysis

        );


        openAnalysis();


    }

    catch (

        error

    ) {

        console.error(

            error

        );


        closeAnalysis();


        showToast(

            `Unable to analyze stock: ${

                error.message

            }`,

            "error"

        );

    }

    finally {

        hideLoading();

    }

}


/* =========================================================
   FETCH QUOTES
========================================================= */

async function fetchQuote(

    instrumentKey

) {

    const key =

        encodeURIComponent(

            instrumentKey

        );


    const response =

        await upstoxRequest(

            `/market-quote/ltp?instrument_key=${

                key

            }`

        );


    const data =

        Object.values(

            response?.data || {}

        )[0];


    if (

        !data ||

        data.last_price === undefined

    ) {

        throw new Error(

            "Real quote not available."

        );

    }


    return {

        price:

            Number(

                data.last_price

            ),

        change:

            Number(

                data.net_change || 0

            ),

        percent_change:

            Number(

                data.percent_change || 0

            )

    };

}


async function fetchQuotesInBatches(

    instruments

) {

    const results = [];


    const batchSize = 10;


    for (

        let i = 0;

        i < instruments.length;

        i += batchSize

    ) {

        const batch =

            instruments.slice(

                i,

                i + batchSize

            );


        const keys =

            batch

                .map(

                    item =>

                        item.instrument_key

                )

                .join(

                    ","

                );


        try {

            const response =

                await upstoxRequest(

                    `/market-quote/ltp?instrument_key=${

                        encodeURIComponent(

                            keys

                        )

                    }`

                );


            const quoteMap =

                response?.data || {};


            batch.forEach(

                instrument => {

                    const quote =

                        quoteMap[

                            instrument.instrument_key

                        ];


                    if (

                        quote &&

                        quote.last_price !== undefined

                    ) {

                        results.push({

                            ...instrument,

                            price:

                                Number(

                                    quote.last_price

                                ),

                            change:

                                Number(

                                    quote.net_change || 0

                                ),

                            percent_change:

                                Number(

                                    quote.percent_change || 0

                                )

                        });

                    }

                }

            );

        }

        catch (

            error

        ) {

            console.warn(

                "Quote batch failed:",

                error.message

            );

        }

    }


    return results;

}


/* =========================================================
   HISTORICAL CANDLES
========================================================= */

async function fetchHistoricalCandles(

    instrumentKey,

    unit = "day",

    interval = 1,

    days = 120

) {

    const to =

        new Date();


    const from =

        new Date();


    from.setDate(

        from.getDate() - days

    );


    const toDate =

        formatDate(

            to

        );


    const fromDate =

        formatDate(

            from

        );


    const key =

        encodeURIComponent(

            instrumentKey

        );


    let endpoint;


    if (

        unit === "minutes"

    ) {

        endpoint =

            `/historical-candle/${

                key

            }/minutes/${

                interval

            }/${

                toDate

            }/${

                fromDate

            }`;

    }

    else {

        endpoint =

            `/historical-candle/${

                key

            }/day/${

                interval

            }/${

                toDate

            }/${

                fromDate

            }`;

    }


    const response =

        await upstoxRequest(

            endpoint

        );


    const candles =

        response?.data?.candles;


    if (

        !Array.isArray(

            candles

        )

    ) {

        return [];

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

                        candle[5] || 0

                    )

            })

        )

        .reverse();

}


/* =========================================================
   TECHNICAL INDICATORS
========================================================= */

function calculateIndicators(

    candles

) {

    const closes =

        candles.map(

            candle => candle.close

        );


    const volumes =

        candles.map(

            candle => candle.volume

        );


    return {

        rsi:

            calculateRSI(

                closes,

                14

            ),


        ema20:

            calculateEMA(

                closes,

                20

            ),


        ema50:

            calculateEMA(

                closes,

                50

            ),


        sma200:

            calculateSMA(

                closes,

                200

            ),


        macd:

            calculateMACD(

                closes

            ),


        bollinger:

            calculateBollinger(

                closes,

                20

            ),


        atr:

            calculateATR(

                candles,

                14

            ),


        adx:

            calculateADX(

                candles,

                14

            ),


        averageVolume:

            calculateSMA(

                volumes,

                20

            ),


        currentVolume:

            volumes[

                volumes.length - 1

            ]

    };

}


function calculateSMA(

    values,

    period

) {

    if (

        values.length < period

    ) {

        return null;

    }


    const slice =

        values.slice(

            -period

        );


    return slice.reduce(

        (

            total,

            value

        ) => total + value,

        0

    ) / period;

}


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


function calculateRSI(

    values,

    period = 14

) {

    if (

        values.length <= period

    ) {

        return null;

    }


    let gain = 0;

    let loss = 0;


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

            gain += change;

        }

        else {

            loss +=

                Math.abs(

                    change

                );

        }

    }


    let avgGain =

        gain / period;


    let avgLoss =

        loss / period;


    for (

        let i = period + 1;

        i < values.length;

        i++

    ) {

        const change =

            values[i] -

            values[i - 1];


        const currentGain =

            Math.max(

                change,

                0

            );


        const currentLoss =

            Math.max(

                -change,

                0

            );


        avgGain =

            (

                avgGain *

                (

                    period - 1

                ) +

                currentGain

            ) / period;


        avgLoss =

            (

                avgLoss *

                (

                    period - 1

                ) +

                currentLoss

            ) / period;

    }


    if (

        avgLoss === 0

    ) {

        return 100;

    }


    const rs =

        avgGain /

        avgLoss;


    return 100 -

        (

            100 /

            (

                1 + rs

            )

        );

}


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

            value >= 0

                ? "BULLISH"

                : "BEARISH"

    };

}


function calculateBollinger(

    values,

    period = 20

) {

    const middle =

        calculateSMA(

            values,

            period

        );


    if (

        middle === null

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

            ) =>

                total +

                Math.pow(

                    value -

                    middle,

                    2

                ),

            0

        ) / period;


    const deviation =

        Math.sqrt(

            variance

        );


    return {

        middle,

        upper:

            middle +

            2 *

            deviation,

        lower:

            middle -

            2 *

            deviation

    };

}


function calculateATR(

    candles,

    period = 14

) {

    const ranges = [];


    for (

        let i = 1;

        i < candles.length;

        i++

    ) {

        const current =

            candles[i];


        const previous =

            candles[i - 1];


        ranges.push(

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

            )

        );

    }


    return calculateSMA(

        ranges,

        period

    );

}


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


    const movements = [];


    for (

        let i = 1;

        i < candles.length;

        i++

    ) {

        const up =

            candles[i].high -

            candles[i - 1].high;


        const down =

            candles[i - 1].low -

            candles[i].low;


        movements.push(

            Math.max(

                up,

                down,

                0

            )

        );

    }


    const average =

        calculateSMA(

            movements,

            period

        );


    if (

        !average

    ) {

        return null;

    }


    const latest =

        movements[

            movements.length - 1

        ];


    return Math.min(

        100,

        (

            latest /

            average

        ) *

        25

    );

}


/* =========================================================
   SCORING SYSTEM
========================================================= */

function calculateScore(

    stock,

    indicators

) {

    const price =

        stock.price;


    let score = 50;


    const signals = {};


    if (

        indicators.rsi !== null

    ) {

        if (

            indicators.rsi >= 50 &&

            indicators.rsi <= 68

        ) {

            score += 10;

            signals.rsi = "BUY";

        }

        else if (

            indicators.rsi > 70

        ) {

            score -= 10;

            signals.rsi = "SELL";

        }

        else if (

            indicators.rsi < 30

        ) {

            score += 5;

            signals.rsi = "BUY";

        }

        else {

            signals.rsi = "NEUTRAL";

        }

    }


    if (

        indicators.macd.signal ===

        "BULLISH"

    ) {

        score += 15;

        signals.macd = "BUY";

    }

    else {

        score -= 15;

        signals.macd = "SELL";

    }


    if (

        indicators.ema20 !== null &&

        indicators.ema50 !== null

    ) {

        if (

            indicators.ema20 >

            indicators.ema50

        ) {

            score += 15;

            signals.ema = "BUY";

        }

        else {

            score -= 15;

            signals.ema = "SELL";

        }

    }


    if (

        indicators.sma200 !== null

    ) {

        if (

            price >

            indicators.sma200

        ) {

            score += 10;

            signals.sma = "BUY";

        }

        else {

            score -= 10;

            signals.sma = "SELL";

        }

    }


    if (

        indicators.bollinger

    ) {

        if (

            price >

            indicators.bollinger.middle

        ) {

            score += 5;

            signals.bollinger = "BUY";

        }

        else {

            signals.bollinger = "NEUTRAL";

        }

    }


    if (

        indicators.adx !== null

    ) {

        if (

            indicators.adx >= 25

        ) {

            score += 5;

            signals.adx = "BUY";

        }

        else {

            signals.adx = "NEUTRAL";

        }

    }


    if (

        indicators.averageVolume &&

        indicators.currentVolume

    ) {

        const ratio =

            indicators.currentVolume /

            indicators.averageVolume;


        if (

            ratio >= 1.2

        ) {

            score += 5;

            signals.volume = "BUY";

        }

        else {

            signals.volume = "NEUTRAL";

        }

    }


    score =

        Math.max(

            0,

            Math.min(

                100,

                Math.round(

                    score

                )

            )

        );


    let signal =

        "NEUTRAL";


    if (

        score >= 75

    ) {

        signal =

            "STRONG BUY";

    }

    else if (

        score >= 60

    ) {

        signal =

            "BUY";

    }

    else if (

        score <= 25

    ) {

        signal =

            "STRONG SELL";

    }

    else if (

        score <= 40

    ) {

        signal =

            "SELL";

    }


    const levels =

        calculateTradeLevels(

            price,

            indicators,

            signal

        );


    return {

        score,

        signal,

        signals,

        levels

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

            exit: null,

            riskReward: null

        };

    }


    if (

        signal.includes(

            "BUY"

        )

    ) {

        const stopLoss =

            price -

            atr *

            1.5;


        const target =

            price +

            atr *

            2;


        return {

            entry: price,

            target,

            stopLoss,

            exit: target,

            riskReward:

                (

                    target -

                    price

                ) /

                (

                    price -

                    stopLoss

                )

        };

    }


    if (

        signal.includes(

            "SELL"

        )

    ) {

        const stopLoss =

            price +

            atr *

            1.5;


        const target =

            price -

            atr *

            2;


        return {

            entry: price,

            target,

            stopLoss,

            exit: target,

            riskReward:

                (

                    price -

                    target

                ) /

                (

                    stopLoss -

                    price

                )

        };

    }


    return {

        entry: price,

        target: price + atr,

        stopLoss: price - atr,

        exit: price + atr,

        riskReward: 1

    };

}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard() {

    renderIndexCards();

    renderMarketBreadth();

    renderOpportunities();

    renderTopMovers();

    renderBuySignals();

    renderSellSignals();

    renderMarketOverview();

    renderWatchlist();

}


function renderDashboardError(

    message

) {

    const ids = [

        "index-grid",

        "opportunity-table-body",

        "top-gainers-list",

        "top-losers-list",

        "buy-signal-grid",

        "sell-signal-grid"

    ];


    ids.forEach(

        id => {

            const element =

                byId(

                    id

                );


            if (

                element

            ) {

                element.innerHTML = `

                    <div class="empty-state">

                        <h3>

                            Real data unavailable

                        </h3>

                        <p>

                            ${

                                escapeHTML(

                                    message

                                )

                            }

                        </p>

                    </div>

                `;

            }

        }

    );

}


/* =========================================================
   INDEX CARDS
========================================================= */

function renderIndexCards() {

    const container =

        byId(

            "index-grid"

        );


    if (

        !container

    ) return;


    const indices =

        state.instruments

            .filter(

                item =>

                    item.instrument_type ===

                    "INDEX"

            )

            .slice(

                0,

                5

            );


    container.innerHTML = "";


    if (

        !indices.length

    ) {

        container.innerHTML = `

            <div class="empty-state">

                Index data unavailable

            </div>

        `;


        return;

    }


    indices.forEach(

        index => {

            const card =

                document.createElement(

                    "div"

                );


            card.className =

                "index-card";


            card.innerHTML = `

                <span>

                    ${

                        escapeHTML(

                            index.name ||

                            index.trading_symbol

                        )

                    }

                </span>


                <strong>

                    Loading...

                </strong>

            `;


            container.appendChild(

                card

            );


            fetchQuote(

                index.instrument_key

            )

                .then(

                    quote => {

                        card.innerHTML = `

                            <span>

                                ${

                                    escapeHTML(

                                        index.name ||

                                        index.trading_symbol

                                    )

                                }

                            </span>


                            <strong>

                                ${

                                    formatPrice(

                                        quote.price

                                    )

                                }

                            </strong>


                            <small class="${

                                quote.percent_change >= 0

                                    ? "positive"

                                    : "negative"

                            }">

                                ${

                                    quote.percent_change >= 0

                                        ? "+"

                                        : ""

                                }${

                                    quote.percent_change.toFixed(

                                        2

                                    )

                                }%

                            </small>

                        `;

                    }

                )

                .catch(

                    () => {

                        card.innerHTML += `

                            <small>

                                Data unavailable

                            </small>

                        `;

                    }

                );

        }

    );

}


/* =========================================================
   MARKET BREADTH
========================================================= */

function renderMarketBreadth() {

    const stocks =

        state.dashboardStocks;


    const advancing =

        stocks.filter(

            stock =>

                stock.percent_change > 0

        ).length;


    const declining =

        stocks.filter(

            stock =>

                stock.percent_change < 0

        ).length;


    const total =

        advancing +

        declining;


    const advancePercent =

        total

            ? (

                advancing /

                total

            ) *

            100

            : 50;


    const advanceBar =

        byId(

            "advance-bar"

        );


    const declineBar =

        byId(

            "decline-bar"

        );


    if (

        advanceBar

    ) {

        advanceBar.style.width =

            `${

                advancePercent

            }%`;

    }


    if (

        declineBar

    ) {

        declineBar.style.width =

            `${

                100 -

                advancePercent

            }%`;

    }


    setText(

        "advancing-count",

        advancing

    );


    setText(

        "declining-count",

        declining

    );


    setText(

        "market-sentiment",

        advancing > declining

            ? "BULLISH"

            : declining > advancing

                ? "BEARISH"

                : "NEUTRAL"

    );


    setText(

        "market-trend",

        advancing > declining

            ? "Bullish"

            : declining > advancing

                ? "Bearish"

                : "Neutral"

    );


    setText(

        "market-trend-description",

        `Based on ${

            total

        } analyzed stocks`

    );

}


/* =========================================================
   OPPORTUNITIES
========================================================= */

function renderOpportunities(

    filter = "all"

) {

    const tbody =

        byId(

            "opportunity-table-body"

        );


    if (

        !tbody

    ) return;


    let stocks =

        state.dashboardStocks;


    if (

        filter === "buy"

    ) {

        stocks =

            state.buySignals;

    }


    if (

        filter === "sell"

    ) {

        stocks =

            state.sellSignals;

    }


    stocks =

        [...stocks]

            .sort(

                (

                    a,

                    b

                ) =>

                    b.analysis.score -

                    a.analysis.score

            )

            .slice(

                0,

                20

            );


    tbody.innerHTML = "";


    stocks.forEach(

        (

            stock,

            index

        ) => {

            const row =

                document.createElement(

                    "tr"

                );


            const levels =

                stock.analysis.levels;


            row.innerHTML = `

                <td>

                    #${

                        index + 1

                    }

                </td>


                <td>

                    <strong>

                        ${

                            escapeHTML(

                                stock.trading_symbol ||

                                stock.short_name ||

                                stock.name

                            )

                        }

                    </strong>

                </td>


                <td>

                    ${

                        formatPrice(

                            stock.price

                        )

                    }

                </td>


                <td class="${

                    stock.percent_change >= 0

                        ? "positive"

                        : "negative"

                }">

                    ${

                        stock.percent_change >= 0

                            ? "+"

                            : ""

                    }${

                        stock.percent_change.toFixed(

                            2

                        )

                    }%

                </td>


                <td>

                    ${

                        stock.analysis.score

                    }/100

                </td>


                <td>

                    ${

                        stock.analysis.signal

                    }

                </td>


                <td>

                    ${

                        formatPrice(

                            levels.entry

                        )

                    }

                </td>


                <td>

                    ${

                        formatPrice(

                            levels.target

                        )

                    }

                </td>


                <td>

                    ${

                        formatPrice(

                            levels.stopLoss

                        )

                    }

                </td>


                <td>

                    <button class="view-stock-button">

                        View

                    </button>

                </td>

            `;


            row.querySelector(

                ".view-stock-button"

            )

                .addEventListener(

                    "click",

                    () => {

                        selectStock(

                            stock

                        );

                    }

                );


            tbody.appendChild(

                row

            );

        }

    );

}


/* =========================================================
   TOP GAINERS / LOSERS
========================================================= */

function renderTopMovers() {

    renderMiniList(

        "top-gainers-list",

        state.topGainers,

        true

    );


    renderMiniList(

        "top-losers-list",

        state.topLosers,

        false

    );

}


function renderMiniList(

    id,

    stocks,

    positive

) {

    const container =

        byId(

            id

        );


    if (

        !container

    ) return;


    container.innerHTML = "";


    stocks.forEach(

        stock => {

            const item =

                document.createElement(

                    "div"

                );


            item.className =

                "mini-stock-item";


            item.innerHTML = `

                <strong>

                    ${

                        escapeHTML(

                            stock.trading_symbol ||

                            stock.short_name ||

                            stock.name

                        )

                    }

                </strong>


                <span>

                    ${

                        formatPrice(

                            stock.price

                        )

                    }

                </span>


                <b class="${

                    positive

                        ? "positive"

                        : "negative"

                }">

                    ${

                        positive

                            ? "+"

                            : ""

                    }${

                        stock.percent_change.toFixed(

                            2

                        )

                    }%

                </b>

            `;


            item.addEventListener(

                "click",

                () => {

                    selectStock(

                        stock

                    );

                }

            );


            container.appendChild(

                item

            );

        }

    );

}


/* =========================================================
   BUY SIGNALS
========================================================= */

function renderBuySignals() {

    renderSignalCards(

        "buy-signal-grid",

        state.buySignals

    );

}


function renderSellSignals() {

    renderSignalCards(

        "sell-signal-grid",

        state.sellSignals

    );

}


function renderSignalCards(

    id,

    stocks

) {

    const container =

        byId(

            id

        );


    if (

        !container

    ) return;


    container.innerHTML = "";


    stocks

        .slice(

            0,

            20

        )

        .forEach(

            stock => {

                const card =

                    document.createElement(

                        "div"

                    );


                card.className =

                    "signal-card";


                card.innerHTML = `

                    <h3>

                        ${

                            escapeHTML(

                                stock.trading_symbol ||

                                stock.short_name ||

                                stock.name

                            )

                        }

                    </h3>


                    <strong>

                        ${

                            formatPrice(

                                stock.price

                            )

                        }

                    </strong>


                    <p>

                        Score:

                        ${

                            stock.analysis.score

                        }/100

                    </p>


                    <span>

                        ${

                            stock.analysis.signal

                        }

                    </span>

                `;


                card.addEventListener(

                    "click",

                    () => {

                        selectStock(

                            stock

                        );

                    }

                );


                container.appendChild(

                    card

                );

            }

        );

}


/* =========================================================
   MARKET OVERVIEW
========================================================= */

function renderMarketOverview() {

    const stocks =

        state.dashboardStocks;


    if (

        !stocks.length

    ) return;


    const averageScore =

        stocks.reduce(

            (

                total,

                stock

            ) =>

                total +

                stock.analysis.score,

            0

        ) /

        stocks.length;


    setText(

        "market-nifty-trend",

        averageScore >= 60

            ? "Bullish"

            : averageScore <= 40

                ? "Bearish"

                : "Neutral"

    );


    setText(

        "market-banknifty-trend",

        averageScore >= 60

            ? "Bullish"

            : averageScore <= 40

                ? "Bearish"

                : "Neutral"

    );


    setText(

        "market-momentum",

        averageScore.toFixed(

            0

        ) +

        "/100"

    );


    setText(

        "market-volatility",

        "Calculated from ATR"

    );

}


/* =========================================================
   STOCK ANALYSIS UI
========================================================= */

function renderAnalysis(

    instrument,

    quote,

    indicators,

    analysis

) {

    setText(

        "analysis-stock-name",

        instrument.name ||

        instrument.trading_symbol

    );


    setText(

        "analysis-symbol",

        instrument.trading_symbol

    );


    setText(

        "analysis-price",

        formatPrice(

            quote.price

        )

    );


    const change =

        byId(

            "analysis-price-change"

        );


    if (

        change

    ) {

        change.textContent =

            `${

                quote.percent_change >= 0

                    ? "+"

                    : ""

            }${

                quote.percent_change.toFixed(

                    2

                )

            }%`;

    }


    setText(

        "analysis-signal",

        analysis.signal

    );


    setText(

        "analysis-score",

        `${

            analysis.score

        }/100`

    );


    setText(

        "analysis-entry-price",

        formatPrice(

            analysis.levels.entry

        )

    );


    setText(

        "analysis-target-price",

        formatPrice(

            analysis.levels.target

        )

    );


    setText(

        "analysis-stop-loss",

        formatPrice(

            analysis.levels.stopLoss

        )

    );


    setText(

        "analysis-exit-price",

        formatPrice(

            analysis.levels.exit

        )

    );


    setText(

        "risk-reward-ratio",

        analysis.levels.riskReward

            ? `1 : ${

                analysis.levels.riskReward.toFixed(

                    2

                )

            }`

            : "--"

    );


    setText(

        "trend-strength",

        indicators.adx !== null

            ? indicators.adx.toFixed(

                2

            )

            : "--"

    );


    const volumeRatio =

        indicators.averageVolume

            ? indicators.currentVolume /

            indicators.averageVolume

            : null;


    setText(

        "volume-strength",

        volumeRatio !== null

            ? `${

                volumeRatio.toFixed(

                    2

                )

            }x average`

            : "--"

    );


    renderIndicatorGrid(

        indicators,

        analysis

    );


    setText(

        "analysis-last-updated",

        `Last updated: ${

            new Date().toLocaleTimeString(

                "en-IN"

            )

        }`

    );


    renderChart(

        instrument,

        state.selectedCandles,

        indicators

    );

}


function renderIndicatorGrid(

    indicators,

    analysis

) {

    const grid =

        byId(

            "indicator-grid"

        );


    if (

        !grid

    ) return;


    const cards = [

        [

            "RSI",

            analysis.signals.rsi,

            indicators.rsi !== null

                ? indicators.rsi.toFixed(

                    2

                )

                : "--"

        ],

        [

            "MACD",

            analysis.signals.macd,

            indicators.macd.signal

        ],

        [

            "EMA",

            analysis.signals.ema,

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

        ],

        [

            "SMA 200",

            analysis.signals.sma,

            indicators.sma200

                ? indicators.sma200.toFixed(

                    2

                )

                : "--"

        ],

        [

            "Bollinger Bands",

            analysis.signals.bollinger,

            indicators.bollinger

                ? formatPrice(

                    indicators.bollinger.middle

                )

                : "--"

        ],

        [

            "ADX",

            analysis.signals.adx,

            indicators.adx !== null

                ? indicators.adx.toFixed(

                    2

                )

                : "--"

        ],

        [

            "Volume",

            analysis.signals.volume,

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

        ]

    ];


    grid.innerHTML = "";


    cards.forEach(

        cardData => {

            const card =

                document.createElement(

                    "div"

                );


            card.className =

                "indicator-card";


            card.innerHTML = `

                <div>

                    ${

                        cardData[0]

                    }

                </div>


                <strong>

                    ${

                        cardData[1] ||

                        "N/A"

                    }

                </strong>


                <span>

                    ${

                        cardData[2]

                    }

                </span>

            `;


            grid.appendChild(

                card

            );

        }

    );

}


/* =========================================================
   CHART
========================================================= */

function renderChart(

    instrument,

    candles,

    indicators

) {

    const modalContent =

        byId(

            "modal-content"

        );


    if (

        !modalContent

    ) return;


    modalContent.innerHTML = `

        <div class="stock-detail-header">

            <h2>

                ${

                    escapeHTML(

                        instrument.name ||

                        instrument.trading_symbol

                    )

                }

            </h2>


            <p>

                ${

                    escapeHTML(

                        instrument.trading_symbol

                    )

                }

            </p>

        </div>


        <div class="stock-detail-price">

            ${

                formatPrice(

                    state.selectedQuote.price

                )

            }

        </div>


        <div class="chart-container">

            <canvas id="stock-price-chart"></canvas>

        </div>


        <div class="chart-data-grid">

            <div>

                <span>RSI</span>

                <strong>

                    ${

                        indicators.rsi?.toFixed(

                            2

                        ) ||

                        "--"

                    }

                </strong>

            </div>


            <div>

                <span>EMA 20</span>

                <strong>

                    ${

                        indicators.ema20?.toFixed(

                            2

                        ) ||

                        "--"

                    }

                </strong>

            </div>


            <div>

                <span>EMA 50</span>

                <strong>

                    ${

                        indicators.ema50?.toFixed(

                            2

                        ) ||

                        "--"

                    }

                </strong>

            </div>


            <div>

                <span>ATR</span>

                <strong>

                    ${

                        indicators.atr?.toFixed(

                            2

                        ) ||

                        "--"

                    }

                </strong>

            </div>

        </div>

    `;


    const canvas =

        byId(

            "stock-price-chart"

        );


    if (

        !canvas

    ) return;


    const context =

        canvas.getContext(

            "2d"

        );


    const recent =

        candles.slice(

            -60

        );


    const prices =

        recent.map(

            candle => candle.close

        );


    const width =

        canvas.width =

            canvas.clientWidth *

            window.devicePixelRatio;


    const height =

        canvas.height =

            320 *

            window.devicePixelRatio;


    context.scale(

        window.devicePixelRatio,

        window.devicePixelRatio

    );


    const drawWidth =

        canvas.clientWidth;


    const drawHeight =

        320;


    const min =

        Math.min(

            ...prices

        );


    const max =

        Math.max(

            ...prices

        );


    const range =

        max -

        min || 1;


    context.beginPath();


    prices.forEach(

        (

            price,

            index

        ) => {

            const x =

                (

                    index /

                    (

                        prices.length -

                        1

                    )

                ) *

                drawWidth;


            const y =

                drawHeight -

                (

                    (

                        price -

                        min

                    ) /

                    range

                ) *

                drawHeight;


            if (

                index === 0

            ) {

                context.moveTo(

                    x,

                    y

                );

            }

            else {

                context.lineTo(

                    x,

                    y

                );

            }

        }

    );


    context.stroke();

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    $$(

        ".nav-item"

    ).forEach(

        item => {

            item.addEventListener(

                "click",

                () => {

                    const page =

                        item.dataset.page;


                    navigateTo(

                        page

                    );

                }

            );

        }

    );

}


function navigateTo(

    page

) {

    state.currentPage =

        page;


    $$(

        ".nav-item"

    ).forEach(

        item => {

            item.classList.toggle(

                "active",

                item.dataset.page ===

                page

            );

        }

    );


    $$(

        ".page-section"

    ).forEach(

        section => {

            section.classList.add(

                "hidden"

            );

        }

    );


    const target =

        byId(

            `${

                page

            }-page`

        );


    if (

        target

    ) {

        target.classList.remove(

            "hidden"

        );

    }


    const titles = {

        dashboard:

            [

                "Market Dashboard",

                "Real-time technical analysis of the Indian stock market"

            ],

        "buy-signals":

            [

                "Buy Signals",

                "Strongest bullish technical opportunities"

            ],

        "sell-signals":

            [

                "Sell Signals",

                "Stocks showing technical weakness"

            ],

        market:

            [

                "Market Overview",

                "Overall market strength and breadth"

            ],

        watchlist:

            [

                "Watchlist",

                "Your personally tracked stocks"

            ]

    };


    const title =

        titles[

            page

        ];


    if (

        title

    ) {

        setText(

            "page-title",

            title[0]

        );


        setText(

            "page-subtitle",

            title[1]

        );

    }

}


/* =========================================================
   FILTERS
========================================================= */

function setupFilters() {

    $$(

        ".filter-button"

    ).forEach(

        button => {

            button.addEventListener(

                "click",

                () => {

                    $$(

                        ".filter-button"

                    ).forEach(

                        item =>

                            item.classList.remove(

                                "active"

                            )

                    );


                    button.classList.add(

                        "active"

                    );


                    renderOpportunities(

                        button.dataset.filter

                    );

                }

            );

        }

    );

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

    byId(

        "refresh-button"

    )?.addEventListener(

        "click",

        () => {

            initializeDashboard();

        }

    );


    byId(

        "search-button"

    )?.addEventListener(

        "click",

        () => {

            const input =

                byId(

                    "stock-search"

                );


            if (

                input?.value

            ) {

                renderSearchSuggestions(

                    input.value

                );

            }

        }

    );


    byId(

        "close-analysis"

    )?.addEventListener(

        "click",

        closeAnalysis

    );

}


/* =========================================================
   MODAL
========================================================= */

function setupModal() {

    byId(

        "modal-close"

    )?.addEventListener(

        "click",

        closeModal

    );


    byId(

        "stock-modal"

    )?.addEventListener(

        "click",

        event => {

            if (

                event.target.id ===

                "stock-modal"

            ) {

                closeModal();

            }

        }

    );

}


function openModal() {

    byId(

        "stock-modal"

    )?.classList.remove(

        "hidden"

    );

}


function closeModal() {

    byId(

        "stock-modal"

    )?.classList.add(

        "hidden"

    );

}


/* =========================================================
   ANALYSIS OPEN / CLOSE
========================================================= */

function openAnalysis() {

    const section =

        byId(

            "stock-analysis-section"

        );


    if (

        section

    ) {

        section.classList.remove(

            "hidden"

        );


        section.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}


function closeAnalysis() {

    byId(

        "stock-analysis-section"

    )?.classList.add(

        "hidden"

    );

}


/* =========================================================
   WATCHLIST
========================================================= */

function loadWatchlist() {

    try {

        return JSON.parse(

            localStorage.getItem(

                "stock_screener_watchlist"

            )

        ) || [];

    }

    catch {

        return [];

    }

}


function saveWatchlist() {

    localStorage.setItem(

        "stock_screener_watchlist",

        JSON.stringify(

            state.watchlist

        )

    );

}


function renderWatchlist() {

    const container =

        byId(

            "watchlist-container"

        );


    if (

        !container

    ) return;


    if (

        !state.watchlist.length

    ) {

        container.innerHTML = `

            <div class="empty-watchlist">

                <span>☆</span>

                <h3>

                    Your watchlist is empty

                </h3>

                <p>

                    Search for a real stock and add it to your watchlist.

                </p>

            </div>

        `;


        return;

    }


    container.innerHTML = "";


    state.watchlist.forEach(

        instrument => {

            const card =

                document.createElement(

                    "div"

                );


            card.className =

                "watchlist-card";


            card.innerHTML = `

                <strong>

                    ${

                        escapeHTML(

                            instrument.trading_symbol

                        )

                    }

                </strong>


                <span>

                    ${

                        escapeHTML(

                            instrument.name

                        )

                    }

                </span>


                <button>

                    Remove

                </button>

            `;


            card.querySelector(

                "button"

            )

                .addEventListener(

                    "click",

                    () => {

                        removeFromWatchlist(

                            instrument.instrument_key

                        );

                    }

                );


            card.addEventListener(

                "click",

                event => {

                    if (

                        event.target.tagName !==

                        "BUTTON"

                    ) {

                        selectStock(

                            instrument

                        );

                    }

                }

            );


            container.appendChild(

                card

            );

        }

    );

}


function addToWatchlist(

    instrument

) {

    const exists =

        state.watchlist.some(

            item =>

                item.instrument_key ===

                instrument.instrument_key

        );


    if (

        exists

    ) {

        showToast(

            "Already in watchlist.",

            "warning"

        );


        return;

    }


    state.watchlist.push(

        {

            instrument_key:

                instrument.instrument_key,

            trading_symbol:

                instrument.trading_symbol,

            name:

                instrument.name

        }

    );


    saveWatchlist();

    renderWatchlist();

}


function removeFromWatchlist(

    instrumentKey

) {

    state.watchlist =

        state.watchlist.filter(

            item =>

                item.instrument_key !==

                instrumentKey

        );


    saveWatchlist();

    renderWatchlist();

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


    const open =

        9 *

        60 +

        15;


    const close =

        15 *

        60 +

        30;


    const isOpen =

        day >= 1 &&

        day <= 5 &&

        minutes >= open &&

        minutes <= close;


    setText(

        "market-status",

        isOpen

            ? "MARKET OPEN"

            : "MARKET CLOSED"

    );


    setText(

        "market-time",

        now.toLocaleTimeString(

            "en-IN"

        )

    );

}


setInterval(

    updateMarketStatus,

    30000

);


/* =========================================================
   LOADING
========================================================= */

function showLoading(

    message

) {

    const overlay =

        byId(

            "loading-overlay"

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

    byId(

        "loading-overlay"

    )?.classList.add(

        "hidden"

    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(

    message,

    type = "success"

) {

    const container =

        byId(

            "toast-container"

        );


    if (

        !container

    ) return;


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

        5000

    );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    byId(

        "mobile-menu-button"

    )?.addEventListener(

        "click",

        () => {

            $("#sidebar")

                ?.classList

                .toggle(

                    "open"

                );

        }

    );

}


/* =========================================================
   HELPERS
========================================================= */

function setText(

    id,

    value

) {

    const element =

        byId(

            id

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

        Number.isNaN(

            Number(

                value

            )

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


function updateLastScan() {

    const time =

        new Date().toLocaleTimeString(

            "en-IN"

        );


    setText(

        "footer-last-scan",

        time

    );


    setText(

        "dashboard-updated-time",

        time

    );

}


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
   GZIP DECOMPRESSION
========================================================= */

async function decompressGzip(

    buffer

) {

    if (

        typeof DecompressionStream ===

        "undefined"

    ) {

        throw new Error(

            "Browser does not support gzip decompression."

        );

    }


    const stream =

        new Blob(

            [

                buffer

            ]

        )

            .stream()

            .pipeThrough(

                new DecompressionStream(

                    "gzip"

                )

            );


    return await new Response(

        stream

    ).text();

}
