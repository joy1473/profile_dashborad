import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/ocr-extract
 * PDF 스캔 이미지에서 key-value 쌍 추출 (Claude Vision)
 */
export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, pageNumber } = await req.json();
    if (!imageDataUrl) {
      return NextResponse.json({ error: "imageDataUrl required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // API 키 없으면 fallback: 이미지만 반환
      return NextResponse.json({
        pairs: [],
        message: "ANTHROPIC_API_KEY not configured. Set it in .env.local for OCR.",
      });
    }

    const client = new Anthropic({ apiKey });

    // base64 데이터 추출
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid image data URL" }, { status: 400 });
    }
    const mediaType = match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `이 이미지는 한국어 사업계획서/입찰서류의 Page ${pageNumber}입니다.
이미지에서 보이는 모든 key-value 쌍(항목명-값)을 추출해주세요.

규칙:
1. 표(table) 형태의 데이터는 각 행의 (항목명, 값)으로 추출
2. 양식 필드(라벨: 값)도 추출
3. 체크박스/선택항목도 추출 (선택된 항목 표시)
4. 금액은 단위 포함 (예: "52,200천원")
5. 빈 칸은 value를 빈 문자열로

JSON 배열로 응답:
[{"key": "항목명", "value": "값", "confidence": 0.0~1.0}]

JSON만 응답하세요. 설명 없이.`,
            },
          ],
        },
      ],
    });

    // 응답 파싱
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let pairs: { key: string; value: string; confidence: number }[] = [];

    try {
      // JSON 배열 추출 (마크다운 코드블록 제거)
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      pairs = JSON.parse(jsonStr);
    } catch {
      console.error("OCR response parse error:", text);
      pairs = [];
    }

    return NextResponse.json({ pairs, pageNumber });
  } catch (err) {
    console.error("OCR API error:", err);
    return NextResponse.json(
      { error: "OCR processing failed", details: String(err) },
      { status: 500 }
    );
  }
}
