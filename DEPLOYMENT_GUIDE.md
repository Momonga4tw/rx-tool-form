# Google Apps Script Deployment Guide for Rx Tool Form

This guide will help you deploy the Google Apps Script web app that handles form submissions and saves data to Google Sheets.

## Prerequisites

1. A Google account
2. Access to Google Sheets
3. Access to Google Apps Script

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Note down the **Sheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
   - Copy the `YOUR_SHEET_ID_HERE` part

## Step 2: Set up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click **"New Project"**
3. Rename the project to "Rx Tool Form Web App"
4. Delete the default `Code.gs` content
5. Copy and paste the entire content from `google-apps-script.js` into the editor

## Step 3: Configure the Script

1. In the script editor, find this line:
   ```javascript
   const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
   ```
2. Replace `'YOUR_GOOGLE_SHEET_ID_HERE'` with your actual Sheet ID from Step 1

## Step 4: Set up the Google Sheet

1. In the Apps Script editor, go to the **Functions** dropdown
2. Select `setupSheet` and click the **Run** button
3. Grant necessary permissions when prompted
4. Check the **Execution log** to confirm the sheet was created successfully

## Step 5: Test the Connection

1. In the Apps Script editor, go to the **Functions** dropdown
2. Select `testConnection` and click the **Run** button
3. Check the **Execution log** to verify the connection works

## Step 6: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Choose **Web app** as the type
3. Configure the settings:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (or `Anyone with Google account` for more security)
4. Click **Deploy**
5. Grant necessary permissions when prompted
6. Copy the **Web app URL** - this is your script URL

## Step 7: Update Your Frontend

1. In your `server.js` file, update the environment variable:
   ```javascript
   // Add this to your .env file
   GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```

2. Or if you're using a different configuration method, update the script URL in your frontend code.

## Step 8: Test the Complete Setup

1. Open your web app URL in a browser
2. You should see a test interface
3. Fill out the test form and submit
4. Check your Google Sheet to see if the data was saved

## Troubleshooting

### Common Issues:

1. **"Script not found" error**
   - Make sure you copied the entire script content
   - Check that the Sheet ID is correct

2. **"Permission denied" error**
   - Make sure you granted all necessary permissions
   - Try running `setupSheet` again

3. **"Sheet not found" error**
   - Run `setupSheet` function first
   - Check that the Sheet ID is correct

4. **CORS errors in frontend**
   - Make sure the web app is deployed with "Anyone" access
   - Check that the script URL is correct

### Testing Functions:

- `setupSheet()`: Creates the initial sheet structure
- `testConnection()`: Tests the connection to Google Sheets
- `doGet()`: Provides a test interface (accessible via web app URL)

## Security Considerations

1. **Access Control**: Consider using "Anyone with Google account" instead of "Anyone" for better security
2. **Rate Limiting**: Google Apps Script has execution quotas
3. **Data Validation**: The script includes basic validation, but you may want to add more

## Monitoring

1. **Execution Logs**: Check the Apps Script execution logs for errors
2. **Google Sheet**: Monitor the sheet for new submissions
3. **Quotas**: Monitor your Apps Script usage in the Google Cloud Console

## Sheet Structure

The script will create a sheet with these columns:
1. **Timestamp** - When the form was submitted
2. **WSFA Code** - The selected WSFA code
3. **HCP Name** - Healthcare Professional name
4. **SM Name** - Sales Manager name
5. **RSM Name** - Regional Sales Manager name
6. **ASM Name** - Area Sales Manager name
7. **Date of Rx Upload** - Date when prescription was uploaded
8. **Upload Prescription** - URL to the uploaded file

## Support

If you encounter issues:
1. Check the Apps Script execution logs
2. Verify all permissions are granted
3. Test with the built-in test interface first
4. Ensure your Google Sheet ID is correct 