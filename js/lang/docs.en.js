// English documentation: translation of the <main id="docsMain"> content of docs.html
I18N.registerDocs("en", `
    <div class="docs-hero">
      <h1 class="overview-title">Documentation</h1>
      <div class="panel-sub">User guide and technical description of the “Civil Protection – Helping Berlin” dashboard</div>
    </div>

    <!-- ===================== USER GUIDE ===================== -->
    <div class="docs-part">User guide</div>

    <section class="docs-card" id="start">
      <h2>Getting started</h2>
      <p>The dashboard brings together the key information for civil protection in Berlin: weather, rain radar, official warnings, Berlin Fire Brigade incidents and water levels. The default location is Berlin.</p>
      <figure class="docs-shot">
        <img src="img/docs/uebersicht.webp" width="1440" height="900" loading="lazy" alt="Dashboard with the sidebar on the left and the overview with weather widgets">
        <figcaption>“My overview” with the default selection. On the left, the sidebar with navigation, settings and location.</figcaption>
      </figure>
      <div class="docs-grid">
        <div class="docs-tile"><strong>1. Choose a page</strong><span>Use the sidebar on the left to switch between Overview, Weather, Rain radar, Civil protection, Fire brigade and Water levels.</span></div>
        <div class="docs-tile"><strong>2. Build your overview</strong><span>On “My overview”, use “+ Widget” to show exactly the tiles you need.</span></div>
        <div class="docs-tile"><strong>3. Arrange</strong><span>Use “✥ Arrange” to move widgets and change their size. Finish with “✓ Done”.</span></div>
      </div>
      <p>All settings are saved automatically in your browser and are still there the next time you open the dashboard.</p>
    </section>

    <section class="docs-card" id="bedienung">
      <h2>Sidebar &amp; controls</h2>
      <dl class="docs-dl">
        <dt>Navigation</dt><dd>The entries at the top switch the page. The active entry is highlighted in orange.</dd>
        <dt>Documentation</dt><dd>Opens this guide in a separate window.</dd>
        <dt>Mode: Light / Dark</dt><dd>Switches the colour scheme. If you haven't chosen one, the dashboard follows your system setting.</dd>
        <dt>Language</dt><dd>The drop-down next to the colour mode switches the dashboard and the documentation to another language (currently German and English). The page reloads briefly and all settings are kept. If you haven't chosen one, the browser language is used.</dd>
        <dt>Refresh</dt><dd>Reloads weather, radar, warnings, fire brigade and water level data immediately.</dd>
        <dt>Auto refresh</dt><dd>When set to “ON”, all data is reloaded every 5 minutes. One click switches the feature off or back on.</dd>
        <dt>Location &amp; date</dt><dd>Shows the currently selected weather location as well as the date and time. Below it you can see when the data was last updated.</dd>
      </dl>
      <figure class="docs-shot">
        <img src="img/docs/uebersicht-hell.webp" width="1440" height="900" loading="lazy" alt="Overview in light colour mode">
        <figcaption>The same overview in “Light” mode.</figcaption>
      </figure>
    </section>

    <section class="docs-card" id="uebersicht">
      <h2>Overview</h2>
      <p>You can put “My overview” together however you like. On first launch it contains Current weather, Weather metrics, Forecast, Chance of rain and Temperature trend.</p>
      <ul>
        <li><strong>Add a widget:</strong> “+ Widget” opens the catalogue. Clicking an entry shows the widget.</li>
        <li><strong>Remove a widget:</strong> In arrange mode, a “×” appears in the top right corner of the widget.</li>
        <li><strong>Collapse:</strong> The arrow on the widget collapses it to its title bar. The other widgets use the freed-up space.</li>
        <li><strong>Reset:</strong> “↺ Reset” restores the default selection and arrangement after asking for confirmation.</li>
      </ul>
      <p>Widgets that show data from another page (e.g. Weather metrics) are live copies and update automatically along with it.</p>
      <figure class="docs-shot">
        <img src="img/docs/widget-katalog.webp" width="1440" height="900" loading="lazy" alt="Add widget dialog with widgets sorted by group">
        <figcaption>The “Add widget” catalogue. Widgets that are already shown have a tick, all others a “+”.</figcaption>
      </figure>
    </section>

    <section class="docs-card" id="anordnen">
      <h2>Arranging &amp; resizing</h2>
      <p>Every page has the buttons <kbd>↺ Reset</kbd>, <kbd>✥ Arrange</kbd> and <kbd>+ Widget</kbd> at the top.</p>
      <ol>
        <li>Click “✥ Arrange”. Widgets and areas get a dashed border and a handle <kbd>⋮⋮⋮</kbd> at the top.</li>
        <li>Drag the handle and drop the widget where you want it. It lands before or after the widget under the mouse pointer.</li>
        <li>On the subpages you can move every widget freely, including individual metric cards, into any row and column. If you drag a widget onto the top handle area of a column, it lands next to that column.</li>
        <li>If an area becomes empty, “Drag here” appears there as a drop zone.</li>
        <li>You change the size with the handle in the bottom right corner of the widget.</li>
        <li>“✓ Done” ends the mode. Everything is saved automatically.</li>
      </ol>
      <figure class="docs-shot">
        <img src="img/docs/anordnen.webp" width="1440" height="900" loading="lazy" alt="Weather page in arrange mode with handles and dashed areas">
        <figcaption>Arrange mode on the weather page: handles at the top of every widget and every area, resize handles in the bottom right corner.</figcaption>
      </figure>
      <p class="docs-note">The subpages have a fixed default layout. “↺ Reset” restores it after asking for confirmation, including widgets that were moved to other areas.</p>
      <figure class="docs-shot">
        <img src="img/docs/zuruecksetzen.webp" width="1440" height="900" loading="lazy" alt="Reset layout confirmation with the Cancel and Reset buttons">
        <figcaption>The confirmation before resetting. “Cancel” leaves everything as it is.</figcaption>
      </figure>
    </section>

    <section class="docs-card" id="seiten">
      <h2>The pages</h2>
      <h3>Weather</h3>
      <p>Current weather with temperature, conditions, air pressure, humidity, wind, feels-like temperature, UV index and sunrise/sunset times. On top of that there is a 6-day forecast, an hourly trend and the metrics compared with yesterday. Use the search field to choose another location, e.g. “Lisbon”. Clicking a day shows its details.</p>
      <figure class="docs-shot">
        <img src="img/docs/wetter.webp" width="1440" height="900" loading="lazy" alt="Weather page with metrics, current weather, forecast and temperature trend">
        <figcaption>Weather page: the metrics at the top, the weather panel with search, days and hourly trend on the left, the charts on the right.</figcaption>
      </figure>
      <h3>Rain radar</h3>
      <p>Interactive map showing precipitation. Search for a location or click a quick pick (Berlin, Potsdam, Munich, Hamburg). Under “Precipitation” you choose the source:</p>
      <ul>
        <li><strong>RainViewer · history:</strong> recent radar images. Play them with ▶ or browse through them with the slider. Free up to zoom level 7; beyond that the tiles are enlarged.</li>
        <li><strong>OpenWeather · current map:</strong> current precipitation map. It only works with an API key (see <a href="#entwicklung">Development</a>).</li>
      </ul>
      <figure class="docs-shot">
        <img src="img/docs/radar.webp" width="1440" height="900" loading="lazy" alt="Rain radar with a map of Berlin and Brandenburg and areas of precipitation">
        <figcaption>Rain radar with location search, quick picks, source selection, legend and a timeline for playback.</figcaption>
      </figure>
      <h3>Civil protection</h3>
      <p>Official federal warnings (MoWaS, KATWARN, BIWAPP, DWD, flood centres), filterable by location and sorted by severity. There are also the most important emergency numbers, a field for the family meeting point and an emergency checklist for supplies and equipment that you can tick off.</p>
      <figure class="docs-shot">
        <img src="img/docs/katastrophenschutz.webp" width="1440" height="900" loading="lazy" alt="Civil protection page with list of warnings, emergency numbers and family meeting point">
        <figcaption>Civil protection: warnings are labelled by status (New, Update, Cancelled) and can be filtered by location.</figcaption>
      </figure>
      <h3>Fire brigade</h3>
      <p>Fire incidents of the Berlin Fire Brigade over the last 7 days: metrics compared with the previous week, incidents per day (the peak day is orange), share of all incidents and a daily overview with fires, technical assistance and arrival time. Use “Export CSV” to download the table as a file.</p>
      <figure class="docs-shot">
        <img src="img/docs/feuerwehr.webp" width="1440" height="900" loading="lazy" alt="Fire brigade page with metrics, bar chart, share and daily table">
        <figcaption>Fire brigade page with metrics, charts and daily overview.</figcaption>
      </figure>
      <h3>Water levels</h3>
      <p>Current water levels of the federal waterways; the default is Berlin-Köpenick. You can find other gauges using the search (e.g. “Dresden”) or in the list of gauges in Berlin. The trend shows the last 7 days with the reference values MNW (mean low water), MW (mean water) and MHW (mean high water).</p>
      <figure class="docs-shot">
        <img src="img/docs/wasserpegel.webp" width="1440" height="900" loading="lazy" alt="Water levels page with metrics, water level trend and list of gauges in Berlin">
        <figcaption>Water levels: clicking a gauge in the list on the right shows its trend.</figcaption>
      </figure>
    </section>

    <section class="docs-card" id="widgets">
      <h2>Widget catalogue</h2>
      <p>You can show these widgets on the overview and on every subpage via “+ Widget”.</p>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>Group</th><th>Widget</th><th>Content</th></tr></thead>
          <tbody>
            <tr><td rowspan="6">Weather</td><td>Current weather</td><td>Temperature and conditions at the selected location</td></tr>
            <tr><td>Weather metrics</td><td>Temperature, wind, humidity and rain compared with yesterday</td></tr>
            <tr><td>Forecast · High temperature</td><td>Highs for the coming days as bars</td></tr>
            <tr><td>Chance of rain</td><td>Chance of rain for today</td></tr>
            <tr><td>Temperature trend</td><td>Hourly trend with a “now” marker</td></tr>
            <tr><td>Rain radar</td><td>Small map with the latest radar image</td></tr>
            <tr><td rowspan="6">Calendar &amp; organisation</td><td>Calendar</td><td>Month view where you can add events</td></tr>
            <tr><td>Today's events</td><td>Today's entries from the calendar</td></tr>
            <tr><td>Notes</td><td>Free-form notepad, saves automatically</td></tr>
            <tr><td>Tasks</td><td>To-do list to tick off</td></tr>
            <tr><td>Countdown</td><td>Days until a date of your choice</td></tr>
            <tr><td>World clock</td><td>Time in several cities</td></tr>
            <tr><td rowspan="4">Safety</td><td>Warnings</td><td>Official warnings (BBK/NINA), filterable by location</td></tr>
            <tr><td>Emergency checklist</td><td>Supplies and equipment to tick off</td></tr>
            <tr><td>Emergency numbers</td><td>112, 110 and other important numbers</td></tr>
            <tr><td>Family meeting point</td><td>Agreed meeting point for emergencies</td></tr>
            <tr><td rowspan="4">Fire brigade</td><td>Fire brigade metrics</td><td>Fire incidents of the last 7 days compared with the previous week</td></tr>
            <tr><td>Fire incidents per day</td><td>Bar chart of the last 7 days</td></tr>
            <tr><td>Share of fire incidents</td><td>Share of all incidents of the week</td></tr>
            <tr><td>Fire brigade daily overview</td><td>Table with fires, technical assistance and arrival time</td></tr>
            <tr><td rowspan="2">Water levels</td><td>Water level metrics</td><td>Current water level, classification and 7-day range</td></tr>
            <tr><td>Water level trend</td><td>Water level of the last 7 days with mean values</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="docs-card" id="mobil">
      <h2>Smartphone &amp; tablet</h2>
      <p>The layout adapts to the screen size and uses the full width on monitors up to 27" (2560 px). Below 760 px width:</p>
      <ul>
        <li>The sidebar becomes a header. You open the menu with the <kbd>☰</kbd> button.</li>
        <li>Widgets are stacked vertically and the page scrolls.</li>
      </ul>
      <div class="docs-shot-pair">
        <figure class="docs-shot">
          <img src="img/docs/mobil.webp" width="780" height="1688" loading="lazy" alt="Overview on a smartphone">
          <figcaption>Overview on a smartphone</figcaption>
        </figure>
        <figure class="docs-shot">
          <img src="img/docs/mobil-menue.webp" width="780" height="1688" loading="lazy" alt="Open menu on a smartphone">
          <figcaption>Open menu with all pages and settings</figcaption>
        </figure>
      </div>
    </section>

    <section class="docs-card" id="daten">
      <h2>Your data</h2>
      <p>Events, notes, tasks, checklist, meeting point, countdown, layout and colour mode are stored only in your <strong>browser's local storage</strong> (localStorage). There is no user account and no server of our own that stores this data.</p>
      <ul>
        <li>The data only applies to this browser on this device.</li>
        <li>Clearing the site data in your browser resets the dashboard completely.</li>
        <li>For weather, radar, warnings, fire brigade and water levels, the browser fetches data from public services (see <a href="#apis">Data sources</a>). Only place names or coordinates are sent.</li>
      </ul>
    </section>

    <section class="docs-card" id="hilfe">
      <h2>Troubleshooting</h2>
      <p>If a data source fails, the affected widget shows a message with the reason and a <strong>“Try again”</strong> button. Data that has already been loaded stays visible (“Showing the last available data”). After “Refresh”, the bottom of the sidebar shows in red which areas could not be updated.</p>
      <dl class="docs-dl">
        <dt>“no internet connection”</dt><dd>The device is offline. As soon as the connection is back, the dashboard reloads automatically.</dd>
        <dt>“too many requests”</dt><dd>The weather service limits many requests in a short time. Wait a minute and try again.</dd>
        <dt>“the service is not responding” / “service currently disrupted”</dt><dd>The external service is slow or down. The request is cancelled after 12 seconds and retried once automatically. Try again later.</dd>
        <dt>No warnings</dt><dd>Warnings are fetched via the server (<code>/api/warnings</code>). If you open <code>index.html</code> directly or use “Live Server”, this endpoint is missing. Start the project with <code>node dev-server.js</code> instead. “Incomplete: …” means that individual warning systems are currently unreachable.</dd>
        <dt>OpenWeather map empty</dt><dd>No API key or an invalid one has been entered. The rain radar then only works with RainViewer.</dd>
        <dt>“Map not available”</dt><dd>The Leaflet map library could not be loaded (e.g. because of an ad blocker or network filter). The rest of the dashboard keeps working.</dd>
        <dt>“Not saved”</dt><dd>The browser does not allow saving (private mode, storage full). Notes, layout and settings are then lost when you close it.</dd>
        <dt>Layout messed up</dt><dd>Click “↺ Reset” in arrange mode.</dd>
        <dt>Port already in use</dt><dd><code>dev-server.js</code> reports this and exits. Choose another port: <code>PORT=3001 node dev-server.js</code>.</dd>
      </dl>
    </section>

    <!-- ===================== TECHNICAL ===================== -->
    <div class="docs-part">Technical documentation</div>

    <section class="docs-card" id="architektur">
      <h2>Architecture &amp; files</h2>
      <p>The dashboard is a static single-page application built with HTML, CSS and vanilla JavaScript, with no build step and no framework. Only the official warnings need a small server function, because <code>warnung.bund.de</code> does not send CORS headers.</p>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>File</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>index.html</code></td><td>Structure of all pages (<code>.page</code>), sidebar, dialogs for “Add widget” and “Reset”</td></tr>
            <tr><td><code>css/style.css</code></td><td>All styles: colour variables for light/dark, sidebar, widgets, container queries, mobile view</td></tr>
            <tr><td><code>js/app.js</code></td><td>All logic: navigation, theme, data fetching, charts, widget catalogue, layout system</td></tr>
            <tr><td><code>js/i18n.js</code></td><td>Internationalisation: translation function <code>t()</code>, language detection, language drop-down</td></tr>
            <tr><td><code>js/lang/&lt;code&gt;.js</code>, <code>js/lang/docs.&lt;code&gt;.js</code></td><td>Texts of the dashboard and of the documentation per language (<code>de</code>, <code>en</code>)</td></tr>
            <tr><td><code>js/config.js</code></td><td>Optional OpenWeather key. Listed in <code>.gitignore</code>; the template is <code>js/config.example.js</code></td></tr>
            <tr><td><code>api/warnings.js</code></td><td>Serverless function (Vercel): fetches MoWaS, KATWARN, BIWAPP, DWD and LHP and returns them bundled as JSON</td></tr>
            <tr><td><code>dev-server.js</code></td><td>Local Node server: serves the files and provides <code>/api/warnings</code></td></tr>
            <tr><td><code>package.json</code>, <code>playwright.config.js</code>, <code>tests/</code></td><td>Playwright suite. Start with <code>npm test</code>, see <a href="#tests">Tests</a></td></tr>
            <tr><td><code>testresults/</code></td><td>Markdown log of the last test run, one file per test plus an overview</td></tr>
            <tr><td><code>docs.html</code>, <code>css/docs.css</code>, <code>js/docs.js</code>, <code>img/docs/</code></td><td>This documentation with screenshots (WebP, 1440 × 900 or 390 px smartphone width at double resolution)</td></tr>
            <tr><td><code>.cursor/skills/</code>, <code>.claude/skills/</code></td><td>Project skills for the AI assistant. Excluded from deployment via <code>.vercelignore</code></td></tr>
          </tbody>
        </table>
      </div>
      <h3>Flow in <code>js/app.js</code></h3>
      <ol>
        <li>Initialise the clock, navigation (<code>NAV_CATEGORIES</code>) and colour mode.</li>
        <li>Load data: <code>loadWeatherForPlace</code>, <code>loadRadar</code>, <code>loadDisasterWarnings</code>, <code>loadFireData</code>, <code>loadWaterData</code>.</li>
        <li>Build the widget boards (<code>OVERVIEW_WIDGETS</code>, <code>mountBoardWidget</code>) and apply the saved layout (<code>initLayout</code>).</li>
        <li><code>refreshDashboardData</code> reloads everything, manually or every 5 minutes (<code>AUTO_REFRESH_INTERVAL_MS</code>), and then fires the <code>dashboard-refresh</code> event.</li>
      </ol>
    </section>

    <section class="docs-card" id="entwicklung">
      <h2>Development &amp; deployment</h2>
      <h3>Running locally</h3>
      <pre><code>node dev-server.js
# → http://localhost:3000  (other port: PORT=3123 node dev-server.js)</code></pre>
      <p>No dependencies are needed, just Node.js.</p>
      <h3>OpenWeather key (optional)</h3>
      <pre><code>cp js/config.example.js js/config.js
# enter your own key in js/config.js</code></pre>
      <p class="docs-note">The key is used in the browser and is visible in the network requests. <code>js/config.js</code> must not be committed.</p>
      <h3>Deploying to Vercel</h3>
      <ul>
        <li>The static files are served directly; <code>api/warnings.js</code> runs as a serverless function at <code>/api/warnings</code>.</li>
        <li>The response is cached with <code>Cache-Control: s-maxage=60, stale-while-revalidate=300</code>.</li>
        <li><code>.vercelignore</code> excludes <code>.cursor/</code> and <code>.claude/</code> from the upload.</li>
      </ul>
      <p>The automated tests are described in the <a href="#tests">Tests</a> section.</p>
    </section>

    <section class="docs-card" id="tests">
      <h2>Tests</h2>
      <p>The UI is checked with Playwright in real Chromium. The suite starts <code>dev-server.js</code> itself on port <code>3125</code> (<code>127.0.0.1</code>) so a locally running dashboard and its <code>localStorage</code> stay untouched. Weather, radar, warnings, gauges and fire brigade data are stubbed in the tests, so no real API calls go out.</p>
      <h3>Running the suite</h3>
      <pre><code>npm install          # once: packages and Chromium
npm test             # all tests, headless
npm run test:headed  # the same tests, browser visible</code></pre>
      <p><code>npm install</code> downloads Chromium via the <code>postinstall</code> script. A single file: <code>npx playwright test tests/injection.spec.js</code>.</p>
      <p>After every run, <code>tests/markdown-reporter.js</code> writes the results to <code>testresults/</code>: <code>README.md</code> as an overview and one Markdown file per test with purpose, steps, expected result and status.</p>
      <h3>Files</h3>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>File</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>playwright.config.js</code></td><td>Port 3125, locale <code>de-DE</code>, reporters (list + Markdown)</td></tr>
            <tr><td><code>tests/helpers.js</code></td><td>Set language, open pages, add widgets, API stubs</td></tr>
            <tr><td><code>tests/dashboard.spec.js</code></td><td>Navigation, languages, theme, widget catalogue, docs, smartphone menu</td></tr>
            <tr><td><code>tests/inputs.spec.js</code></td><td>Forms, search, saving</td></tr>
            <tr><td><code>tests/injection.spec.js</code></td><td>XSS and HTML payloads in all input fields</td></tr>
            <tr><td><code>tests/stress.spec.js</code></td><td>Many clicks, long texts, many widgets</td></tr>
            <tr><td><code>tests/markdown-reporter.js</code></td><td>Writes <code>testresults/*.md</code></td></tr>
          </tbody>
        </table>
      </div>
      <h3>What the suite covers</h3>
      <h4>Dashboard and documentation</h4>
      <ul>
        <li>Language menu next to the colour mode, entries Deutsch and English.</li>
        <li>Start in German, switch to English including reload: title, navigation, overview.</li>
        <li>All six pages (Overview, Weather, Rain radar, Civil protection, Fire brigade, Water levels).</li>
        <li>Open and close the widget catalogue in German and English.</li>
        <li>Colour mode light → dark.</li>
        <li>Smartphone (390×844): navigation hidden, the menu opens the sidebar.</li>
        <li>Documentation: German texts, language switch, Internationalisation section, “Back to dashboard”.</li>
      </ul>
      <h4>Input fields</h4>
      <ul>
        <li>Empty submit on weather, radar and gauges does nothing.</li>
        <li>Place search: hit (Hamburg), unknown name, radar quick pick Potsdam.</li>
        <li>Family meeting point including special characters, save, reload.</li>
        <li>Warning filter (Dresden / no match) and ticking the checklist.</li>
        <li>Gauge search: show Dresden, unknown name as a toast.</li>
        <li>Add, tick and delete tasks; save notes; calendar event; countdown.</li>
        <li>Radar source OpenWeather and auto-refresh off.</li>
      </ul>
      <h4>Code injection</h4>
      <p>Payloads such as <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>, <code>&lt;img src=x onerror=alert(1)&gt;</code>, SVG <code>onload</code>, textarea breakout, <code>javascript:</code> URLs and template injection in the meeting point, tasks, notes, calendar, countdown, weather/radar/gauge search and the warning filter. Expected: no dialog, payload as text only, no injected <code>img</code>/<code>script</code> nodes. Place names in the radar popup are set with <code>textContent</code>, not as HTML.</p>
      <h4>Load / stress</h4>
      <ul>
        <li>Switch all pages eight times in a row.</li>
        <li>Click theme, widget catalogue and arrange mode very often.</li>
        <li>Empty forms and a 4000-character string with HTML and umlauts.</li>
        <li>40 tasks, add several widgets and remove them again.</li>
        <li>Refresh, auto-refresh and language switching repeatedly.</li>
      </ul>
    </section>

    <section class="docs-card" id="apis">
      <h2>Data sources &amp; APIs</h2>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>Area</th><th>Endpoint</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Weather</td><td><code>api.open-meteo.com/v1/forecast</code></td><td><code>forecast_days=6&amp;past_days=1</code>. The previous day is split off (<code>splitOffYesterday</code>) and used for the “compared with yesterday” comparison</td></tr>
            <tr><td>Location search</td><td><code>geocoding-api.open-meteo.com/v1/search</code></td><td>First match, language follows the selected UI language</td></tr>
            <tr><td>Radar</td><td><code>api.rainviewer.com/public/weather-maps.json</code></td><td>List of radar images, tiles as a Leaflet layer, animation every 850 ms</td></tr>
            <tr><td>Precipitation</td><td><code>tile.openweathermap.org/map/precipitation_new</code></td><td>Only with a key from <code>js/config.js</code></td></tr>
            <tr><td>Map</td><td><code>server.arcgisonline.com/…/World_Light_Gray_Base</code></td><td>Background tiles from Esri</td></tr>
            <tr><td>Warnings</td><td><code>/api/warnings</code> → <code>warnung.bund.de/api31/&lt;source&gt;/mapData.json</code></td><td>Sources: mowas, katwarn, biwapp, dwd, lhp. Timeout of 8 s per source; failed sources are listed in the <code>X-Warnings-Failed</code> header, and only if all of them fail is HTTP 502 returned</td></tr>
            <tr><td>Fire brigade</td><td><code>raw.githubusercontent.com/Berliner-Feuerwehr/BF-Open-Data/…/BFw_mission_data_daily.csv</code></td><td>Daily CSV; the last 7 days and the previous week are evaluated</td></tr>
            <tr><td>Water levels</td><td><code>www.pegelonline.wsv.de/webservices/rest-api/v2</code></td><td>Stations, current value, 7-day time series, reference values MNW/MW/MHW</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="docs-card" id="fehler">
      <h2>Error handling</h2>
      <h3>Data fetching: <code>fetchData(url, options)</code></h3>
      <p>All requests in <code>js/app.js</code> go through this function. It aborts after <code>FETCH_TIMEOUT_MS</code> (12 s) via <code>AbortController</code> and retries once on timeout, network error, HTTP 429 and 5xx (honouring <code>Retry-After</code> or after a short delay). Errors are thrown as a <code>FetchError</code> with a <code>kind</code>:</p>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th><code>kind</code></th><th>Meaning</th><th>Text from <code>describeError</code></th></tr></thead>
          <tbody>
            <tr><td><code>offline</code></td><td><code>navigator.onLine</code> is <code>false</code></td><td>no internet connection</td></tr>
            <tr><td><code>timeout</code></td><td>Aborted after timeout</td><td>the service is not responding</td></tr>
            <tr><td><code>network</code></td><td>DNS, CORS, blocked</td><td>service unreachable</td></tr>
            <tr><td><code>http</code></td><td>Status ≠ 2xx, in <code>status</code></td><td>depends on the status (429, 401/403, 404, 5xx)</td></tr>
            <tr><td><code>data</code></td><td>no valid JSON or required fields missing (<code>dataError()</code>)</td><td>response incomplete or invalid</td></tr>
          </tbody>
        </table>
      </div>
      <h3>Pattern for a loader</h3>
<pre><code>async function loadX() {
  try {
    const data = await fetchData(URL, { source: "X" });
    if (!data.items) throw dataError("X", "no entries");
    render(data);
    return true;
  } catch (err) {
    reportError("X", err);                  // console.warn with source
    renderRetry(el, \`X not available – \${describeError(err)}.\`, loadX);
    return false;                            // old data stays visible
  }
}</code></pre>
      <ul>
        <li><code>refreshDashboardData</code> uses <code>Promise.allSettled</code> and evaluates the <code>true</code>/<code>false</code> return values. Failed sources appear in <code>#refreshErrors</code> and, after a manual click, as a red toast (<code>showToast(text, "error")</code>). Parallel calls are merged.</li>
        <li>The <code>offline</code>/<code>online</code> events show a notice or start a refresh.</li>
        <li><code>storageSet(key, value)</code> replaces <code>localStorage.setItem</code> and reports once if saving is not possible.</li>
        <li>If a widget throws an exception on startup, only that widget shows an error message (<code>mountBoardWidget</code>).</li>
        <li>Without Leaflet (<code>LEAFLET_AVAILABLE</code>), a placeholder replaces <code>L</code> so that the rest of the script keeps running.</li>
        <li>Global handlers for <code>error</code> and <code>unhandledrejection</code> log unexpected errors and show a notice at most every 15 s.</li>
        <li>Server side: <code>api/warnings.js</code> responds with 405 for a wrong method and 502 as JSON, <code>dev-server.js</code> with 400/403/404/500 instead of crashing.</li>
      </ul>
    </section>

    <section class="docs-card" id="layout">
      <h2>Layout system</h2>
      <h3>Containers and elements</h3>
      <p>Every page consists of <em>containers</em> (the page itself and all classes from <code>LAYOUT_GROUP_CLASSES</code>, e.g. rows such as <code>.stat-row</code>, <code>.detail-row</code> and columns such as <code>.weather-side</code>) and <em>elements</em> (panels, metric cards, groups). Elements are identified by their <code>id</code> or an automatically assigned <code>data-layout-id</code>.</p>
      <ul>
        <li><strong>Order:</strong> <code>saveLayoutOrder</code> and <code>applySavedLayoutOrder</code> save and load the order of the elements per container.</li>
        <li><strong>Free movement:</strong> <code>startRoamDrag</code> determines the target with <code>document.elementsFromPoint</code>. Whether the element lands before or after it depends on whether the pointer is before or after the centre of the target. A <code>.stat-row</code> only accepts metric cards, the widget grid (<code>.overview-grid</code>) only added widgets. All other containers accept any element. The target container is saved in <code>dashboard-widget-places</code> unless it is the original container.</li>
        <li><strong>Empty containers</strong> get the class <code>.layout-empty</code> and appear as “Drag here” in arrange mode. Metric rows set <code>--stat-cols</code> to the number of their cards.</li>
        <li><strong>Size:</strong> In flex containers, <code>data-layout-grow</code> controls the share (minimum size 260 × 170 px). In the widget grid, <code>data-col-frac</code> (share of columns) and <code>data-row-weight</code> store the size so that it looks the same on every screen width.</li>
        <li><strong>Reset:</strong> Every container remembers its default order (<code>_defaultOrder</code>). <code>resetPageLayout</code> restores this order and deletes the saved places and sizes.</li>
      </ul>
      <h3>Scaling with container queries</h3>
      <p>Widget contents scale via CSS container queries instead of the window size: <code>.ov-body</code> (<code>ovbody</code>), metric cards (<code>statcard</code>) and charts (<code>chartcard</code>). Font sizes use <code>cqh</code>/<code>cqw</code> with <code>clamp()</code>. In very small widgets, secondary elements such as icons, labels or date lines are hidden.</p>
      <h3>Live copies (mirror widgets)</h3>
      <p>Widgets with <code>mirror</code> clone DOM parts of another page (<code>cloneForMirror</code>, IDs get a suffix) and update when the source changes. For metric rows, the copy also shows cards that have been moved elsewhere.</p>
    </section>

    <section class="docs-card" id="speicher">
      <h2>Storage keys (localStorage)</h2>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>Key</th><th>Content</th></tr></thead>
          <tbody>
            <tr><td><code>dashboard-theme</code></td><td><code>light</code> or <code>dark</code>. If the value is missing, the system setting applies</td></tr>
            <tr><td><code>dashboard-lang</code></td><td>Language code, e.g. <code>de</code> or <code>en</code>. If the value is missing, the browser language applies</td></tr>
            <tr><td><code>dashboard-auto-refresh</code></td><td>Auto refresh on/off</td></tr>
            <tr><td><code>dashboard-overview-widgets</code></td><td>Widget types on the overview</td></tr>
            <tr><td><code>dashboard-page-widgets-&lt;page&gt;</code></td><td>Additional widgets on a subpage</td></tr>
            <tr><td><code>dashboard-layout-&lt;container&gt;</code></td><td>Order of the elements in a container</td></tr>
            <tr><td><code>dashboard-layout-sizes</code></td><td>Sizes (<code>grow</code>, <code>frac</code>, <code>weight</code>) per element</td></tr>
            <tr><td><code>dashboard-widget-places</code></td><td>Elements moved to other containers: <code>{ elementId: "page:container" }</code></td></tr>
            <tr><td><code>dashboard-collapsed</code></td><td>IDs of collapsed widgets</td></tr>
            <tr><td><code>dashboard-cal-events</code></td><td>Calendar events</td></tr>
            <tr><td><code>dashboard-widget-notes</code>, <code>-todo</code>, <code>-countdown</code>, <code>-checklist</code></td><td>Contents of the respective widgets</td></tr>
            <tr><td><code>dashboard-meeting-point</code></td><td>Family meeting point</td></tr>
            <tr><td><code>dashboard-water-station</code></td><td>Selected gauge (UUID). The default is Berlin-Köpenick</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="docs-card" id="erweitern">
      <h2>Extending</h2>
      <h3>New widget</h3>
      <p>Add an entry to <code>OVERVIEW_WIDGETS</code> (<code>js/app.js</code>) and enter the title and description in every language file. The widget then appears automatically in the catalogue of every page.</p>
      <pre><code>// js/lang/de.js
"widget.my-widget.title": "Mein Widget",
"widget.my-widget.desc": "Kurze Beschreibung für den Katalog",

// js/lang/en.js
"widget.my-widget.title": "My widget",
"widget.my-widget.desc": "Short description for the catalogue",

// js/app.js
"my-widget": {
  group: "calendar",                  // group in the catalogue (key groups.calendar)
  icon: OVERVIEW_ICONS.notes,
  mount: mountMyWidget,               // or: mirror: ["#sourceElement"]
  wide: true,                         // optional: starts wider
},

function mountMyWidget(body) {
  body.innerHTML = \`&lt;div class="my-content"&gt;\${t("widget.my-widget.empty")}&lt;/div&gt;\`;
  const timer = setInterval(update, 60000);
  return () =&gt; clearInterval(timer);   // optional: clean-up on removal
}</code></pre>
      <p>Where possible, specify sizes inside the widget in container units (<code>cqh</code>, <code>cqw</code>) within <code>.ov-body</code>, so the widget scales when it is resized.</p>
      <h3>New page</h3>
      <ol>
        <li>In <code>index.html</code>, create a <code>&lt;div id="myPage" class="page"&gt;</code> with the <code>.overview-bar</code> (title and the three buttons).</li>
        <li>At the end of the page, insert the widget grid <code>&lt;div class="overview-grid" id="myPageWidgets" hidden&gt;&lt;/div&gt;</code>. The ID must be <code>&lt;page-id&gt;Widgets</code> for “+ Widget” to work.</li>
        <li>Add an entry with <code>target: "myPage"</code> and an SVG icon to <code>NAV_CATEGORIES</code>. Enter the page name as <code>nav.&lt;id&gt;</code> in every language file and mark up the visible texts of the page with <code>data-i18n</code>.</li>
        <li>Add your own rows or columns that should be arrangeable to <code>LAYOUT_GROUP_CLASSES</code>. The layout system (arranging, resetting) then picks up the page automatically on startup.</li>
      </ol>
    </section>

    <section class="docs-card" id="sprachen">
      <h2>Internationalisation</h2>
      <p>All visible texts come from language files. <code>js/i18n.js</code> picks the language in this order: saved choice (<code>dashboard-lang</code>), browser language, German. If a text is missing in a language, the German one is used.</p>
      <ul>
        <li><strong>In JavaScript:</strong> <code>t("weather.loadingFor", { place: "Berlin" })</code>. Placeholders are written in curly braces in the text.</li>
        <li><strong>In HTML:</strong> <code>data-i18n="key"</code> sets the text, <code>data-i18n-html</code> allows markup, <code>data-i18n-attr="placeholder=key;aria-label=key2"</code> translates attributes.</li>
        <li><strong>Dates and numbers</strong> use <code>I18N.locale()</code> (e.g. <code>de-DE</code>, <code>en-GB</code>) with <code>toLocaleString</code> or <code>Intl</code>.</li>
        <li>Switching the language reloads the page. A second open window (dashboard or documentation) picks up the language automatically.</li>
      </ul>
      <h3>Adding a new language</h3>
      <ol>
        <li>Copy <code>js/lang/en.js</code> to e.g. <code>js/lang/fr.js</code>, adjust the code, name and locale and translate all texts:
<pre><code>I18N.register("fr", {
  name: "Français",
  locale: "fr-FR",
  strings: {
    "nav.overview": "Aperçu",
    …
  },
});</code></pre></li>
        <li>In <code>index.html</code> and <code>docs.html</code>, add <code>&lt;script src="js/lang/fr.js"&gt;&lt;/script&gt;</code> below the other language files.</li>
        <li>Optionally translate the documentation: copy <code>js/lang/docs.en.js</code> to <code>docs.fr.js</code>, translate it and include it in <code>docs.html</code> as well. Without this file, the documentation is shown in German.</li>
      </ol>
      <p>The new language then appears automatically in the drop-down.</p>
    </section>

    <section class="docs-card" id="lizenzen">
      <h2>Licences &amp; sources</h2>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>Source</th><th>Licence / terms</th></tr></thead>
          <tbody>
            <tr><td><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></td><td>CC BY 4.0, free for non-commercial use. Location data from GeoNames (CC BY 4.0)</td></tr>
            <tr><td><a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a></td><td>Free public API with attribution</td></tr>
            <tr><td><a href="https://openweathermap.org/" target="_blank" rel="noopener">OpenWeather</a></td><td>ODbL 1.0, attribution “Weather data provided by OpenWeather”</td></tr>
            <tr><td>Esri World Light Gray Base</td><td>Esri terms of use. Attribution: Esri, HERE, Garmin, FAO, NOAA, USGS</td></tr>
            <tr><td><a href="https://github.com/Berliner-Feuerwehr/BF-Open-Data" target="_blank" rel="noopener">Berliner Feuerwehr – BF-Open-Data</a></td><td>CC BY 4.0, © Berliner Feuerwehr</td></tr>
            <tr><td><a href="https://www.pegelonline.wsv.de/" target="_blank" rel="noopener">PEGELONLINE</a> (WSV / ITZBund)</td><td>Datenlizenz Deutschland – Zero – 2.0 (Data licence Germany – Zero – 2.0)</td></tr>
            <tr><td><a href="https://warnung.bund.de/" target="_blank" rel="noopener">warnung.bund.de</a> (BBK, NINA)</td><td>No explicit licence. Source: BBK and the respective issuing authority</td></tr>
            <tr><td>Leaflet 1.9.4</td><td>BSD 2-Clause</td></tr>
            <tr><td>Inter and Fraunces fonts</td><td>SIL Open Font License 1.1</td></tr>
          </tbody>
        </table>
      </div>
      <p>Links to all licence texts can be found in <code>README.md</code>.</p>
    </section>
`);
