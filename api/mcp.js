// The legacy dispatch workflows were retired. Keep a clear response for old clients.
export default function handler(_req, res) {
  return res.status(410).json({ error: "The legacy AppsWorld founder workflow endpoint has been retired." });
}
