import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message, documentText, currentHtml, referenceTexts, targetSectionHtml, targetSectionHeading, documentSections } = await request.json();

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
    const userContent = buildUserContent(message, documentText, currentHtml, referenceTexts, targetSectionHtml);

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
  return `당신은 한국어 문서 편집 전문 AI 어시스턴트입니다.

중요 규칙:
- 사용자가 업로드한 HTML 문서의 내용이 아래에 제공됩니다.
- 원본 HTML 구조를 절대 변경하지 마세요. 서식, CSS, 레이아웃을 그대로 유지합니다.
- 문서 수정 요청 시: 반드시 아래 JSON 형식으로 "찾아서 바꾸기" 목록을 반환하세요.

수정 응답 형식 (반드시 이 형식 사용):
\`\`\`json
[
  {"find": "원본에 있는 정확한 텍스트", "replace": "바꿀 텍스트"},
  {"find": "또 다른 원본 텍스트", "replace": "바꿀 텍스트"}
]
\`\`\`

규칙:
1. "find"는 원본 문서에 실제로 존재하는 텍스트여야 합니다 (HTML 태그 제외, 순수 텍스트만)
2. 빈 칸이나 공백만 있는 셀은 해당 위치의 앞뒤 텍스트로 식별하세요
3. 질문에는 일반 텍스트로 답변하세요 (JSON 형식 불필요)
4. 새 섹션 작성 요청 시에만 \`\`\`html 코드블록을 사용하세요

문서 섹션: ${sections.filter(Boolean).join(", ")}
${targetHeading ? `현재 대상 섹션: "${targetHeading}"` : ""}`;
}

function buildUserContent(message: string, documentText: string | null, currentHtml: string | null, refTexts: string, targetHtml: string | null): string {
  let content = message;

  if (documentText) {
    content += `\n\n--- 현재 문서 텍스트 내용 (발췌) ---\n${documentText.slice(0, 6000)}`;
  }

  if (currentHtml) {
    // HTML에서 주요 구조만 추출 (body 내부, 스타일 제외)
    const bodyMatch = currentHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : currentHtml;
    // 너무 긴 인라인 스타일/SVG 등 제거하여 토큰 절약
    const cleaned = bodyHtml
      .replace(/<svg[\s\S]*?<\/svg>/gi, "[SVG 이미지]")
      .replace(/data:image\/[^"']*/gi, "[BASE64 이미지]")
      .replace(/style="[^"]{200,}"/gi, 'style="..."')
      .slice(0, 15000);
    content += `\n\n--- 현재 문서 HTML (구조) ---\n${cleaned}`;
  }

  if (refTexts) {
    content += `\n\n--- 참조 자료 ---\n${refTexts.slice(0, 5000)}`;
  }

  if (targetHtml) {
    content += `\n\n--- 대상 섹션 HTML ---\n${targetHtml.slice(0, 2000)}`;
  }

  return content;
}

function generateSimulatedResponse(message: string, targetHeading: string | null): string {
  return `[시뮬레이션 모드] ANTHROPIC_API_KEY가 설정되지 않아 시뮬레이션 응답입니다.

요청: "${message}"
${targetHeading ? `대상 섹션: "${targetHeading}"` : ""}

실제 Claude API를 사용하려면 Vercel 환경변수에 ANTHROPIC_API_KEY를 추가하세요.`;
}
