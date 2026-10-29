

const allowedOrigins = [
  "https://rudakenai.pages.dev",
  "https://ai-chat-test.rudakenai.pages.dev"
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
      console.error("Chatbot CORS origin rejected");

      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: cors }
      );
    }

    try {
      if (!env.OPENAI_API_KEY) {
        console.error("Chatbot configuration: missing API key");

        return new Response(
          JSON.stringify({ error: "AI configuration unavailable" }),
          { status: 503, headers: cors }
        );
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
        let errorType = "unknown";
        let errorCode = "unknown";

        try {
          const errorData = await ai.json();

          errorType = String(
            errorData?.error?.type || "unknown"
          ).slice(0, 80);

          errorCode = String(
            errorData?.error?.code || "unknown"
          ).slice(0, 80);
        } catch {
          errorType = "unreadable_error_response";
        }

        console.error("OpenAI API request failed", {
          status: ai.status,
          type: errorType,
          code: errorCode
        });

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

      if (!reply) {
        console.error("OpenAI response contained no output text");
      }

      return new Response(
        JSON.stringify({
          reply: reply || "Please try again."
        }),
        { status: 200, headers: cors }
      );

    } catch (error) {
      console.error("Chatbot request failed", {
        type: error instanceof SyntaxError
          ? "invalid_json"
          : "request_or_runtime_error"
      });

      return new Response(
        JSON.stringify({ error: "Request failed" }),
        { status: 500, headers: cors }
      );
    }
  }
};


