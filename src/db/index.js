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

async function hashToRoomId(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Same Wi‑Fi / router usually shares one public IP — used as the room key (like AirForShare). */
export async function getRoomId() {
  if (!roomIdPromise) {
    roomIdPromise = (async () => {
      const response = await fetch("https://api.ipify.org?format=json");
      if (!response.ok) {
        throw new Error("Could not detect your network. Check your connection.");
      }
      const { ip } = await response.json();
      if (!ip) {
        throw new Error("Could not detect your network IP.");
      }
      return hashToRoomId(ip);
    })().catch((error) => {
      roomIdPromise = null;
      throw error;
    });
  }
  return roomIdPromise;
}

function isNotFound(error) {
  return error?.code === 404;
}

export async function saveText(text) {
  const roomId = await getRoomId();
  return tablesDB.upsertRow({
    databaseId,
    tableId: textTableId,
    rowId: roomId,
    data: { text },
    permissions: publicPermissions,
  });
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
}

export async function getText() {
  const roomId = await getRoomId();
  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: textTableId,
      rowId: roomId,
    });
    return row?.text || "";
  } catch (error) {
    if (isNotFound(error)) return "";
    throw error;
  }
}

export async function subscribeText(onChange) {
  const roomId = await getRoomId();
  const text = await getText();
  onChange(text);

  const subscription = await realtime.subscribe(
    Channel.tablesdb(databaseId).table(textTableId).row(roomId),
    (event) => {
      const deleted = (event.events || []).some((name) =>
        String(name).includes(".delete")
      );
      if (deleted) {
        onChange("");
        return;
      }
      onChange(event.payload?.text || "");
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}

export async function saveFiles(files) {
  const roomId = await getRoomId();
  return tablesDB.upsertRow({
    databaseId,
    tableId: filesTableId,
    rowId: roomId,
    data: { files: JSON.stringify(files || []) },
    permissions: publicPermissions,
  });
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
}

export async function getFiles() {
  const roomId = await getRoomId();
  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: filesTableId,
      rowId: roomId,
    });
    if (!row?.files) return [];
    return typeof row.files === "string" ? JSON.parse(row.files) : row.files;
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

export async function subscribeFiles(onChange) {
  const roomId = await getRoomId();
  const files = await getFiles();
  onChange(files);

  const subscription = await realtime.subscribe(
    Channel.tablesdb(databaseId).table(filesTableId).row(roomId),
    (event) => {
      const deleted = (event.events || []).some((name) =>
        String(name).includes(".delete")
      );
      if (deleted) {
        onChange([]);
        return;
      }

      const raw = event.payload?.files;
      if (!raw) {
        onChange([]);
        return;
      }
      onChange(typeof raw === "string" ? JSON.parse(raw) : raw);
    }
  );

  return () => {
    subscription.unsubscribe();
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

export { client, tablesDB, storage, realtime, bucketId };
