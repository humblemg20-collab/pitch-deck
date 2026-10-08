function getAg24PaymentsSpreadsheet_() {
  if (
    typeof AG24_CONFIG === 'undefined' ||
    !AG24_CONFIG.SPREADSHEET_ID ||
    AG24_CONFIG.SPREADSHEET_ID === 'COLLE_ICI_L_ID_DU_GOOGLE_SHEETS'
  ) {
    throw new Error('Ajoutez un véritable SPREADSHEET_ID dans AG24_CONFIG.');
  }

  return SpreadsheetApp.openById(String(AG24_CONFIG.SPREADSHEET_ID).trim());
}

function setupPaymentsSheet_() {
  const spreadsheet = getAg24PaymentsSpreadsheet_();
  const sheetName = AG24_PAYMENT_CONFIG.SHEET_NAME;
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  const headers = [
    'paymentId','email','customerName','transactionId','amount','currency',
    'status','accessCode','accessUsed','projectId','source','createdAt',
    'updatedAt','usedAt'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getValues()[0]
      .map(String);

    headers.forEach(function(header) {
      if (currentHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        currentHeaders.push(header);
      }
    });
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#0B6B3A')
    .setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, sheet.getLastColumn());

  return sheet;
}

function installPaymentsModule() {
  const sheet = setupPaymentsSheet_();
  return {
    success: true,
    sheetName: sheet.getName(),
    spreadsheetUrl: sheet.getParent().getUrl(),
    paymentUrl: AG24_PAYMENT_CONFIG.SELAR_PAYMENT_URL
  };
}
