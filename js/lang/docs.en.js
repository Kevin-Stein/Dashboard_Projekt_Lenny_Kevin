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
      <p>Live at <a href="https://dashboard-projekt-lenny-kevin.vercel.app/" target="_blank" rel="noopener">dashboard-projekt-lenny-kevin.vercel.app</a>. To run it locally, see <code>README.md</code> or <a href="#entwicklung">Development &amp; deployment</a>.</p>
      <figure class="docs-shot">
        <img src="img/docs/uebersicht.webp" width="1440" height="900" loading="lazy" alt="Dashboard with the sidebar on the left and the overview with weather widgets">
        <figcaption>“My overview” with the default selection. On the left, the sidebar with navigation, settings and location.</figcaption>
      </figure>
      <div class="docs-grid">
        <div class="docs-tile"><strong>1. Choose a page</strong><span>Use the sidebar on the left to switch between Overview, Weather, Water levels, Fire brigade and Organisation.</span></div>
        <div class="docs-tile"><strong>2. Build your overview</strong><span>On “My overview”, use “+ Widget” to show exactly the tiles you need.</span></div>
        <div class="docs-tile"><strong>3. Arrange</strong><span>Use “✥ Arrange” to move widgets and change their size. Finish with “✓ Done”.</span></div>
      </div>
      <p>All settings are saved automatically in your browser and are still there the next time you open the dashboard.</p>
    </section>

    <section class="docs-card" id="bedienung">
      <h2>Sidebar &amp; controls</h2>
      <dl class="docs-dl">
        <dt>Navigation</dt><dd>The entries at the top switch the page. The active entry is highlighted in orange.</dd>
        <dt>Warning banner</dt><dd>In the header, between the page title and the buttons, a notice scrolls from right to left. “ACHTUNG” is always shown on the left and right (yellow and black, readable with red-green colour vision deficiency). You set the text under Organisation in the “Warning banner” widget. Without text the banner stays hidden.</dd>
        <dt>Against boredom</dt><dd>Shows game tiles. Klondike solitaire is embedded from solitaire-online.com, tic-tac-toe and the dino game from Jotform. “← Games” returns to the selection.</dd>
        <dt>Documentation</dt><dd>Opens this guide in a separate window.</dd>
        <dt>Version</dt><dd>Shows the current version number and opens the changelog.</dd>
        <dt>Settings</dt><dd>Keyboard shortcuts for Overview, Weather, Water levels, Fire brigade and Organisation. Default is 1–5. Click a key in the list and press the new key; Backspace clears it. Shortcuts do not run while a search field is focused.</dd>
        <dt>Mode: Light / Dark</dt><dd>Switches the colour scheme. If you haven't chosen one, the dashboard follows your system setting.</dd>
        <dt>Language</dt><dd>The drop-down next to the colour mode switches the dashboard and the documentation to another language (currently German and English). The page reloads briefly and all settings are kept. If you haven't chosen one, the browser language is used.</dd>
        <dt>Refresh</dt><dd>Reloads weather, radar, warnings, fire brigade and water level data. The tiles briefly show a loading state, then the button shows “updated”, then turns back into the button.</dd>
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
      <p>You can put “My overview” together however you like. On first launch it contains current weather (place, forecast and hourly trend), fire incidents per day and the water levels (trend and Berlin list in one widget).</p>
      <ul>
        <li><strong>Add a widget:</strong> “+ Widget” opens the catalogue. Clicking an entry adds the widget — even if it is already there, so you can compare (e.g. two weather places or two gauges). A number on the entry shows how often it is on the page.</li>
        <li><strong>Remove a widget:</strong> In arrange mode, a “×” appears in the top right corner of the widget.</li>
        <li><strong>Collapse:</strong> The arrow on the widget collapses it to its title bar. The other widgets use the freed-up space.</li>
        <li><strong>Reset:</strong> “↺ Reset” restores the default selection and arrangement after asking for confirmation.</li>
      </ul>
      <p>Widgets that show data from another page (e.g. Temperature or fire-brigade metrics) are live copies and update automatically along with it. Extra tiles of “Current weather” and “Water level trend” load their own data so you can compare places and gauges side by side.</p>
      <figure class="docs-shot">
        <img src="img/docs/widget-katalog.webp" width="1440" height="900" loading="lazy" alt="Add widget dialog with widgets sorted by group">
        <figcaption>The “Add widget” catalogue. Each click adds another tile; the number shows how often the widget is already on the page.</figcaption>
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
        <li>You change the size with the handle in the bottom right corner of the widget. Widgets use a standard height and only as much width as their content needs. Free space in a row appears as an “Add widget” placeholder — a click opens the catalogue, and in arrange mode you can drop widgets there. Drag the handle to make individual tiles larger or smaller.</li>
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
      <p>Current weather with temperature, conditions, air pressure, humidity, wind (speed and direction), feels-like temperature, UV index and sunrise/sunset times. On top of that there is a 6-day forecast, an hourly trend, the metrics compared with yesterday and the rain radar. Use the search field to choose another location, e.g. “Lisbon”. Clicking a day shows its details.</p>
      <figure class="docs-shot">
        <img src="img/docs/wetter.webp" width="1440" height="900" loading="lazy" alt="Weather page with metrics, current weather, forecast and temperature trend">
        <figcaption>Weather page: the metrics at the top, the weather panel with search, days and hourly trend on the left, the charts on the right.</figcaption>
      </figure>
      <p>The rain radar is on the same page. Search for a location or click a quick pick (Berlin, Potsdam, Munich, Hamburg). Under “Precipitation” you choose the source:</p>
      <ul>
        <li><strong>RainViewer · history:</strong> recent radar images. Play them with ▶ or browse through them with the slider. Free up to zoom level 7; beyond that the tiles are enlarged.</li>
        <li><strong>OpenWeather · current map:</strong> current precipitation map. It only works with an API key (see <a href="#entwicklung">Development</a>).</li>
      </ul>
      <figure class="docs-shot">
        <img src="img/docs/radar.webp" width="1440" height="900" loading="lazy" alt="Rain radar with a map of Berlin and Brandenburg and areas of precipitation">
        <figcaption>Rain radar with location search, quick picks, source selection, legend and a timeline for playback.</figcaption>
      </figure>
      <h3>Water levels</h3>
      <p>Current water levels of the federal waterways; the default is Berlin-Köpenick. You can find other gauges using the search (e.g. “Dresden”) or in the list of gauges in Berlin. The trend shows the last 7 days with the reference values MNW (mean low water), MW (mean water) and MHW (mean high water).</p>
      <figure class="docs-shot">
        <img src="img/docs/wasserpegel.webp" width="1440" height="900" loading="lazy" alt="Water levels page with metrics, water level trend and list of gauges in Berlin">
        <figcaption>Water levels: clicking a gauge in the list on the right shows its trend.</figcaption>
      </figure>
      <h3>Fire brigade</h3>
      <p>Fire incidents of the Berlin Fire Brigade over the last 7 days: metrics compared with the previous week, incidents per day (the peak day is orange), share of all incidents and a daily overview with fires, technical assistance and arrival time. Use “Export CSV” to download the table as a file.</p>
      <figure class="docs-shot">
        <img src="img/docs/feuerwehr.webp" width="1440" height="900" loading="lazy" alt="Fire brigade page with metrics, bar chart, share and daily table">
        <figcaption>Fire brigade page with metrics, charts and daily overview.</figcaption>
      </figure>
      <h3>Organisation</h3>
      <p>Official federal warnings (MoWaS, KATWARN, BIWAPP, DWD, flood centres), filterable by location and sorted by severity. There are also the most important emergency numbers, a to-do list (emergency-preparedness suggestions; entries are customisable) and the warning banner in the page header.</p>
      <figure class="docs-shot">
        <img src="img/docs/katastrophenschutz.webp" width="1440" height="900" loading="lazy" alt="Organisation page with list of warnings, emergency numbers and to-do list">
        <figcaption>Organisation: warnings are labelled by status (New, Update, Cancelled) and can be filtered by location.</figcaption>
      </figure>
    </section>

    <section class="docs-card" id="widgets">
      <h2>Widget catalogue</h2>
      <p>You can show these widgets on the overview and on every subpage via “+ Widget”. The same type may appear more than once; weather and water-level tiles then each have their own search.</p>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>Group</th><th>Widget</th><th>Content</th></tr></thead>
          <tbody>
            <tr><td rowspan="9">Weather</td><td>Current weather</td><td>Place, search, forecast and hourly trend</td></tr>
            <tr><td>Temperature</td><td>Current temperature compared with yesterday</td></tr>
            <tr><td>Wind</td><td>Wind speed and direction compared with yesterday</td></tr>
            <tr><td>Humidity</td><td>Relative humidity compared with yesterday</td></tr>
            <tr><td>Chance of rain today</td><td>Chance of rain for today compared with yesterday</td></tr>
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
            <tr><td>Warning banner</td><td>Scrolling notice in the header, with “ACHTUNG” on the left and right</td></tr>
            <tr><td>To-do list</td><td>Customisable list, entries stacked, suggestions based on the BBK</td></tr>
            <tr><td>Emergency numbers</td><td>112, 110 and other important numbers</td></tr>
            <tr><td rowspan="8">Fire brigade</td><td>Fires the previous day</td><td>Number of fire incidents on the latest reported day</td></tr>
            <tr><td>Fire incidents (7 days)</td><td>Total of the last 7 days compared with the previous week</td></tr>
            <tr><td>Ø per day</td><td>Average number of fire incidents per day</td></tr>
            <tr><td>Peak day</td><td>Day with the most fire incidents</td></tr>
            <tr><td>Arrival time of 1st fire engine</td><td>Average arrival time of the first fire engine</td></tr>
            <tr><td>Fire incidents per day</td><td>Bar chart of the last 7 days</td></tr>
            <tr><td>Share of fire incidents</td><td>Share of all incidents of the week</td></tr>
            <tr><td>Fire brigade daily overview</td><td>Table with fires, technical assistance and arrival time</td></tr>
            <tr><td rowspan="6">Water levels</td><td>Water level</td><td>Current gauge reading, default Berlin-Köpenick</td></tr>
            <tr><td>Classification</td><td>Classification against mean water</td></tr>
            <tr><td>Range 7 days</td><td>Lowest and highest water level of the last 7 days</td></tr>
            <tr><td>Latest measurement</td><td>Time of the latest gauge reading</td></tr>
            <tr><td>Water level trend</td><td>7-day trend and current Berlin gauges</td></tr>
            <tr><td>Gauges in Berlin</td><td>Current water levels of Berlin gauges</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="docs-card" id="mobil">
      <h2>Smartphone &amp; tablet</h2>
      <p>The layout adapts to the screen size and uses the full width. Below 760 px width:</p>
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
      <p>Events, notes, tasks, checklist, countdown, layout and colour mode are stored only in your <strong>browser's local storage</strong> (localStorage). There is no user account and no server of our own that stores this data.</p>
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
        <dt>OpenWeather map empty</dt><dd>No key is set. On Vercel add the <code>OPENWEATHER_KEY</code> variable, locally <code>js/config.js</code> or the same variable. The rain radar then only works with RainViewer.</dd>
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
      <p>The dashboard is a static single-page application built with HTML, CSS and vanilla JavaScript, with no build step and no framework. Official warnings and OpenWeather tiles need a small server function: <code>warnung.bund.de</code> does not send CORS headers, and the OpenWeather key should not sit in the browser.</p>
      <div class="docs-table-wrap">
        <table class="docs-table">
          <thead><tr><th>File</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>index.html</code></td><td>Structure of all pages (<code>.page</code>), sidebar, dialogs for “Add widget” and “Reset”</td></tr>
            <tr><td><code>css/style.css</code></td><td>All styles: colour variables for light/dark, sidebar, widgets, container queries, mobile view</td></tr>
            <tr><td><code>js/app.js</code></td><td>All logic: navigation, theme, data fetching, charts, widget catalogue, layout system</td></tr>
            <tr><td><code>js/i18n.js</code></td><td>Internationalisation: translation function <code>t()</code>, language detection, language drop-down</td></tr>
            <tr><td><code>js/lang/&lt;code&gt;.js</code>, <code>js/lang/docs.&lt;code&gt;.js</code></td><td>Texts of the dashboard and of the documentation per language (<code>de</code>, <code>en</code>)</td></tr>
            <tr><td><code>js/config.js</code></td><td>Optional OpenWeather key for the local fallback. Listed in <code>.gitignore</code>; the template is <code>js/config.example.js</code>. On Vercel the <code>OPENWEATHER_KEY</code> variable is used</td></tr>
            <tr><td><code>api/warnings.js</code></td><td>Serverless function (Vercel): fetches MoWaS, KATWARN, BIWAPP, DWD and LHP and returns them bundled as JSON</td></tr>
            <tr><td><code>api/radar.js</code></td><td>Serverless function: serves OpenWeather precipitation tiles; the key stays on the server</td></tr>
            <tr><td><code>dev-server.js</code></td><td>Local Node server: serves the files and provides <code>/api/warnings</code> and <code>/api/radar</code></td></tr>
            <tr><td><code>package.json</code>, <code>playwright.config.js</code>, <code>tests/</code></td><td>Playwright suite. Start with <code>npm test</code>, see <a href="#tests">Tests</a></td></tr>
            <tr><td><code>testresults/</code></td><td>Markdown log of the last test run, one file per test plus an overview</td></tr>
            <tr><td><code>docs.html</code>, <code>css/docs.css</code>, <code>js/docs.js</code>, <code>img/docs/</code></td><td>This documentation with screenshots (WebP, 1440 × 900 or 390 px smartphone width at double resolution)</td></tr>
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
      <h3>Prerequisites</h3>
      <p>To run it: <strong>Node.js 18 or newer</strong> (LTS from <a href="https://nodejs.org/" target="_blank" rel="noopener">nodejs.org</a>, includes npm) and <strong>Git</strong> to clone. Check with <code>node -v</code>, <code>npm -v</code>. Install commands are in <code>README.md</code>.</p>
      <h3>Running locally</h3>
      <pre><code>git clone https://github.com/Kevin-Stein/Dashboard_Projekt_Lenny_Kevin.git
cd Dashboard_Projekt_Lenny_Kevin
node dev-server.js
# → http://localhost:3000  (other port: PORT=3123 node dev-server.js)</code></pre>
      <p><code>npm install</code> is not required to start. The Playwright tests additionally need the packages from <code>package.json</code> (Chromium comes with <code>npm install</code>).</p>
      <h3>OpenWeather key (optional)</h3>
      <p>On Vercel under <strong>Settings → Environment Variables</strong> set <code>OPENWEATHER_KEY</code> (Production and Preview). The tiles go through <code>/api/radar</code>, so the key does not appear in the browser.</p>
      <p>Locally use the same key as an environment variable or in <code>js/config.js</code> (template: <code>js/config.example.js</code>). <code>js/config.js</code> must not be committed. Opening <code>index.html</code> directly without <code>dev-server.js</code> only has this fallback, and then the key is visible in the network requests.</p>
      <pre><code>cp js/config.example.js js/config.js
# enter your own key
# or: OPENWEATHER_KEY=… node dev-server.js</code></pre>
      <h3>Deploying to Vercel</h3>
      <p>Public instance: <a href="https://dashboard-projekt-lenny-kevin.vercel.app/" target="_blank" rel="noopener">https://dashboard-projekt-lenny-kevin.vercel.app/</a></p>
      <ul>
        <li>The static files are served directly; <code>api/warnings.js</code> and <code>api/radar.js</code> run as serverless functions at <code>/api/warnings</code> and <code>/api/radar</code>.</li>
        <li>The response is cached with <code>Cache-Control: s-maxage=60, stale-while-revalidate=300</code>.</li>
        <li><code>.vercelignore</code> excludes local folders such as <code>.cursor/</code> and <code>.claude/</code> from the upload, if they are present.</li>
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
        <li>All five pages (Overview, Weather including rain radar, Water levels, Fire brigade, Organisation) and keyboard shortcuts 1–5.</li>
        <li>Open and close the widget catalogue in German and English.</li>
        <li>Against boredom: game tiles, Klondike, tic-tac-toe and dino game.</li>
        <li>Add the same widget more than once (weather and gauges with their own search).</li>
        <li>Colour mode light → dark.</li>
        <li>Smartphone (390×844): navigation hidden, the menu opens the sidebar.</li>
        <li>Documentation: German texts, language switch, Internationalisation section, “Back to dashboard”.</li>
      </ul>
      <h4>Input fields</h4>
      <ul>
        <li>Empty submit on weather, radar and gauges does nothing.</li>
        <li>Place search: hit (Hamburg), unknown name, radar quick pick Potsdam.</li>
        <li>Emergency numbers and to-do list on the civil protection page.</li>
        <li>Warning filter (Dresden / no match) and ticking the checklist.</li>
        <li>Gauge search: show Dresden, unknown name as a toast.</li>
        <li>Add, tick and delete tasks; save notes; calendar event; countdown.</li>
        <li>Radar source OpenWeather and auto-refresh off.</li>
      </ul>
      <h4>Code injection</h4>
      <p>Payloads such as <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>, <code>&lt;img src=x onerror=alert(1)&gt;</code>, SVG <code>onload</code>, textarea breakout, <code>javascript:</code> URLs and template injection in tasks, notes, calendar, countdown, weather/radar/gauge search and the warning filter. Expected: no dialog, payload as text only, no injected <code>img</code>/<code>script</code> nodes. Place names in the radar popup are set with <code>textContent</code>, not as HTML.</p>
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
            <tr><td>Precipitation</td><td><code>/api/radar</code> → <code>tile.openweathermap.org/map/precipitation_new</code></td><td>Key via Vercel <code>OPENWEATHER_KEY</code> or local <code>js/config.js</code>. Without the server the browser falls back to the key in <code>js/config.js</code></td></tr>
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
      <p>Every page has one shared widget area: the <code>.overview-grid</code>. Native tiles and extra widgets live there. Arrange mode moves and resizes only inside that grid.</p>
      <ul>
        <li><strong>Order:</strong> <code>saveLayoutOrder</code> and <code>applySavedLayoutOrder</code> save and load the tile order in the grid.</li>
        <li><strong>Free movement:</strong> <code>startRoamDrag</code> finds the drop target in the grid with <code>document.elementsFromPoint</code>. Whether the element lands before or after it depends on whether the pointer is before or after the centre of the target.</li>
        <li><strong>Size:</strong> The default width follows the content. In arrange mode the bottom-right handle stores pixel sizes (<code>data-layout-h</code>, <code>data-layout-w</code>, minimum 260 × 170 px).</li>
        <li><strong>Reset:</strong> The grid remembers its default order (<code>_defaultOrder</code>). <code>resetPageLayout</code> restores it, clears saved sizes, and on the overview remounts the default widgets (current weather, fire chart, water chart) instead of emptying the board.</li>
      </ul>
      <h3>Scaling with container queries</h3>
      <p>Widget contents scale via CSS container queries instead of the window size: <code>.ov-body</code> (<code>ovbody</code>), metric cards (<code>statcard</code>) and charts (<code>chartcard</code>). Font sizes use <code>cqh</code>/<code>cqw</code> with <code>clamp()</code>. In very small widgets, secondary elements such as icons, labels or date lines are hidden.</p>
      <h3>Live copies (mirror widgets)</h3>
      <p>Widgets with <code>source</code> clone the complete panel from another page (same heading and content). <code>mirror</code> clones fragments only (e.g. metric rows). IDs get a suffix so they stay unique.</p>
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
            <tr><td><code>dashboard-layout-sizes</code></td><td>Sizes (<code>height</code>, <code>width</code>, <code>frac</code>, and possibly older <code>grow</code>) per element</td></tr>
            <tr><td><code>dashboard-widget-places</code></td><td>Elements moved to other containers: <code>{ elementId: "page:container" }</code></td></tr>
            <tr><td><code>dashboard-collapsed</code></td><td>IDs of collapsed widgets</td></tr>
            <tr><td><code>dashboard-cal-events</code></td><td>Calendar events</td></tr>
            <tr><td><code>dashboard-banner-text</code></td><td>Scrolling text of the warning banner</td></tr>
            <tr><td><code>dashboard-widget-notes</code>, <code>-todo</code>, <code>-countdown</code>, <code>-checklist</code></td><td>Contents of the respective widgets</td></tr>
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
        <li>Put the widget grid <code>&lt;div class="overview-grid" id="myPageWidgets"&gt;</code> directly under the bar and place the default tiles inside it. The ID must be <code>&lt;page-id&gt;Widgets</code> for “+ Widget” to work.</li>
        <li>Add an entry with <code>target: "myPage"</code> and an SVG icon to <code>NAV_CATEGORIES</code>. Enter the page name as <code>nav.&lt;id&gt;</code> in every language file and mark up the visible texts of the page with <code>data-i18n</code>.</li>
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
            <tr><td><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></td><td><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, free for non-commercial use (<a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener">terms</a>). Location data from <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> (CC BY 4.0)</td></tr>
            <tr><td><a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a></td><td>Free public API with attribution (<a href="https://www.rainviewer.com/terms.html" target="_blank" rel="noopener">terms</a>)</td></tr>
            <tr><td><a href="https://openweathermap.org/" target="_blank" rel="noopener">OpenWeather</a></td><td><a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL 1.0</a>, attribution “Weather data provided by OpenWeather” (<a href="https://openweathermap.org/terms" target="_blank" rel="noopener">terms</a>)</td></tr>
            <tr><td><a href="https://www.arcgis.com/home/item.html?id=ed712cb1db3e4bae9e85329040fb9a49" target="_blank" rel="noopener">Esri World Light Gray Base</a></td><td><a href="https://www.esri.com/en-us/legal/terms/full-master-agreement" target="_blank" rel="noopener">Esri terms of use</a>. Attribution: Esri, HERE, Garmin, FAO, NOAA, USGS</td></tr>
            <tr><td><a href="https://github.com/Berliner-Feuerwehr/BF-Open-Data" target="_blank" rel="noopener">Berliner Feuerwehr – BF-Open-Data</a></td><td><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, © Berliner Feuerwehr</td></tr>
            <tr><td><a href="https://www.pegelonline.wsv.de/" target="_blank" rel="noopener">PEGELONLINE</a> (WSV / ITZBund)</td><td><a href="https://www.govdata.de/dl-de/zero-2-0" target="_blank" rel="noopener">Datenlizenz Deutschland – Zero – 2.0</a></td></tr>
            <tr><td><a href="https://warnung.bund.de/" target="_blank" rel="noopener">warnung.bund.de</a> (BBK, NINA)</td><td>No explicit licence. Source: BBK and the respective issuing authority</td></tr>
            <tr><td><a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet 1.9.4</a></td><td><a href="https://github.com/Leaflet/Leaflet/blob/main/LICENSE" target="_blank" rel="noopener">BSD 2-Clause</a></td></tr>
            <tr><td><a href="https://fonts.google.com/specimen/Outfit" target="_blank" rel="noopener">Outfit</a>, <a href="https://fonts.google.com/specimen/Source+Sans+3" target="_blank" rel="noopener">Source Sans 3</a></td><td><a href="https://openfontlicense.org/" target="_blank" rel="noopener">SIL Open Font License 1.1</a></td></tr>
          </tbody>
        </table>
      </div>
    </section>
`);
