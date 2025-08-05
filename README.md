# Flight Path Parser

A web-based tool for parsing and analyzing flight path JSON data. This application is a web version of the Python-based FlightPathParserV2, allowing users to analyze and extract information from flight path JSON data directly in the browser.

## Features

The Flight Path Parser provides three main functionalities:

1. **Elapsed Time Calculator** - Identifies the top 10 rules with the highest combined elapsed time
2. **Field Tracker** - Searches for a specific Field Variable Name and displays all related information
3. **BOM Item Tracker** - Searches for a specific BOM Item ID and displays all related information

## Usage Instructions

1. Paste your JSON flight path data into the text area
2. Select the desired functionality:
   - **Elapsed Time Calculator**: No additional input needed
   - **Field Tracker**: Enter a Field Variable Name to search for
   - **BOM Item Tracker**: Enter a BOM Item ID to search for
3. Click the "Parse Data" button to process the data
4. View the results in the table format
5. For Field/BOM tracking results, click on any row to view the detailed inputs

## Sample JSON Format

Your JSON data should match the following format for the application to work correctly:

```json
[
  [
    {
      "ruleVariableName": "Rule1",
      "elapsedTime": 250,
      "executionTime": "2025-08-04T12:30:00Z",
      "actionVariableName": "Action1",
      "inputs": ["input1", "input2"],
      "changes": [
        {
          "identifier": "Field1",
          "source": "Source1",
          "event": "Event1",
          "type": "Type1",
          "oldValue": "Old",
          "newValue": "New"
        }
      ]
    }
  ]
]
```

## Local Development

To run this application locally:

1. Clone this repository
2. Open the index.html file in your browser
3. No build steps or server required - it's entirely client-side

## Hosted Version

This application is hosted on GitHub Pages at https://droidzer0.github.io/
