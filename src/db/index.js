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

if (!roomFunctionId) {
  console.warn(
    "[SkyShare] Missing VITE_APPWRITE_ROOM_FUNCTION_ID — same-network sharing will not work."
  );
}

const client = new Client().setEndpoint(endpoint).setProject(projectId || "");
const tablesDB = new TablesDB(client);
const storage = new Storage(client);
const realtime = new Realtime(client);
const functions = new Functions(client);

let roomIdPromise = null;

async function getRoomIdFromSdk() {
  if (!roomFunctionId) {
    throw new Error("Room function is not configured.");
  }

  const execution = await functions.createExecution({
    functionId: roomFunctionId,
    body: "{}",
    async: false,
    method: "POST",
  });

  if (execution.status !== "completed") {
    throw new Error(
      `Room function status: ${execution.status}. ${execution.errors || ""}`.trim()
    );
  }

  let body = {};
  try {
    body = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("Room function returned invalid JSON");
  }

  if (!body.roomId) {
    throw new Error(body.error || "Room function returned no room id");
  }

  return body;
}

async function detectRoomId() {
  const result = await getRoomIdFromSdk();
  console.info(
    "[SkyShare] network room:",
    result.roomId,
    result.kind ? `(${result.kind})` : ""
  );
  return result.roomId;
}

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
