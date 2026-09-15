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

const SHARED_ROW_ID = "shared";

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

function isNotFound(error) {
  return error?.code === 404;
}

export async function saveText(text) {
  return tablesDB.upsertRow({
    databaseId,
    tableId: textTableId,
    rowId: SHARED_ROW_ID,
    data: { text },
    permissions: publicPermissions,
  });
}

export async function clearText() {
  try {
    await tablesDB.deleteRow({
      databaseId,
      tableId: textTableId,
      rowId: SHARED_ROW_ID,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function getText() {
  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: textTableId,
      rowId: SHARED_ROW_ID,
    });
    return row?.text || "";
  } catch (error) {
    if (isNotFound(error)) return "";
    throw error;
  }
}

export async function subscribeText(onChange) {
  const text = await getText();
  onChange(text);

  const subscription = await realtime.subscribe(
    Channel.tablesdb(databaseId).table(textTableId).row(SHARED_ROW_ID),
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
  return tablesDB.upsertRow({
    databaseId,
    tableId: filesTableId,
    rowId: SHARED_ROW_ID,
    data: { files: JSON.stringify(files || []) },
    permissions: publicPermissions,
  });
}

export async function clearFiles() {
  try {
    await tablesDB.deleteRow({
      databaseId,
      tableId: filesTableId,
      rowId: SHARED_ROW_ID,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function getFiles() {
  try {
    const row = await tablesDB.getRow({
      databaseId,
      tableId: filesTableId,
      rowId: SHARED_ROW_ID,
    });
    if (!row?.files) return [];
    return typeof row.files === "string" ? JSON.parse(row.files) : row.files;
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

export async function subscribeFiles(onChange) {
  const files = await getFiles();
  onChange(files);

  const subscription = await realtime.subscribe(
    Channel.tablesdb(databaseId).table(filesTableId).row(SHARED_ROW_ID),
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
