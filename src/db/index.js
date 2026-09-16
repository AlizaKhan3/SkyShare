import {
  Client,
  TablesDB,
  Storage,
  Realtime,
  Functions,
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
const roomFunctionId = import.meta.env.VITE_APPWRITE_ROOM_FUNCTION_ID;

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
const functions = new Functions(client);

let roomIdPromise = null;

async function hashToRoomId(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function fetchCloudflareIpv4() {
  const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Cloudflare IP lookup failed");
  }

  const text = await response.text();
  const match = text.match(/^ip=([^\n\r]+)/m);
  const ip = match?.[1]?.trim();

  if (!ip || ip.includes(":")) {
    throw new Error("Cloudflare returned no IPv4 address");
  }

  return ip;
}

async function fetchIpifyIpv4() {
  const response = await fetch("https://api4.ipify.org?format=json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("ipify IP lookup failed");
  }

  const data = await response.json();
  const ip = String(data?.ip || "").trim();

  if (!ip || ip.includes(":")) {
    throw new Error("ipify returned no IPv4 address");
  }

  return ip;
}

async function fetchPublicIpv4() {
  const results = await Promise.allSettled([
    fetchCloudflareIpv4(),
    fetchIpifyIpv4(),
  ]);

  const ips = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (ips.length === 0) {
    throw new Error("Could not detect your network. Check your connection.");
  }

  const uniqueIps = [...new Set(ips)];
  if (uniqueIps.length > 1) {
    console.warn("[SkyShare] IP sources disagreed, using Cloudflare:", uniqueIps);
    return ips[0];
  }

  return ips[0];
}

async function getRoomIdFromFunction() {
  const execution = await functions.createExecution({
    functionId: roomFunctionId,
    async: false,
  });

  if (execution.status !== "completed") {
    throw new Error("Room function did not complete");
  }

  const body = JSON.parse(execution.responseBody || "{}");
  if (!body.roomId) {
    throw new Error(body.error || "Room function returned no room id");
  }

  return body.roomId;
}

async function detectRoomId() {
  if (roomFunctionId) {
    try {
      const roomId = await getRoomIdFromFunction();
      console.info("[SkyShare] room via Appwrite function:", roomId);
      return roomId;
    } catch (error) {
      console.warn("[SkyShare] room function failed, using client IP fallback", error);
    }
  }

  const ip = await fetchPublicIpv4();
  const roomId = await hashToRoomId(`ip4:${ip}`);
  console.info("[SkyShare] room via public IPv4:", ip, "→", roomId);
  return roomId;
}

/** Same Wi‑Fi/router → same public IPv4 → same Appwrite row. */
export async function getRoomId() {
  if (!roomIdPromise) {
    roomIdPromise = detectRoomId().catch((error) => {
      roomIdPromise = null;
      throw error;
    });
  }
  return roomIdPromise;
}

export function resetRoomId() {
  roomIdPromise = null;
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
