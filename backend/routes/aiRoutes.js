// =====================================================
// AI ENTITY + FINANCE — preserved
// =====================================================

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

app.get("/ai/entity/:etype/:name", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const { etype, name } = req.params;

    const entityType = encodeURIComponent(etype);
    const entityName = encodeURIComponent(name);

    const response = await fetch(
      `${AI_SERVICE_URL}/ai/entity/${entityType}/${entityName}`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          entityType,
          entityName,
          data,
        },
        "AI entity upstream returned non-OK"
      );

      return res.status(502).json({ error: "AI_ENTITY_SERVICE_ERROR" });
    }

    return res.json(data);
  } catch (err) {
    clearTimeout(timeout);

    if (err?.name === "AbortError") {
      logger.error("AI entity request timed out");
      return res.status(504).json({ error: "AI_TIMEOUT" });
    }

    logger.error({ err }, "Entity lookup failed");
    return res.status(500).json({ error: "Entity info unavailable" });
  }
});

app.post("/ai/entities", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    8000
  );

  try {
    const response = await fetch(
      `${AI_SERVICE_URL}/ai/entities`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          req.body || {}
        ),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          data,
        },
        "AI entities upstream returned non-OK"
      );

      return res
        .status(502)
        .json({
          error: "AI_ENTITIES_SERVICE_ERROR",
        });
    }

    return res.json(data);
  } catch (err) {
    clearTimeout(timeout);

    if (err?.name === "AbortError") {
      logger.error(
        "AI entities request timed out"
      );

      return res
        .status(504)
        .json({
          error: "AI_TIMEOUT",
        });
    }

    logger.error(
      { err },
      "Entity detection failed"
    );

    return res
      .status(500)
      .json({
        error:
          "Entity detection unavailable",
      });
  }
});

app.post("/ai/finance", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/finance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          data,
        },
        "AI finance upstream returned non-OK"
      );

      return res.status(502).json({ error: "AI_SERVICE_ERROR" });
    }

    return res.json(data);
  } catch (err) {
    clearTimeout(timeout);

    if (err?.name === "AbortError") {
      logger.error("AI finance request timed out");
      return res.status(504).json({ error: "AI_TIMEOUT" });
    }

    logger.error({ err }, "Finance AI failed");
    return res.status(500).json({ error: "Finance AI unavailable" });
  }
});