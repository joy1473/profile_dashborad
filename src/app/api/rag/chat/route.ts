import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message, referenceTexts, targetSectionHtml, targetSectionHeading, documentSections } = await request.json();

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      // API 키 없으면 시뮬레이션 응답
      const simulated = generateSimulatedResponse(message, targetSectionHeading);
      return new Response(simulated, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Claude API 호출 (스트리밍)
    const systemPrompt = buildSystemPrompt(documentSections, targetSectionHeading);
    const userContent = buildUserContent(message, referenceTexts, targetSectionHtml);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      const errMsg = `AI 오류 (${res.status}): ${errText.slice(0, 200)}`;
      return new Response(errMsg, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // SSE 스트림을 텍스트 스트림으로 변환
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) { controller.close(); return; }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(new TextEncoder().encode(parsed.delta.text));
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: any) {
    console.error("RAG chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildSystemPrompt(sections: string[], targetHeading: string | null): string {
  return `당신은 한국어 문서 작성 전문 AI 어시스턴트입니다.
사용자가 사업계획서, 제안서, 보고서 등의 섹션 내용을 요청하면 참조 자료를 기반으로 정확하고 전문적인 내용을 작성합니다.

문서 섹션 목록: ${sections.filter(Boolean).join(", ")}
${targetHeading ? `현재 대상 섹션: "${targetHeading}"` : ""}

작성 규칙:
- 한국어로 작성
- 표(table)는 HTML 태그로 작성
- 정량적 수치와 근거를 포함
- 간결하고 전문적인 톤 유지
- HTML 코드를 포함할 경우 \`\`\`html 코드블록으로 감싸기`;
}

function buildUserContent(message: string, refTexts: string, targetHtml: string | null): string {
  let content = message;
  if (refTexts) {
    content += `\n\n--- 참조 자료 ---\n${refTexts.slice(0, 8000)}`;
  }
  if (targetHtml) {
    content += `\n\n--- 현재 섹션 HTML ---\n${targetHtml.slice(0, 2000)}`;
  }
  return content;
}

function generateSimulatedResponse(message: string, targetHeading: string | null): string {
  return `[시뮬레이션 모드] ANTHROPIC_API_KEY가 설정되지 않아 시뮬레이션 응답입니다.

요청: "${message}"
${targetHeading ? `대상 섹션: "${targetHeading}"` : ""}

실제 Claude API를 사용하려면 Vercel 환경변수에 ANTHROPIC_API_KEY를 추가하세요.`;
}
