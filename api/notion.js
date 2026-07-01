// ============================================================
// Vercel Serverless Function — Notion API Proxy
// ============================================================
// This file sits between your widget and Notion's API.
// It keeps your NOTION_TOKEN secret (server-side only).
//
// Endpoints:
//   POST /api/notion  { action: "query", database_id: "..." }
//   POST /api/notion  { action: "page",  page_id: "..." }
// ============================================================

module.exports = async function handler(req, res) {
  // Allow the widget (any origin) to call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pre-flight request from browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check that the token is configured in Vercel env vars
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'NOTION_TOKEN is not set. Add it in your Vercel project → Settings → Environment Variables.'
    });
  }

  const notionHeaders = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  // Parse body (POST) or query string (GET)
  const body = req.method === 'POST' ? req.body : {};
  const { action, database_id, page_id } = { ...body, ...(req.query || {}) };

  try {
    // ── Query all pages in a database ──────────────────────
    if (action === 'query') {
      if (!database_id) {
        return res.status(400).json({ error: 'database_id is required for action=query' });
      }

      // Fetch up to 100 pages; add pagination if your database grows beyond that
      const response = await fetch(
        `https://api.notion.com/v1/databases/${database_id}/query`,
        {
          method: 'POST',
          headers: notionHeaders,
          body: JSON.stringify({ page_size: 100 })
        }
      );

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // ── Get a single page's properties ─────────────────────
    if (action === 'page') {
      if (!page_id) {
        return res.status(400).json({ error: 'page_id is required for action=page' });
      }

      const response = await fetch(
        `https://api.notion.com/v1/pages/${page_id}`,
        { method: 'GET', headers: notionHeaders }
      );

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(400).json({
      error: 'Unknown action. Use action=query (with database_id) or action=page (with page_id).'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
