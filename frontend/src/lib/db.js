import { openDB } from "idb";

const DB_NAME = "ai-dashboard";
const STORE = "datasets";

function db() {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
}

// A dataset = { id, name, createdAt, columns, stats, rowCount, rows, spec? }
export async function saveDataset(ds) {
  return (await db()).put(STORE, ds);
}

export async function getDataset(id) {
  return (await db()).get(STORE, id);
}

// Returns metadata only (drops the heavy `rows` array) for listing.
export async function listDatasets() {
  const all = await (await db()).getAll(STORE);
  return all
    .map(({ rows, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDataset(id) {
  return (await db()).delete(STORE, id);
}
