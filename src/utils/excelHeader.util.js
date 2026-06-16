const normalizeHeader = (header) => {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[._\-\/]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/*
  Final inventory headers supported:
  S. No / S.No
  City
  Media
  Area Name
  Location
  Qty
  W
  H
  Fl / Bl Nl
  Area
  Display cost per Month
  Printing Cost
  Mounting Cost
  Total Cost
  Lattitude / Latitude
  Longitude
  Power Supply
  Innovations

  Existing older upload headers are also supported.
*/
const headerAliases = {
  mediaCode: [
    "mediacode",
    "media code",
    "media id",
    "site code",
    "site id",
    "board code",
    "asset code",
    "s no",
    "sno",
    "serial no",
    "sl no",
    "sr no"
  ],

  mediaName: [
    "media name",
    "medianame",
    "site name",
    "board name",
    "hoarding name",
    "asset name"
  ],

  areaName: [
    "area name",
    "area location",
    "zone name",
    "zone"
  ],

  mediaType: [
    "media type",
    "mediatype",
    "media",
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
    "place",
    "locality"
  ],

  fullAddress: [
    "full address",
    "address",
    "complete address",
    "site address",
    "site location",
    "complete location"
  ],

  quantity: [
    "qty",
    "quantity",
    "no of sites",
    "count"
  ],

  widthFt: [
    "w",
    "width ft",
    "width",
    "width feet",
    "width in ft",
    "board width",
    "board width ft"
  ],

  heightFt: [
    "h",
    "height ft",
    "height",
    "height feet",
    "height in ft",
    "board height",
    "board height ft"
  ],

  illumination: [
    "fl bl nl",
    "fl bl",
    "frontlit backlit nonlit",
    "front lit back lit non lit",
    "illumination",
    "lighting",
    "light type"
  ],

  totalSqFt: [
    "area",
    "total sq ft",
    "total sqft",
    "total sq.ft",
    "sq ft",
    "sqft",
    "total square feet",
    "total sft"
  ],

  displayCostPerMonth: [
    "display cost per month",
    "display cost month",
    "display cost",
    "monthly display cost",
    "monthly rate",
    "rate per month"
  ],

  printingCost: [
    "printing cost",
    "print cost"
  ],

  mountingCost: [
    "mounting cost",
    "mount cost",
    "installation cost"
  ],

  totalCost: [
    "total cost",
    "overall cost",
    "final cost"
  ],

  latitude: [
    "latitude",
    "lattitude",
    "lat"
  ],

  longitude: [
    "longitude",
    "long",
    "lng"
  ],

  powerSupply: [
    "power supply",
    "power",
    "electricity",
    "eb"
  ],

  innovations: [
    "innovations",
    "innovation",
    "creative innovation"
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
    const cleanHeader = String(header || "").trim();

    if (!cleanHeader) return;

    const fieldKey = getFieldKeyFromHeader(cleanHeader);

    if (fieldKey) {
      /*
        If duplicate-style headers exist, later exact mapped header wins.
        Example: "S. No" and "S.No" both map to mediaCode.
      */
      mappedHeaders[fieldKey] = cleanHeader;
    } else {
      dynamicHeaders.push(cleanHeader);
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
