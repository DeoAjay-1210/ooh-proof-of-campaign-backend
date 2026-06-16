const xlsx = require("xlsx");

const cleanHeader = (header) => {
  return String(header || "").trim();
};

const makeUniqueHeaders = (headers) => {
  const used = new Map();

  return headers.map((header) => {
    const cleaned = cleanHeader(header);

    if (!cleaned) return "";

    const count = used.get(cleaned) || 0;
    used.set(cleaned, count + 1);

    if (count === 0) return cleaned;

    return `${cleaned}_${count + 1}`;
  });
};

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

  const matrix = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false
  });

  if (!matrix.length) {
    return {
      sheetName: firstSheetName,
      headers: [],
      rows: []
    };
  }

  const headers = makeUniqueHeaders(matrix[0]).filter(Boolean);

  const rows = matrix.slice(1).map((cells) => {
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] === undefined || cells[index] === null
        ? ""
        : cells[index];
    });

    return row;
  });

  return {
    sheetName: firstSheetName,
    headers,
    rows
  };
};

module.exports = {
  parseExcelFile
};
