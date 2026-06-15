const xlsx = require("xlsx");

const parseExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath, {
    cellDates: true,
    raw: false
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file does not contain any sheet");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const rows = xlsx.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false
  });

  const headerRows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ""
  });

  const headers = headerRows[0] || [];

  return {
    sheetName: firstSheetName,
    headers: headers.map((header) => String(header).trim()).filter(Boolean),
    rows
  };
};

module.exports = {
  parseExcelFile
};