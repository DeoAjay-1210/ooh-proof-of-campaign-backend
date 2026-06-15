const normalizeHeader = (header) => {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._-]/g, " ")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ");
};

const headerAliases = {
  mediaCode: [
    "mediacode",
    "media code",
    "media id",
    "site code",
    "site id",
    "board code",
    "asset code"
  ],

  mediaName: [
    "media name",
    "medianame",
    "site name",
    "board name",
    "hoarding name",
    "asset name"
  ],

  mediaType: [
    "media type",
    "mediatype",
    "type",
    "board type",
    "asset type"
  ],

  city: [
    "city",
    "district",
    "town"
  ],

  location: [
    "location",
    "area",
    "place",
    "locality"
  ],

  fullAddress: [
    "full address",
    "address",
    "complete address",
    "site address"
  ],

  widthFt: [
    "width ft",
    "width",
    "width feet",
    "width in ft",
    "board width",
    "board width ft"
  ],

  heightFt: [
    "height ft",
    "height",
    "height feet",
    "height in ft",
    "board height",
    "board height ft"
  ],

  totalSqFt: [
    "total sq ft",
    "total sqft",
    "total sq.ft",
    "sq ft",
    "sqft",
    "total square feet",
    "total sft"
  ],

  status: [
    "status",
    "media status",
    "site status",
    "board status",
    "active status"
  ]
};

const getFieldKeyFromHeader = (header) => {
  const normalizedHeader = normalizeHeader(header);

  for (const [fieldKey, aliases] of Object.entries(headerAliases)) {
    const normalizedAliases = aliases.map(normalizeHeader);

    if (normalizedAliases.includes(normalizedHeader)) {
      return fieldKey;
    }
  }

  return null;
};

const createHeaderMapping = (headers) => {
  const mappedHeaders = {};
  const dynamicHeaders = [];

  headers.forEach((header) => {
    const fieldKey = getFieldKeyFromHeader(header);

    if (fieldKey) {
      mappedHeaders[fieldKey] = header;
    } else {
      dynamicHeaders.push(header);
    }
  });

  return {
    mappedHeaders,
    dynamicHeaders
  };
};

module.exports = {
  normalizeHeader,
  createHeaderMapping
};