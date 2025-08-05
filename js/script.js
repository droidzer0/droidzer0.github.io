/**
 * Flight Path Parser JavaScript
 * This script implements the functionality of the Flight Path Parser application
 * which is based on the flightPathParserV2.py Python script.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const jsonInput = document.getElementById('json-data');
    const parseButton = document.getElementById('parse-button');
    const functionalityOptions = document.querySelectorAll('input[name="functionality"]');
    const fieldInput = document.getElementById('field-input');
    const bomInput = document.getElementById('bom-input');
    const fieldName = document.getElementById('field-name');
    const bomId = document.getElementById('bom-id');
    const errorMessage = document.getElementById('error-message');
    const elapsedTimeResults = document.getElementById('elapsed-time-results');
    const trackerResults = document.getElementById('tracker-results');
    const trackerTitle = document.getElementById('tracker-title');
    const elapsedTimeTable = document.getElementById('elapsed-time-table').querySelector('tbody');
    const trackerTable = document.getElementById('tracker-table').querySelector('tbody');
    const inputsContainer = document.getElementById('inputs-container');
    const inputsDisplay = document.getElementById('inputs-display');
    
    // CSV Download Buttons (will be created dynamically)

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
        let jsonData;
        try {
            jsonData = JSON.parse(jsonInput.value);
            hideError();
        } catch (error) {
            showError('Invalid JSON data. Please check your input.');
            return;
        }

        // Get selected functionality
        const selectedFunctionality = document.querySelector('input[name="functionality"]:checked').value;

        // Process based on selected functionality
        switch (selectedFunctionality) {
            case '1':
                processElapsedTimeCalculator(jsonData);
                break;
            case '2':
                const fieldValue = fieldName.value.trim();
                if (!fieldValue) {
                    showError('Please enter a Field Variable Name.');
                    return;
                }
                processFieldTracker(jsonData, fieldValue);
                break;
            case '3':
                const bomValue = bomId.value.trim();
                if (!bomValue) {
                    showError('Please enter a BOM Item ID.');
                    return;
                }
                processBomItemTracker(jsonData, bomValue);
                break;
        }
    });

    // Function to update input fields based on selected functionality
    function updateInputFields() {
        const selectedFunctionality = document.querySelector('input[name="functionality"]:checked').value;
        
        // Hide all conditional inputs first
        fieldInput.classList.add('hidden');
        bomInput.classList.add('hidden');
        
        // Show relevant input based on selection
        if (selectedFunctionality === '2') {
            fieldInput.classList.remove('hidden');
        } else if (selectedFunctionality === '3') {
            bomInput.classList.remove('hidden');
        }
    }

    // Function to process Elapsed Time Calculator
    function processElapsedTimeCalculator(data) {
        // Show elapsed time results and hide tracker results
        elapsedTimeResults.classList.remove('hidden');
        trackerResults.classList.add('hidden');
        
        // Process data to calculate rule times (similar to Python version)
        const ruleTimes = {};
        
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
                    }
                }
            }
            
            // Sort rules by elapsed time and get top 10
            const sortedRules = Object.entries(ruleTimes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            // Display results in table
            elapsedTimeTable.innerHTML = '';
            if (sortedRules.length === 0) {
                showError('No rule time data found in the JSON.');
                return;
            }
            
            // Format data for table display and CSV export
            const csvData = [];
            
            sortedRules.forEach(([rule, time]) => {
                // Add to table
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${rule}</td>
                    <td>${time}</td>
                `;
                elapsedTimeTable.appendChild(row);
                
                // Add to CSV data
                csvData.push({
                    'Rule Variable Name': rule,
                    'Total Elapsed Time': time
                });
            });
            
            // Create download button
            createDownloadButton(
                elapsedTimeResults,
                csvData,
                ['Rule Variable Name', 'Total Elapsed Time'],
                'elapsed_time_results.csv'
            );
        } catch (error) {
            showError(`Error processing data: ${error.message}`);
        }
    }

    // Function to process Field Tracker
    function processFieldTracker(data, fieldValue) {
        processTracker(data, fieldValue, 'Field');
    }

    // Function to process BOM Item Tracker
    function processBomItemTracker(data, bomValue) {
        processTracker(data, bomValue, 'BOM Item');
    }

    // Common function to process both Field and BOM Item tracking
    function processTracker(data, searchValue, trackerType) {
        // Show tracker results and hide elapsed time results
        elapsedTimeResults.classList.add('hidden');
        trackerResults.classList.remove('hidden');
        trackerTitle.textContent = `${trackerType} Information: ${searchValue}`;
        
        // List to store matching field/BOM items
        const fieldRuleList = [];
        
        try {
            // Loop through JSON (similar to Python version)
            for (const item of data) {
                for (const thing of item) {
                    const changesList = thing.changes || [];
                    for (const changeItem of changesList) {
                        const identifier = changeItem.identifier;
                        
                        // If the identifier includes the search value
                        if (identifier && identifier.includes(searchValue)) {
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
            
            // Format data for CSV export
            const csvData = [];
            
            fieldRuleList.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.identifier || ''}</td>
                    <td>${item.ruleName || ''}</td>
                    <td>${item.executionTime || ''}</td>
                    <td>${item.actionName || ''}</td>
                    <td>${item.source || ''}</td>
                    <td>${item.event || ''}</td>
                    <td>${item.type || ''}</td>
                    <td>${JSON.stringify(item.oldValue) || ''}</td>
                    <td>${JSON.stringify(item.newValue) || ''}</td>
                `;
                row.addEventListener('click', () => {
                    // Show inputs when row is clicked
                    inputsContainer.classList.remove('hidden');
                    inputsDisplay.textContent = JSON.stringify(item.inputList, null, 2);
                });
                trackerTable.appendChild(row);
                
                // Add to CSV data - format the inputs list as a string
                const csvItem = {
                    'Identifier': item.identifier || '',
                    'Rule Name': item.ruleName || '',
                    'Execution Time': item.executionTime || '',
                    'Action Name': item.actionName || '',
                    'Source': item.source || '',
                    'Event': item.event || '',
                    'Type': item.type || '',
                    'Old Value': JSON.stringify(item.oldValue) || '',
                    'New Value': JSON.stringify(item.newValue) || '',
                    'Inputs': JSON.stringify(item.inputList) || ''
                };
                csvData.push(csvItem);
            });
            
            // Create download button
            const fileName = trackerType === 'Field' ? 'field_tracker_results.csv' : 'bom_item_results.csv';
            const csvHeaders = [
                'Identifier', 'Rule Name', 'Execution Time', 'Action Name',
                'Source', 'Event', 'Type', 'Old Value', 'New Value', 'Inputs'
            ];
            
            createDownloadButton(
                trackerResults,
                csvData,
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
    function createDownloadButton(container, data, headers, fileName) {
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
            const csvContent = convertToCSV(data, headers);
            downloadCSV(csvContent, fileName);
        });
        
        // Add button to container
        container.appendChild(downloadBtn);
    }

    // Initialize the page
    updateInputFields();
});
