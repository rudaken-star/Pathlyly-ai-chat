
const allowedOrigins = [
  "https://rudakenai.pages.dev"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = {
      "Access-Control-Allow-Origin":
        allowedOrigins.includes(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: allowedOrigins.includes(origin) ? 204 : 403,
        headers: cors
      });
    }

    if (
      new URL(request.url).pathname !== "/chat" ||
      request.method !== "POST"
    ) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: cors }
      );
    }

    if (!allowedOrigins.includes(origin)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: cors }
      );
    }

    try {
      if (!env.OPENAI_API_KEY) {
        throw new Error("Missing API key");
      }

      const body = await request.json();
      const message = body.message;

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 2000
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid message" }),
          { status: 400, headers: cors }
        );
      }

      const ai = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            instructions:
              "You are the PathLyly AI Solutions website assistant. Be helpful, professional, and concise. Do not invent company prices or policies. Invite interested customers to request a free demo.",
            input: message,
            max_output_tokens: 400
          })
        }
      );

      if (!ai.ok) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable" }),
          { status: 502, headers: cors }
        );
      }

      const data = await ai.json();
      const reply = (data.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");

      return new Response(
        JSON.stringify({ reply: reply || "Please try again." }),
        { headers: cors }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Request failed" }),
        { status: 500, headers: cors }
      );
    }
  }
};
