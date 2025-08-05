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
            
            sortedRules.forEach(([rule, time]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${rule}</td>
                    <td>${time}</td>
                `;
                elapsedTimeTable.appendChild(row);
            });
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
            });
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
    }

    // Initialize the page
    updateInputFields();
});
