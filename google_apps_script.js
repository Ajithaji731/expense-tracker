/**
 * ===================================================================
 * EXPENSE TRACKER - GOOGLE APPS SCRIPT BACKEND
 * ===================================================================
 * Instructions to connect your Google Sheet:
 * 1. Open your "Expense tracker" Google Sheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any code in the editor and paste ALL the code below.
 * 4. Click "Deploy" (top right) > "New deployment".
 * 5. Select type: "Web app" (click gear icon next to 'Select type').
 * 6. Set Description: "Expense Tracker API v1".
 * 7. Set "Execute as": "Me (your email)".
 * 8. Set "Who has access": "Anyone" (crucial for web app & AI agent to connect).
 * 9. Click "Deploy", authorize permissions when prompted.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 11. Paste this URL into the Expense Tracker App (Settings > Cloud Sync)
 *     and into your Leo AI Agent!
 * ===================================================================
 */

const SHEET_NAME = "Expenses";
const HEADERS = [
  "ID", 
  "Date", 
  "Time", 
  "Month", 
  "Amount", 
  "Description", 
  "Category", 
  "Payment Mode", 
  "Source", 
  "Created At"
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0);
    sheet.appendRow(HEADERS);
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    
    // Auto resize column widths
    for (let i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 130);
    }
    sheet.setColumnWidth(6, 200); // Description
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    
    const expenses = [];
    const monthsSet = new Set();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Skip empty rows
      
      const dateStr = formatDateStr(row[1]);
      const monthStr = formatMonthStr(row[3], row[1]);
      const timeStr = formatTimeStr(row[2]);

      const item = {
        id: String(row[0]),
        date: dateStr,
        time: timeStr,
        month: monthStr,
        amount: Number(row[4] || 0),
        description: String(row[5] || ""),
        category: String(row[6] || "Other"),
        paymentMode: String(row[7] || "UPI"),
        source: String(row[8] || "App"),
        createdAt: String(row[9] || "")
      };
      
      if (item.month) {
        monthsSet.add(item.month);
      }
      
      expenses.push(item);
    }
    
    // Filter by month if requested
    const targetMonth = e && e.parameter && e.parameter.month;
    let filtered = expenses;
    if (targetMonth && targetMonth !== "all") {
      filtered = expenses.filter(exp => exp.month === targetMonth);
    }
    
    const monthsList = Array.from(monthsSet).sort().reverse();
    
    const output = {
      status: "success",
      expenses: filtered,
      allExpenses: expenses,
      months: monthsList,
      totalCount: expenses.length,
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    const action = payload.action || "addExpense";
    const sheet = getOrCreateSheet();
    
    if (action === "addExpense") {
      const expense = payload.expense || payload;
      
      const id = expense.id || ("exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
      const now = new Date();
      const date = expense.date || Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const time = expense.time || Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
      const month = expense.month || date.substring(0, 7);
      const amount = Number(expense.amount || 0);
      const description = String(expense.description || "Expense");
      const category = String(expense.category || "Food & Drinks");
      const paymentMode = String(expense.paymentMode || "UPI");
      const source = String(expense.source || "AI Agent");
      const createdAt = expense.createdAt || now.toISOString();
      
      sheet.appendRow([
        id,
        date,
        time,
        month,
        amount,
        description,
        category,
        paymentMode,
        source,
        createdAt
      ]);
      
      const savedExpense = {
        id, date, time, month, amount, description, category, paymentMode, source, createdAt
      };
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "Expense added successfully",
          expense: savedExpense
        }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "deleteExpense") {
      const idToDelete = String(payload.id);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === idToDelete) {
          rowIndex = i + 1; // 1-indexed in Sheets
          break;
        }
      }
      
      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
        return ContentService
          .createTextOutput(JSON.stringify({
            status: "success",
            message: "Expense deleted",
            id: idToDelete
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify({
            status: "error",
            message: "Expense ID not found"
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
    } else if (action === "updateExpense") {
      const expense = payload.expense;
      const idToUpdate = String(expense.id);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === idToUpdate) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 2).setValue(expense.date);
        sheet.getRange(rowIndex, 3).setValue(expense.time);
        sheet.getRange(rowIndex, 4).setValue(expense.month);
        sheet.getRange(rowIndex, 5).setValue(Number(expense.amount));
        sheet.getRange(rowIndex, 6).setValue(expense.description);
        sheet.getRange(rowIndex, 7).setValue(expense.category);
        sheet.getRange(rowIndex, 8).setValue(expense.paymentMode);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            status: "success",
            message: "Expense updated",
            expense: expense
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify({
            status: "error",
            message: "Expense ID not found"
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
    } else if (action === "batchSync") {
      const list = payload.expenses || [];
      const data = sheet.getDataRange().getValues();
      const existingIds = new Set();
      for (let i = 1; i < data.length; i++) {
        existingIds.add(String(data[i][0]));
      }
      
      let addedCount = 0;
      list.forEach(item => {
        if (!existingIds.has(String(item.id))) {
          sheet.appendRow([
            item.id,
            item.date,
            item.time || "",
            item.month || item.date.substring(0, 7),
            Number(item.amount || 0),
            item.description || "",
            item.category || "Other",
            item.paymentMode || "UPI",
            item.source || "App",
            item.createdAt || new Date().toISOString()
          ]);
          addedCount++;
        }
      });
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "Synced batch items",
          addedCount: addedCount
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val).substring(0, 10);
}

function formatMonthStr(val, dateVal) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM");
  }
  const s = String(val || "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (dateVal) {
    return formatDateStr(dateVal).substring(0, 7);
  }
  return s.substring(0, 7);
}

function formatTimeStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "hh:mm a");
  }
  return String(val);
}

