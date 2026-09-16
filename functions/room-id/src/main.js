import { createHash } from "node:crypto";

function normalizeNetworkKey(rawIp) {
  if (!rawIp) return null;

  let ip = String(rawIp).trim().toLowerCase();

  // IPv4-mapped IPv6 → plain IPv4
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  // Plain IPv4: same Wi‑Fi/router almost always shares this
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return `v4:${ip}`;
  }

  // IPv6: devices on the same LAN usually share a /64 prefix
  if (ip.includes(":")) {
    const expanded = expandIpv6(ip);
    if (!expanded) return `v6:${ip}`;
    const hextets = expanded.split(":");
    const prefix64 = hextets.slice(0, 4).join(":");
    return `v6:/64:${prefix64}`;
  }

  return `raw:${ip}`;
}

function expandIpv6(ip) {
  try {
    if (ip.includes(".")) return null; // mixed form without ::ffff already handled

    const [head, tail] = ip.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const missing = 8 - (headParts.length + tailParts.length);
    if (missing < 0) return null;

    const full = [
      ...headParts,
      ...Array(missing).fill("0"),
      ...tailParts,
    ].map((part) => part.padStart(4, "0"));

    if (full.length !== 8) return null;
    return full.join(":");
  } catch {
    return null;
  }
}

export default async ({ req, res }) => {
  const rawIp =
    req.headers["x-appwrite-client-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "";

  const networkKey = normalizeNetworkKey(rawIp);

  if (!networkKey) {
    return res.json({ error: "Could not detect your network." }, 400);
  }

  const roomId = createHash("sha256")
    .update(`net:${networkKey}`)
    .digest("hex")
    .slice(0, 32);

  // debug fields help verify same-network devices get the same room
  return res.json({
    roomId,
    kind: networkKey.startsWith("v4:")
      ? "ipv4"
      : networkKey.startsWith("v6:")
        ? "ipv6"
        : "other",
  });
};
