const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataDir = path.join(__dirname, "data");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getCollectionPath(name) {
  ensureDataDir();
  return path.join(dataDir, `${name}.json`);
}

function readCollection(name) {
  const filePath = getCollectionPath(name);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }

  const raw = fs.readFileSync(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return [];
  }
}

function writeCollection(name, items) {
  const filePath = getCollectionPath(name);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf8");
}

function createRecord(payload) {
  const timestamp = new Date().toISOString();
  return {
    ...payload,
    _id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function updateRecord(items, id, updater) {
  return items.map((item) => {
    if (item._id !== id) {
      return item;
    }

    return {
      ...updater(item),
      updatedAt: new Date().toISOString(),
    };
  });
}

module.exports = {
  createRecord,
  readCollection,
  updateRecord,
  writeCollection,
};
