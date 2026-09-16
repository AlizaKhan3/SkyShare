import { createHash } from "node:crypto";

export default async ({ req, res }) => {
  const rawIp = req.headers["x-appwrite-client-ip"];

  if (!rawIp) {
    return res.json({ error: "Could not detect your network." }, 400);
  }

  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;
  const roomId = createHash("sha256")
    .update(`net:${ip}`)
    .digest("hex")
    .slice(0, 32);

  return res.json({ roomId });
};
