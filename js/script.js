/**
 * Flight Path Parser JavaScript
 * This script implements the functionality of the Flight Path Parser application
 * which is based on the flightPathParserV2.py Python script.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const jsonInput = document.getElementById('json-data');
    const jsonFileInput = document.getElementById('json-file');
    const dropZone = document.getElementById('drop-zone');
    const formatBtn = document.getElementById('format-json');
    const clearBtn = document.getElementById('clear-json');
    const fileMeta = document.getElementById('file-meta');
    const parseButton = document.getElementById('parse-button');
    const functionalityOptions = document.querySelectorAll('input[name="functionality"]');
    const fieldInput = document.getElementById('field-input');
    const bomInput = document.getElementById('bom-input');
    const fieldName = document.getElementById('field-name'); // textarea now
    const bomId = document.getElementById('bom-id'); // textarea now
    const useRegexField = document.getElementById('use-regex');
    const caseSensitiveField = document.getElementById('case-sensitive');
    const useRegexBom = document.getElementById('use-regex-bom');
    const caseSensitiveBom = document.getElementById('case-sensitive-bom');
    const topNSelect = document.getElementById('top-n');
    const minThresholdInput = document.getElementById('min-threshold');
    const errorMessage = document.getElementById('error-message');
    const elapsedTimeResults = document.getElementById('elapsed-time-results');
    const trackerResults = document.getElementById('tracker-results');
    const trackerTitle = document.getElementById('tracker-title');
    const elapsedTimeTable = document.getElementById('elapsed-time-table').querySelector('tbody');
    const trackerTable = document.getElementById('tracker-table').querySelector('tbody');
    const inputsContainer = document.getElementById('inputs-container');
    const inputsDisplay = document.getElementById('inputs-display');
    const elapsedControls = document.getElementById('elapsed-controls');
    const elapsedSearch = document.getElementById('elapsed-search');
    const trackerSearch = document.getElementById('tracker-search');
    const elapsedSummary = document.getElementById('elapsed-summary');
    const themeToggle = document.getElementById('theme-toggle');
    
    // CSV Download Buttons (will be created dynamically)
    // CodeMirror editor
    let cm = null;
    if (window.CodeMirror && jsonInput) {
        cm = window.CodeMirror.fromTextArea(jsonInput, {
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            tabSize: 2,
            indentUnit: 2,
            lineWrapping: true,
            theme: getCurrentTheme() === 'dark' ? 'material-darker' : 'default',
            // Enable search with ctrl+f
            extraKeys: {
                "Ctrl-F": "findPersistent",
                "Cmd-F": "findPersistent",
                "Esc": "clearSearch"
            }
        });
        cm.on('change', debounce(() => {
            liveValidate();
        }, 400));
    }

    // Theme handling
    initTheme();
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = getCurrentTheme();
            const next = current === 'dark' ? 'light' : 'dark';
            setTheme(next);
            if (cm) cm.setOption('theme', next === 'dark' ? 'material-darker' : 'default');
        });
    }

    // Show/hide conditional inputs based on selected functionality
    functionalityOptions.forEach(option => {
        option.addEventListener('change', () => {
            updateInputFields();
        });
    });

    // Parse button click handler
    parseButton.addEventListener('click', () => {
        // Clear previous results and errors
        clearResults();
        
        // Get the JSON data
        const { ok, data, message } = getJsonData();
        if (!ok) {
            showError(message || 'Invalid JSON data. Please check your input.');
            return;
        }

        // Get selected functionality
        const selectedFunctionality = document.querySelector('input[name="functionality"]:checked').value;

        // Process based on selected functionality
        switch (selectedFunctionality) {
            case '1':
                processElapsedTimeCalculator(data);
                break;
            case '2':
                const fieldSearch = buildSearchOptions(fieldName.value, useRegexField?.checked, caseSensitiveField?.checked);
                if (!fieldSearch.valid) {
                    showError(fieldSearch.error || 'Please enter a valid Field search.');
                    return;
                }
                processFieldTracker(data, fieldSearch);
                break;
            case '3':
                const bomSearch = buildSearchOptions(bomId.value, useRegexBom?.checked, caseSensitiveBom?.checked);
                if (!bomSearch.valid) {
                    showError(bomSearch.error || 'Please enter a valid BOM search.');
                    return;
                }
                processBomItemTracker(data, bomSearch);
                break;
        }
    });

    // File upload
    if (jsonFileInput) {
        jsonFileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            readJsonFile(file);
        });
    }
    // Drag & drop
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        }));
        ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        }));
        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file) readJsonFile(file);
        });
        // keyboard: pressing Enter opens file picker
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                jsonFileInput?.click();
            }
        });
    }
    // Format and clear buttons
    if (formatBtn) formatBtn.addEventListener('click', formatJson);
    if (clearBtn) clearBtn.addEventListener('click', () => setEditorText(''));

    // Function to update input fields based on selected functionality
    function updateInputFields() {
        const selectedFunctionality = document.querySelector('input[name="functionality"]:checked').value;
        
        // Hide all conditional inputs first
        fieldInput.classList.add('hidden');
        bomInput.classList.add('hidden');
        elapsedControls?.classList.add('hidden');
        
        // Show relevant input based on selection
        if (selectedFunctionality === '2') {
            fieldInput.classList.remove('hidden');
        } else if (selectedFunctionality === '3') {
            bomInput.classList.remove('hidden');
        } else if (selectedFunctionality === '1') {
            elapsedControls?.classList.remove('hidden');
        }
    }

    // Function to process Elapsed Time Calculator
    function processElapsedTimeCalculator(data) {
        // Show elapsed time results and hide tracker results
        elapsedTimeResults.classList.remove('hidden');
        trackerResults.classList.add('hidden');
        
        // Process data to calculate rule times (similar to Python version)
        const ruleTimes = {};
        const ruleCounts = {};
        
        try {
            for (const item of data) {
                for (const thing of item) {
                    const ruleName = thing.ruleVariableName;
                    const elapsedTime = thing.elapsedTime;
                    
                    if (ruleName && elapsedTime !== undefined) {
                        if (ruleTimes[ruleName]) {
                            ruleTimes[ruleName] += elapsedTime;
                        } else {
                            ruleTimes[ruleName] = elapsedTime;
                        }
                        ruleCounts[ruleName] = (ruleCounts[ruleName] || 0) + 1;
                    }
                }
            }
            
            // Convert to array and apply threshold
            let rows = Object.entries(ruleTimes).map(([rule, time]) => ({
                'Rule Variable Name': rule,
                'Total Elapsed Time': time,
                'Occurrences': ruleCounts[rule] || 0
            }));

            // Threshold filter
            const minThreshold = Number(minThresholdInput?.value || 0) || 0;
            if (minThreshold > 0) {
                rows = rows.filter(r => r['Total Elapsed Time'] >= minThreshold);
            }
            // Sort by time desc
            rows.sort((a, b) => b['Total Elapsed Time'] - a['Total Elapsed Time']);

            // Top N
            const topN = Number(topNSelect?.value || 10) || 10;
            const topRows = rows.slice(0, topN);
            
            // Display results in table
            elapsedTimeTable.innerHTML = '';
            if (topRows.length === 0) {
                showError('No rule time data found in the JSON.');
                return;
            }
            
            // Save current dataset for sorting/filtering
            state.elapsed.rows = rows; // full set
            state.elapsed.sort = { col: 1, dir: 'desc' }; // default sort by time
            renderElapsedTable();
            
            // Create download button
            createDownloadButton(
                elapsedTimeResults.querySelector('.download-container'),
                () => getElapsedCsvData(),
                ['Rule Variable Name', 'Total Elapsed Time', 'Occurrences'],
                'elapsed_time_results.csv'
            );

            // Update summary and heading
            updateElapsedSummary(rows);
            const h3 = elapsedTimeResults.querySelector('h3');
            if (h3) h3.textContent = `Top ${topN} Rules by Elapsed Time`;
        } catch (error) {
            showError(`Error processing data: ${error.message}`);
        }
    }

    // Function to process Field Tracker
    function processFieldTracker(data, fieldSearch) {
        processTracker(data, fieldSearch, 'Field');
    }

    // Function to process BOM Item Tracker
    function processBomItemTracker(data, bomSearch) {
        processTracker(data, bomSearch, 'BOM Item');
    }

    // Common function to process both Field and BOM Item tracking
    function processTracker(data, searchOptions, trackerType) {
        // Show tracker results and hide elapsed time results
        elapsedTimeResults.classList.add('hidden');
        trackerResults.classList.remove('hidden');
        trackerTitle.textContent = `${trackerType} Information`;
        
        // List to store matching field/BOM items
        const fieldRuleList = [];
        
        try {
            // Loop through JSON (similar to Python version)
            for (const item of data) {
                for (const thing of item) {
                    const changesList = thing.changes || [];
                    for (const changeItem of changesList) {
                        const identifier = changeItem.identifier;
                        
                        // If the identifier matches searchOptions
                        if (identifier && matchesSearch(identifier, searchOptions)) {
                            const inputList = thing.inputs;
                            const ruleName = thing.ruleVariableName;
                            const executionTime = thing.executionTime;
                            const actionName = thing.actionVariableName;
                            const source = changeItem.source;
                            const event = changeItem.event;
                            const type = changeItem.type;
                            const oldValue = changeItem.oldValue;
                            const newValue = changeItem.newValue;
                            
                            fieldRuleList.push({
                                identifier,
                                ruleName,
                                executionTime,
                                actionName,
                                inputList,
                                source,
                                event,
                                type,
                                oldValue,
                                newValue
                            });
                        }
                    }
                }
            }
            
            // Display results
            trackerTable.innerHTML = '';
            if (fieldRuleList.length === 0) {
                showError(`${trackerType} not found in JSON.`);
                inputsContainer.classList.add('hidden');
                return;
            }
            
            // Save and render with sorting/filtering
            state.tracker.rows = fieldRuleList;
            state.tracker.view = fieldRuleList.slice();
            state.tracker.sort = { col: 0, dir: 'asc' };
            renderTrackerTable();
            
            // Create download button
            const fileName = trackerType === 'Field' ? 'field_tracker_results.csv' : 'bom_item_results.csv';
            const csvHeaders = [
                'Identifier', 'Rule Name', 'Execution Time', 'Action Name',
                'Source', 'Event', 'Type', 'Old Value', 'New Value', 'Inputs'
            ];
            
            createDownloadButton(
                trackerResults.querySelector('.download-container'),
                () => getTrackerCsvData(),
                csvHeaders,
                fileName
            );
            
        } catch (error) {
            showError(`Error processing data: ${error.message}`);
        }
    }

    // Function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // Function to hide error message
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
    }

    // Function to clear all results
    function clearResults() {
        elapsedTimeTable.innerHTML = '';
        trackerTable.innerHTML = '';
        inputsDisplay.textContent = '';
        inputsContainer.classList.add('hidden');
        hideError();
        
        // Remove any existing download buttons
        const existingDownloadButtons = document.querySelectorAll('.download-csv-btn');
        existingDownloadButtons.forEach(btn => btn.remove());
        // Clear table state
        state.elapsed = { rows: [], view: [], sort: null, filters: {}, search: '' };
        state.tracker = { rows: [], view: [], sort: null, filters: {}, search: '' };
    }
    
    // Function to convert results to CSV format
    function convertToCSV(data, headers) {
        if (!data || data.length === 0) return '';
        
        // Create header row
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                // Get the value for this header
                const value = row[header] !== undefined ? row[header] : '';
                // Handle values that contain commas, quotes, or newlines
                const escapedValue = typeof value === 'string' 
                    ? '"' + value.replace(/"/g, '""') + '"' 
                    : value;
                return escapedValue;
            });
            csvContent += values.join(',') + '\n';
        });
        
        return csvContent;
    }
    
    // Function to download CSV file
    function downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Function to create download button
    function createDownloadButton(container, dataOrGetter, headers, fileName) {
        // Remove any existing button in this container first
        const existingBtn = container.querySelector('.download-csv-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // Create button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download as CSV';
        downloadBtn.className = 'download-csv-btn';
        downloadBtn.addEventListener('click', () => {
            const data = typeof dataOrGetter === 'function' ? dataOrGetter() : dataOrGetter;
            const csvContent = convertToCSV(data, headers);
            downloadCSV(csvContent, fileName);
        });
        
        // Add button to container
        container.appendChild(downloadBtn);
    }

    // Initialize the page
    updateInputFields();
    initTableInteractions();
    initFiltersAndSearch();

    // ---------------- Helper functions ----------------
    function getJsonText() {
        return cm ? cm.getValue() : (jsonInput?.value || '');
    }
    function setEditorText(text) {
        if (cm) cm.setValue(text);
        else if (jsonInput) jsonInput.value = text;
    }
    function getJsonData() {
        try {
            const txt = getJsonText();
            const data = JSON.parse(txt);
            hideError();
            return { ok: true, data };
        } catch (err) {
            const loc = extractJsonErrorPosition(err?.message || '');
            const msg = loc ? `Invalid JSON at line ${loc.line}, column ${loc.col}` : 'Invalid JSON data. Please check your input.';
            return { ok: false, message: msg };
        }
    }
    function formatJson() {
        const txt = getJsonText();
        try {
            const obj = JSON.parse(txt);
            setEditorText(JSON.stringify(obj, null, 2));
            hideError();
        } catch (err) {
            const loc = extractJsonErrorPosition(err?.message || '');
            showError(loc ? `Cannot format. JSON error at line ${loc.line}, column ${loc.col}` : 'Cannot format. Invalid JSON.');
        }
    }
    function readJsonFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            setEditorText(String(reader.result || ''));
            fileMeta.textContent = `${file.name} (${formatBytes(file.size)})`;
            liveValidate();
        };
        reader.onerror = () => showError('Failed to read file.');
        reader.readAsText(file);
    }
    function liveValidate() {
        // Debounced above; try-parse and show inline error
        const txt = getJsonText();
        if (!txt.trim()) { hideError(); return; }
        try {
            JSON.parse(txt);
            hideError();
        } catch (err) {
            const loc = extractJsonErrorPosition(err?.message || '');
            showError(loc ? `Invalid JSON at line ${loc.line}, column ${loc.col}` : 'Invalid JSON data.');
        }
    }
    function extractJsonErrorPosition(message) {
        // V8-style: Unexpected token ... in JSON at position 123
        const m = message.match(/position\s(\d+)/i);
        if (!m) return null;
        const pos = Number(m[1]);
        const text = getJsonText();
        let line = 1, col = 1;
        for (let i = 0; i < pos && i < text.length; i++) {
            if (text[i] === '\n') { line++; col = 1; } else { col++; }
        }
        return { line, col };
    }
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
    function debounce(fn, wait) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
    }
    function buildSearchOptions(value, useRegex, caseSensitive) {
        const raw = (value || '').trim();
        if (!raw) return { valid: false, error: 'Please enter at least one value.' };
        if (useRegex) {
            try {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(raw, flags);
                return { valid: true, regex, useRegex: true, caseSensitive: !!caseSensitive };
            } catch (e) {
                return { valid: false, error: 'Invalid regular expression.' };
            }
        } else {
            const terms = raw.split(/\n|,/).map(s => s.trim()).filter(Boolean);
            if (terms.length === 0) return { valid: false, error: 'Please enter at least one value.' };
            return { valid: true, terms, useRegex: false, caseSensitive: !!caseSensitive };
        }
    }
    function matchesSearch(text, opts) {
        if (!opts || !opts.valid) return false;
        if (opts.useRegex) {
            opts.regex.lastIndex = 0;
            return opts.regex.test(text);
        }
        if (!opts.caseSensitive) {
            const t = String(text).toLowerCase();
            return opts.terms.some(v => t.includes(v.toLowerCase()));
        }
        const t = String(text);
        return opts.terms.some(v => t.includes(v));
    }

    // ---------- Table state, rendering, sorting and filtering ----------
    const state = {
        elapsed: { rows: [], view: [], sort: null, filters: {}, search: '' },
        tracker: { rows: [], view: [], sort: null, filters: {}, search: '' }
    };

    function renderElapsedTable() {
        const table = document.getElementById('elapsed-time-table');
        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        // add sortable headers and resize handles
        const headerCells = thead.querySelectorAll('tr:first-child th');
        headerCells.forEach((th, idx) => {
            th.classList.add('sortable');
            th.dataset.colIndex = String(idx);
        });
        applyColumnResize(thead);

        // Apply filters and search
        const filtered = filterAndSearch(state.elapsed.rows, state.elapsed.filters, state.elapsed.search, ['Rule Variable Name','Total Elapsed Time','Occurrences']);
        // Apply sort
        const sorted = sortRows(filtered, state.elapsed.sort, ['Rule Variable Name','Total Elapsed Time','Occurrences']);
        const topN = Number(topNSelect?.value || 10) || 10;
        const limited = sorted.slice(0, topN);
        state.elapsed.view = limited;
        // Render
        tbody.innerHTML = '';
        limited.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r['Rule Variable Name']}</td>
                <td>${r['Total Elapsed Time']}</td>
                <td>${r['Occurrences']}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTrackerTable() {
        const table = document.getElementById('tracker-table');
        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');
        const headerCells = thead.querySelectorAll('tr:first-child th');
        headerCells.forEach((th, idx) => {
            th.classList.add('sortable');
            th.dataset.colIndex = String(idx);
        });
        applyColumnResize(thead);

        // Prepare rows for generic renderer
        const rows = state.tracker.rows.map(item => ({
            'Identifier': item.identifier || '',
            'Rule Name': item.ruleName || '',
            'Execution Time': item.executionTime || '',
            'Action Name': item.actionName || '',
            'Source': item.source || '',
            'Event': item.event || '',
            'Type': item.type || '',
            'Old Value': JSON.stringify(item.oldValue) || '',
            'New Value': JSON.stringify(item.newValue) || '',
            'Inputs': JSON.stringify(item.inputList) || '',
            '__inputs': item.inputList || []
        }));

        const headers = ['Identifier','Rule Name','Execution Time','Action Name','Source','Event','Type','Old Value','New Value'];
        const filtered = filterAndSearch(rows, state.tracker.filters, state.tracker.search, headers);
        const sorted = sortRows(filtered, state.tracker.sort, headers);
        state.tracker.view = sorted;

        // Render with click-to-show inputs
        tbody.innerHTML = '';
        sorted.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row['Identifier']}</td>
                <td>${row['Rule Name']}</td>
                <td>${row['Execution Time']}</td>
                <td>${row['Action Name']}</td>
                <td>${row['Source']}</td>
                <td>${row['Event']}</td>
                <td>${row['Type']}</td>
                <td>${row['Old Value']}</td>
                <td>${row['New Value']}</td>
            `;
            tr.addEventListener('click', () => {
                inputsContainer.classList.remove('hidden');
                const inputs = row['__inputs'] || [];
                inputsDisplay.textContent = JSON.stringify(inputs, null, 2);
            });
            tbody.appendChild(tr);
        });
    }

    function filterAndSearch(rows, filters, search, headers) {
        let out = rows.slice();
        // Column filters
        Object.entries(filters || {}).forEach(([col, val]) => {
            if (!val) return;
            const idx = Number(col);
            const header = headers[idx];
            const needle = String(val).toLowerCase();
            out = out.filter(r => String(r[header]).toLowerCase().includes(needle));
        });
        // Global search
        if (search && search.trim()) {
            const n = search.toLowerCase();
            out = out.filter(r => headers.some(h => String(r[h]).toLowerCase().includes(n)));
        }
        return out;
    }

    function sortRows(rows, sort, headers) {
        if (!sort || sort.col == null) return rows;
        const colIdx = Number(sort.col);
        const dir = sort.dir === 'desc' ? -1 : 1;
        const header = headers[colIdx];
        return rows.slice().sort((a, b) => {
            const av = a[header];
            const bv = b[header];
            const na = Number(av); const nb = Number(bv);
            if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
            return String(av).localeCompare(String(bv)) * dir;
        });
    }

    function initTableInteractions() {
        // Sorting handler for both tables
        document.querySelectorAll('.results-table thead').forEach(thead => {
            thead.addEventListener('click', (e) => {
                const th = e.target.closest('th');
                if (!th || !th.classList.contains('sortable')) return;
                const table = th.closest('table');
                const col = Number(th.dataset.colIndex);
                // Toggle sort dir
                const model = table.id === 'elapsed-time-table' ? state.elapsed : state.tracker;
                const current = model.sort || { col, dir: 'asc' };
                let dir = 'asc';
                if (current.col === col) dir = current.dir === 'asc' ? 'desc' : 'asc';
                model.sort = { col, dir };
                // Update data-sort attribute
                thead.querySelectorAll('tr:first-child th').forEach(h => h.removeAttribute('data-sort'));
                th.setAttribute('data-sort', dir);
                // Re-render
                if (table.id === 'elapsed-time-table') renderElapsedTable(); else renderTrackerTable();
            });
        });
    }

    function initFiltersAndSearch() {
        // Per-column filters
        document.querySelectorAll('#elapsed-time-table thead .filters-row input').forEach(inp => {
            inp.addEventListener('input', () => {
                state.elapsed.filters[inp.dataset.col] = inp.value;
                renderElapsedTable();
            });
        });
        document.querySelectorAll('#tracker-table thead .filters-row input').forEach(inp => {
            inp.addEventListener('input', () => {
                state.tracker.filters[inp.dataset.col] = inp.value;
                renderTrackerTable();
            });
        });
        // Global search
        if (elapsedSearch) elapsedSearch.addEventListener('input', () => { state.elapsed.search = elapsedSearch.value; renderElapsedTable(); });
        if (trackerSearch) trackerSearch.addEventListener('input', () => { state.tracker.search = trackerSearch.value; renderTrackerTable(); });
        // Recompute when Top N or threshold change
        if (topNSelect) topNSelect.addEventListener('change', () => {
            // re-run parse if data exists
            const { ok, data } = getJsonData(); if (!ok) return; processElapsedTimeCalculator(data);
        });
        if (minThresholdInput) minThresholdInput.addEventListener('input', debounce(() => {
            const { ok, data } = getJsonData(); if (!ok) return; processElapsedTimeCalculator(data);
        }, 300));
    }

    function applyColumnResize(thead) {
        thead.querySelectorAll('tr:first-child th').forEach(th => {
            if (th.querySelector('.col-resize-handle')) return;
            const handle = document.createElement('span');
            handle.className = 'col-resize-handle';
            th.style.position = 'relative';
            th.appendChild(handle);
            let startX, startWidth;
            handle.addEventListener('mousedown', (e) => {
                startX = e.pageX; startWidth = th.offsetWidth;
                document.body.style.cursor = 'col-resize';
                const onMove = (ev) => {
                    const dx = ev.pageX - startX;
                    th.style.width = Math.max(50, startWidth + dx) + 'px';
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = '';
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    function updateElapsedSummary(rows) {
        if (!elapsedSummary) return;
        const totalRules = rows.length;
        const totalTime = rows.reduce((sum, r) => sum + (Number(r['Total Elapsed Time']) || 0), 0);
        elapsedSummary.textContent = `Total rules: ${totalRules} | Total elapsed time: ${totalTime}`;
    }

    function getElapsedCsvData() {
        // Use current view
        return state.elapsed.view.map(r => ({
            'Rule Variable Name': r['Rule Variable Name'],
            'Total Elapsed Time': r['Total Elapsed Time'],
            'Occurrences': r['Occurrences']
        }));
    }
    function getTrackerCsvData() {
        return state.tracker.view.map(row => row);
    }

    // Theme helpers
    function getCurrentTheme() {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr) return attr;
        // fallback to system preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function setTheme(theme) {
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('theme', theme); } catch {}
    }
    function initTheme() {
        let theme = null;
        try { theme = localStorage.getItem('theme'); } catch {}
        if (!theme) theme = getCurrentTheme();
        setTheme(theme);
    }
});
