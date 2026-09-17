import {
  Client,
  TablesDB,
  Storage,
  Realtime,
  ID,
  Permission,
  Role,
  Channel,
} from "appwrite";

const endpoint =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const textTableId =
  import.meta.env.VITE_APPWRITE_TEXT_TABLE_ID || "text_sharing";
const filesTableId =
  import.meta.env.VITE_APPWRITE_FILES_TABLE_ID || "file_sharing";
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID || "files";

const POLL_MS = 2500;
const TTL_MS = 10 * 60 * 1000; // auto-delete after 10 minutes

const publicPermissions = [
  Permission.read(Role.any()),
  Permission.update(Role.any()),
  Permission.delete(Role.any()),
];

if (!projectId || !databaseId) {
  console.warn(
    "[SkyShare] Missing Appwrite env vars. Copy .env.example to .env and fill in your project IDs."
  );
}

const client = new Client().setEndpoint(endpoint).setProject(projectId || "");
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const realtime = new Realtime(client);

let roomIdPromise = null;
/** Avoid repeating 404 GETs while a room has no row yet */
const textRowMissing = new Set();
const filesRowMissing = new Set();

async function hashToRoomId(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function fetchPublicIpv4() {
  const endpoints = [
    "https://api4.ipify.org?format=json",
    "https://ipv4.icanhazip.com",
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      let ip = "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        ip = String(data?.ip || "").trim();
      } else {
        ip = (await response.text()).trim();
      }

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        return ip;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    "Could not detect your public IPv4. Check connection / disable VPN."
  );
}

export async function getRoomId() {
  if (!roomIdPromise) {
    roomIdPromise = (async () => {
      const ip = await fetchPublicIpv4();
      const roomId = await hashToRoomId(`net:v4:${ip}`);
      console.info("[SkyShare] network room:", roomId, "(ipv4)", ip);
      return roomId;
    })().catch((error) => {
      roomIdPromise = null;
      throw error;
    });
  }
  return roomIdPromise;
}

export function resetRoomId() {
  roomIdPromise = null;
  textRowMissing.clear();
  filesRowMissing.clear();
}

function isNotFound(error) {
  return error?.code === 404;
}

function isExpired(row) {
  const stamp = row?.$updatedAt || row?.$createdAt;
  if (!stamp) return false;
  return Date.now() - new Date(stamp).getTime() > TTL_MS;
}

export async function saveText(text) {
  const roomId = await getRoomId();
  const row = await tablesDB.upsertRow({
    databaseId,
    tableId: textTableId,
    rowId: roomId,
    data: { text },
    permissions: publicPermissions,
  });
  textRowMissing.delete(roomId);
  return row;
}

export async function clearText() {
  const roomId = await getRoomId();
  try {
    await tablesDB.deleteRow({
      databaseId,
      tableId: textTableId,
      rowId: roomId,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  textRowMissing.add(roomId);
}

export async function getText() {
  const roomId = await getRoomId();
  if (textRowMissing.has(roomId)) return "";

  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: textTableId,
      rowId: roomId,
    });

    if (isExpired(row)) {
      await clearText();
      return "";
    }

    textRowMissing.delete(roomId);
    return row?.text || "";
  } catch (error) {
    if (isNotFound(error)) {
      textRowMissing.add(roomId);
      return "";
    }
    throw error;
  }
}

export async function subscribeText(onChange) {
  const roomId = await getRoomId();
  let lastSent = Symbol("init");

  const push = async () => {
    try {
      const text = await getText();
      if (text === lastSent) return;
      lastSent = text;
      onChange(text);
    } catch (error) {
      console.warn("[SkyShare] text poll failed", error);
    }
  };

  await push();
  const intervalId = setInterval(push, POLL_MS);

  let subscription = null;
  try {
    subscription = await realtime.subscribe(
      Channel.tablesdb(databaseId).table(textTableId).row(roomId),
      (event) => {
        const deleted = (event.events || []).some((name) =>
          String(name).includes(".delete")
        );
        if (deleted) {
          textRowMissing.add(roomId);
          lastSent = "";
          onChange("");
          return;
        }
        textRowMissing.delete(roomId);
        if (event.payload?.$updatedAt && isExpired(event.payload)) {
          clearText().then(() => {
            lastSent = "";
            onChange("");
          });
          return;
        }
        if (event.payload?.text != null) {
          lastSent = event.payload.text || "";
          onChange(lastSent);
        } else {
          push();
        }
      }
    );
  } catch (error) {
    console.warn("[SkyShare] text realtime unavailable, using poll only", error);
  }

  return () => {
    clearInterval(intervalId);
    subscription?.unsubscribe?.();
  };
}

export async function saveFiles(files) {
  const roomId = await getRoomId();
  const row = await tablesDB.upsertRow({
    databaseId,
    tableId: filesTableId,
    rowId: roomId,
    data: { files: JSON.stringify(files || []) },
    permissions: publicPermissions,
  });
  filesRowMissing.delete(roomId);
  return row;
}

export async function clearFiles() {
  const roomId = await getRoomId();
  try {
    await tablesDB.deleteRow({
      databaseId,
      tableId: filesTableId,
      rowId: roomId,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  filesRowMissing.add(roomId);
}

async function deleteStoredFiles(fileList) {
  for (const file of fileList || []) {
    if (!file?.id) continue;
    try {
      await storage.deleteFile({ bucketId, fileId: file.id });
    } catch {
      // ignore missing / permission errors
    }
  }
}

export async function getFiles() {
  const roomId = await getRoomId();
  if (filesRowMissing.has(roomId)) return [];

  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: filesTableId,
      rowId: roomId,
    });

    let list = [];
    if (row?.files) {
      list = typeof row.files === "string" ? JSON.parse(row.files) : row.files;
    }

    if (isExpired(row)) {
      await deleteStoredFiles(list);
      await clearFiles();
      return [];
    }

    filesRowMissing.delete(roomId);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    if (isNotFound(error)) {
      filesRowMissing.add(roomId);
      return [];
    }
    throw error;
  }
}

export async function subscribeFiles(onChange) {
  const roomId = await getRoomId();
  let lastSent = Symbol("init");

  const push = async () => {
    try {
      const files = await getFiles();
      const key = JSON.stringify(files);
      if (key === lastSent) return;
      lastSent = key;
      onChange(files);
    } catch (error) {
      console.warn("[SkyShare] files poll failed", error);
    }
  };

  await push();
  const intervalId = setInterval(push, POLL_MS);

  let subscription = null;
  try {
    subscription = await realtime.subscribe(
      Channel.tablesdb(databaseId).table(filesTableId).row(roomId),
      (event) => {
        const deleted = (event.events || []).some((name) =>
          String(name).includes(".delete")
        );
        if (deleted) {
          filesRowMissing.add(roomId);
          lastSent = "[]";
          onChange([]);
          return;
        }
        filesRowMissing.delete(roomId);
        push();
      }
    );
  } catch (error) {
    console.warn("[SkyShare] files realtime unavailable, using poll only", error);
  }

  return () => {
    clearInterval(intervalId);
    subscription?.unsubscribe?.();
  };
}

export async function uploadFile(file) {
  const created = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.any()), Permission.delete(Role.any())],
  });

  const url = storage.getFileView({
    bucketId,
    fileId: created.$id,
  });

  return {
    url,
    type: file.type,
    name: file.name,
    id: created.$id,
  };
}

export { client, tablesDB, storage, realtime, bucketId, TTL_MS };
