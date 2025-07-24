# Rx Tool Submission Form

## Overview
This is a web-based form application for submitting prescription information. The form includes cascading dropdowns that filter options based on previous selections, making it easier to select the correct data combinations.

## Features
- SSO Name selection with automatic filtering of related data
- Manager Name dropdown that updates based on SSO selection
- Zone dropdown that updates based on Manager selection
- Doctor's Name dropdown that filters based on SSO selection
- City dropdown that updates based on Doctor selection
- Date picker for Rx upload date
- File upload for prescription documents
- Form validation
- Responsive design

## How to Use

### Setup
1. Ensure the Excel file `RX_Combined_MR_Doctor_Template.xlsx` is in the same directory as the HTML file.
2. You can run the application in two ways:

   **Option 1: Using the local server (recommended)**
   - Make sure you have Node.js installed on your computer.
   - Open a command prompt or terminal in the project directory.
   - Run the command: `node server.js`
   - Open your browser and navigate to `http://localhost:3000`
   
   **Option 2: Direct file opening**
   - Simply open `index.html` in a web browser (note that some browsers may block loading the Excel file directly due to security restrictions).

### Using the Form
1. Select an SSO Name from the dropdown.
2. If applicable, select a Manager Name (this will be auto-selected if there's only one manager).
3. The Zone field will be populated based on the Manager selection.
4. Select a Doctor's Name from the filtered list.
5. Select a City from the options available for the selected Doctor.
6. The current date is pre-filled, but you can change it if needed.
7. Upload a prescription file (image or PDF).
8. Click Submit to process the form.

### Data Relationships
- Each SSO Name may have one or more Manager Names associated with it.
- Each Manager Name is associated with specific Zones.
- Each SSO Name has specific Doctors assigned to them.
- Each Doctor is associated with specific Cities.

## Technical Details
- The application uses pure HTML, CSS, and JavaScript.
- Bootstrap 5 is used for styling and responsive design.
- The SheetJS library (xlsx) is used to parse the Excel file.
- No server-side processing is required; all data is processed in the browser.

## Notes
- In a production environment, you would typically have a server component to process the form submission and store the data.
- The current implementation logs the form data to the console when submitted.
- For security and performance reasons in a real-world scenario, the Excel data would typically be converted to JSON and served from an API endpoint rather than loading the Excel file directly in the browser.