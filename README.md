Organization Chart Web App

Project Description
        This is an organizational chart web application based on Google Sheets as a data source, designed to display employee information and support editing and updating. Users can view and edit employee names, roles, status, and team information through the front-end interface. The back-end uses Google Apps Script to provide an API interface for interacting with Google Sheets data.

Features
    1. Employee Information Display: Display company employees' names, roles, status, and teams through an organizational chart.

    2. Employee Information Editing: Edit employee information, including name, role, status, and team.

    3. Data Persistence: All employee data is stored in a Google Sheet, and changes are updated in real time.

Technology Stack
    Front-end:
        HTML
        CSS
        JavaScript (for dynamic interactions)
        Google Apps Script (as a back-end interface)
    Back-end:
        Google Apps Script
        Google Sheets API

Deployment Guide
    1. Google Sheets Setup
        (1)Create a new Google Sheet named Employee Data or another appropriate name.
        (2)Add the following column headers to Sheet1:
            Name: Employee name
            Role: Employee role
            Status: Employee status (e.g., Active, Dropped, Future Start, etc.)
            Team: Employee's team
        (3)Populate the sheet and add employee data.

    2. Google Apps Script Backend Deployment
        (1)Open Google Apps Script.
        (2)Create a new project and name it OrgChartAPI or another name.
        (3)Replace the default Code.gs file with the following:

        function doGet(e) {
  const ss    = SpreadsheetApp.openById('1jafM-dFLb4T-wb7nAxspx6befDCdTgMXdOwFBzE1LXA');
  const sheet = ss.getSheetByName('Sheet1');
  const data  = sheet.getDataRange().getValues();

  const headers = data.shift();
  const result  = data.map(row =>
    headers.reduce((obj, h, i) => (obj[h] = row[i], obj), {})
  );

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);  
}


function doPost(e) {
  const ss    = SpreadsheetApp.openById('1jafM-dFLb4T-wb7nAxspx6befDCdTgMXdOwFBzE1LXA');
  const sheet = ss.getSheetByName('Sheet1');

  const p       = e.parameter;
  const oldName = p.oldName || p.name || '';
  const name    = p.name    || '';
  const role    = p.role    || '';
  const status  = p.status  || '';
  const team    = p.team    || '';

  const rows = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === oldName) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[name, role, status, team]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([name, role, status, team]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      action: updated ? 'updated' : 'added'
    }))
    .setMimeType(ContentService.MimeType.JSON); 
}

        (4)Click "Deployment" → "New Deployment."
            Select Type: Web Application
            Description: For example, Org Chart API
            Set Access Rights to "Anyone (including anonymous users)"
            After publishing, click Copy URL. This URL will be used on the front-end.
            Configure the generated URL in your front-end script.js file, replacing it with the correct API address.

    3. Front-end Deployment
        Place the HTML, CSS, and JavaScript files in your web project.
        In the front-end script.js file, set the API_URL variable to your Google Apps Script API address (obtained in the steps above).

    4. Instructions
        (1)View Employee Data: Use the app's displayed page to view employee information in a Google Sheet.
        (2)Edit Employee Data: Click the Edit button to modify employee information and save the changes to the Google Sheet.

