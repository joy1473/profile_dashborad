# bid-document-automation Design Document

> **Summary**: Python 스크립트 4종으로 입찰 문서 3종(수행계획서, 사업비 총괄표, 별지서식 가이드) 자동 생성
>
> **Project**: SaaS Dashboard (더폴스타 입찰 자동화)
> **Version**: 0.1.0
> **Author**: Claude
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [bid-document-automation.plan.md](../../01-plan/features/bid-document-automation.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 양식 파일의 **원본 서식/스타일을 100% 보존**하면서 텍스트만 치환
2. 사업비 **자동 계산** — 비목별 합계, 기관별 분담, 75/25 비율 정합성 보장
3. 한컴오피스/Excel에서 **바로 편집 가능**한 출력물
4. 단일 실행(`python run_all.py`)으로 3종 문서 일괄 생성

### 1.2 Design Principles

- 양식 복사 후 치환 (원본 파괴 없음)
- 데이터와 로직 분리 (`bid_data.py` vs 생성 스크립트)
- 실패 시 명확한 에러 메시지

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        run_all.py                            │
│                     (일괄 실행 스크립트)                       │
├──────────┬──────────────┬──────────────┬─────────────────────┤
│          │              │              │                     │
│  bid_data.py    generate_      generate_      generate_     │
│  (데이터 정의)   proposal.py    budget.py      forms.py     │
│                 (수행계획서)    (사업비표)      (별지서식)    │
│                     │              │              │          │
│                     ▼              ▼              ▼          │
│              02_수행계획서    02_사업비       02_별지서식     │
│                .hwpx        총괄표.xlsx     _가이드.md      │
└──────────────────────────────────────────────────────────────┘

입력 파일:
  ├── 1. 수행계획서 양식.hwpx  (zipfile로 읽기)
  ├── 2. 별지서식.hwp          (olefile로 읽기)
  ├── 3. 사업비 총괄표.xlsx    (openpyxl로 읽기)
  └── 01. 기업인터뷰.xls       (xlrd로 읽기)
```

### 2.2 Dependencies

| Component | Library | Purpose |
|-----------|---------|---------|
| HWPX 읽기/쓰기 | `zipfile` + `xml.etree.ElementTree` | ZIP 내 XML 파싱/수정 |
| HWP 읽기 | `olefile` | OLE2 PrvText 스트림 |
| XLSX 읽기/쓰기 | `openpyxl` | 셀 값 주입, 수식 유지 |
| XLS 읽기 | `xlrd` | 기업인터뷰 데이터 |
| 파일 복사 | `shutil` | 양식 파일 복사 |

모두 **이미 설치 완료**.

---

## 3. Data Model

### 3.1 bid_data.py 데이터 구조

```python
# ── 기관 정보 ──
LEAD_ORG = {
    "name": "(주)더폴스타",
    "name_en": "The Polestar Co., Ltd.",
    "ceo": "최원선",
    "biz_no": "___-__-_____",        # 사용자 입력 필요
    "address": "_______________",      # 사용자 입력 필요
    "homepage": "http://www.thepolestar.co.kr/",
    "org_type": "중소기업",
    "employees": 6,
    "revenue": "약 8억원",
    "specialty": "스폰서십 효과분석, 미디어 분석, 마케팅 리서치",
    "role": "보유+활용",  # 보유기관 + 활용기관
}

PARTNER_ORG_1 = {
    "name": "(주)스포츠앤커뮤니케이션",
    "name_short": "S&C",
    "ceo": "윤기철",
    "biz_no": "___-__-_____",
    "address": "_______________",
    "homepage": "http://www.sncmg.com",
    "org_type": "중소기업",
    "employees": 18,
    "revenue": "약 72억원",
    "specialty": "스포츠마케팅, 선수 매니지먼트, 5대 프로스포츠",
    "role": "보유",
}

PARTNER_ORG_2 = {
    "name": "TBD (보유기관 추가 필요)",
    "role": "보유",
}

# ── 과제 정보 ──
PROJECT = {
    "title": "AI 기반 스포츠 스폰서십 데이터 연계·분석 서비스",
    "program": "2026년 기업 데이터 연계·활용 지원사업",
    "field": "스포츠산업",
    "period": "2026.5.8 ~ 2026.12.7",
    "period_months": 7,
}

# ── 총괄책임자 ──
PI = {
    "name": "최원선",
    "dept": "대표이사",
    "position": "대표",
    "org": "(주)더폴스타",
}

# ── 사업비 ──
TOTAL_BUDGET = 700_000_000  # 7억원
GOV_RATIO = 0.75
PRIVATE_RATIO = 0.25

BUDGET_ITEMS = {
    "인건비": {
        "보수": 200_000_000,
        "상용임금": 130_000_000,
        "일용임금": 20_000_000,
    },
    "사업운영비": {
        "일반수용비": 50_000_000,
        "공공요금 및 제세": 10_000_000,
        "특근매식비": 5_000_000,
        "임차료": 25_000_000,
        "일반용역비": 50_000_000,
    },
    "여비": {
        "국내여비": 21_000_000,
    },
    "업무추진비": 14_000_000,
    "연구용역비": 140_000_000,
    "유형자산": 35_000_000,
}

# 기관별 분담 비율
ORG_SHARE = {
    "lead": 0.60,      # 더폴스타 60%
    "partner1": 0.30,   # S&C 30%
    "partner2": 0.10,   # TBD 10%
}
```

---

## 4. Script Specifications

### 4.1 generate_budget.py — 사업비 총괄표 XLSX 생성

**입력**: `2. 사업수행계획서 등 신청서식/3. 사업비 총괄표.xlsx`
**출력**: `02_사업비 총괄표.xlsx`

**처리 로직**:

```python
# 1. 양식 파일 복사
shutil.copy2(template_path, output_path)

# 2. openpyxl로 열기
wb = openpyxl.load_workbook(output_path)

# 3. Sheet "1. 사업비 총괄표" 데이터 주입
ws = wb["1. 사업비 총괄표"]
# 주관기관 (columns K~P)
ws["K9"] = budget["인건비"]["보수"] * org_share["lead"] * gov_ratio     # 보수 - 정부
ws["L9"] = budget["인건비"]["보수"] * org_share["lead"] * private_ratio  # 보수 - 현금
# ... (각 비목별, 기관별 반복)

# 참여기관1 (columns R~W)
# 참여기관2 (columns Y~AD)

# 4. Sheet "2. 연락정보" 데이터 주입
ws2 = wb["2. 연락정보"]
ws2["C5"] = lead_org["name"]
ws2["F5"] = pi["name"]
# ...

# 5. 저장
wb.save(output_path)
```

**셀 매핑 (Sheet 1)**:

| 행 | 비목 | 총괄(B~H) | 주관기관(J~P) | 참여1(R~W) | 참여2(Y~AD) |
|----|------|-----------|-------------|-----------|-------------|
| 9 | 보수 | 수식(합계) | K9=정부, L9=현금 | R9, S9 | Y9, Z9 |
| 10 | 상용임금 | 수식 | K10, L10 | R10, S10 | Y10, Z10 |
| 11 | 일용임금 | 수식 | K11, L11 | R11, S11 | Y11, Z11 |
| 13 | 일반수용비 | 수식 | K13, L13 | R13, S13 | Y13, Z13 |
| 14 | 공공요금 | 수식 | K14, L14 | R14, S14 | Y14, Z14 |
| 15 | 특근매식비 | 수식 | K15, L15 | R15, S15 | Y15, Z15 |
| 16 | 임차료 | 수식 | K16, L16 | R16, S16 | Y16, Z16 |
| 17 | 일반용역비 | 수식 | K17, L17 | R17, S17 | Y17, Z17 |
| 19 | 국내여비 | 수식 | K19, L19 | R19, S19 | Y19, Z19 |
| 20 | 업무추진비 | 수식 | K20, L20 | R20, S20 | Y20, Z20 |
| 21 | 연구용역비 | 수식 | K21, L21 | R21, S21 | Y21, Z21 |
| 22 | 유형자산 | 수식 | K22, L22 | R22, S22 | Y22, Z22 |

> **핵심**: 총괄 열(C~H)과 합계 행(8,12,18,23)은 **수식을 유지** — 개별 비목 셀에만 값 주입

**연락정보 시트 매핑**:

| 셀 | 내용 |
|----|------|
| B5, C5 | 주관기관 구분, 기관명 |
| D5 | 소속팀 |
| E5 | 역할 (총괄책임자) |
| F5, G5 | 이름, 직위 |
| B7, C7 | 참여기관, 기관명 |

---

### 4.2 generate_proposal.py — 수행계획서 HWPX 생성

**입력**: `2. 사업수행계획서 등 신청서식/1. 수행계획서 양식.hwpx`
**출력**: `02_수행계획서.hwpx`

**처리 로직**:

```python
# 1. 양식 HWPX 복사
shutil.copy2(template_path, output_path)

# 2. ZIP으로 열기 → section XML 추출
with zipfile.ZipFile(output_path, 'r') as zin:
    contents = {}
    for name in zin.namelist():
        contents[name] = zin.read(name)

# 3. section XML 텍스트 치환
for name in contents:
    if name.startswith('Contents/section') and name.endswith('.xml'):
        xml_str = contents[name].decode('utf-8')
        xml_str = apply_replacements(xml_str, REPLACEMENTS)
        contents[name] = xml_str.encode('utf-8')

# 4. 새 ZIP으로 쓰기
with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name, data in contents.items():
        zout.writestr(name, data)
```

**치환 규칙 (REPLACEMENTS)**:

| 양식 원문 | 치환값 |
|----------|--------|
| `OOOOOO 서비스` | `AI 기반 스포츠 스폰서십 데이터 연계·분석 서비스` |
| `□ 전 분야(분야명:     )` | `■ 전 분야(분야명: 스포츠산업)` |
| `기 관 명` 다음 빈칸 | `(주)더폴스타` |
| `사업자등록번호` 다음 빈칸 | 사업자번호 |
| `홍길동(洪吉童` | `최원선` |
| `http://` (홈페이지) | `http://www.thepolestar.co.kr/` |

> **중요**: HWPX XML은 `<hp:t>` 태그 안에 텍스트가 있음. XML 파싱으로 정확한 위치 찾아 치환.

**XML 구조 예시**:
```xml
<hp:p>
  <hp:run>
    <hp:t>OOOOOO 서비스</hp:t>
  </hp:run>
</hp:p>
```

**치환 전략**: 2단계
1. **단순 문자열 치환** — 플레이스홀더 텍스트(`OOOOOO`, `홍길동` 등)를 replace
2. **XML 파싱 치환** — 특정 위치의 `<hp:t>` 노드를 찾아 값 변경 (복잡한 표 구조)

---

### 4.3 generate_forms.py — 별지서식 가이드 생성

**입력**: `2. 사업수행계획서 등 신청서식/2. 별지서식.hwp` (참조용)
**출력**: `02_별지서식_가이드.md` (Markdown)

> HWP 바이너리 직접 쓰기 불가 → 기업 정보가 채워진 **작성 가이드**를 Markdown으로 출력.
> 사용자가 한컴오피스에서 별지서식.hwp 열고 가이드 내용을 복사-붙여넣기.

**생성 내용**:

```markdown
# 별지서식 작성 가이드

## [별지서식 제1호] 참여기관의 참여의사 확인서
- 주관기관: (주)더폴스타
- 참여기관: (주)스포츠앤커뮤니케이션
- 과제명: AI 기반 스포츠 스폰서십 데이터 연계·분석 서비스
- 사업기간: 2026.5.8 ~ 2026.12.7
- 참여기관 역할: 5대 프로스포츠 마케팅 데이터 제공, 실증 환경 지원

## [별지서식 제2호] 참여인력의 참여확인서
| 기관명 | 성명 | 소속/직위 | 참여율(%) | 역할 |
|--------|------|----------|-----------|------|
| (주)더폴스타 | 최원선 | 대표이사 | 30 | 총괄책임자 |
| (주)더폴스타 | ___ | ___팀/___  | 100 | AI 개발 |
| (주)S&C | 윤기철 | 대표이사 | 20 | 세부책임자 |
| (주)S&C | ___ | ___팀/___ | 80 | 데이터 제공 |

## [별지서식 제3호] 개인정보 수집·이용·제공 동의서
(참여인력 전원 각 1부 — 인원수만큼 출력)

## [별지서식 제4호] 현금출자(납입) 확약서
- (주)더폴스타: 현금 자부담 ___원 (총 민간부담금 105,000,000원 중)
- (주)S&C: 현금 자부담 ___원 (총 민간부담금 52,500,000원 중)

## [별지서식 제5호] 신청자격 적정성 확인서
- 기관별 1부 (사업자등록증, 재무제표 기반)

## [별지서식 제6호] 기자재 구입 및 활용계획서
| 품목 | 규격 | 수량 | 단가 | 금액 | 용도 |
|------|------|------|------|------|------|
| GPU 서버 | NVIDIA A100 80GB | 1 | 25,000,000 | 25,000,000 | AI 모델 학습 |
| 분석 워크스테이션 | i9/64GB/RTX4090 | 1 | 10,000,000 | 10,000,000 | 데이터 전처리 |
```

---

### 4.4 run_all.py — 일괄 실행

```python
#!/usr/bin/env python3
"""입찰 문서 3종 일괄 생성"""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent  # 입찰/ 폴더
TEMPLATE_DIR = BASE_DIR / "2. 사업수행계획서 등 신청서식"
OUTPUT_DIR = BASE_DIR

def main():
    print("=" * 60)
    print("2026년 기업 데이터 연계·활용 지원사업 - 입찰 문서 생성")
    print("=" * 60)

    # Step 1: 사업비 총괄표
    print("\n[1/3] 사업비 총괄표 생성...")
    from generate_budget import generate_budget
    generate_budget(
        template=TEMPLATE_DIR / "3. 사업비 총괄표.xlsx",
        output=OUTPUT_DIR / "02_사업비 총괄표.xlsx",
    )
    print("  ✓ 02_사업비 총괄표.xlsx 생성 완료")

    # Step 2: 수행계획서
    print("\n[2/3] 수행계획서 생성...")
    from generate_proposal import generate_proposal
    generate_proposal(
        template=TEMPLATE_DIR / "1. 수행계획서 양식.hwpx",
        output=OUTPUT_DIR / "02_수행계획서.hwpx",
    )
    print("  ✓ 02_수행계획서.hwpx 생성 완료")

    # Step 3: 별지서식 가이드
    print("\n[3/3] 별지서식 가이드 생성...")
    from generate_forms import generate_forms_guide
    generate_forms_guide(
        output=OUTPUT_DIR / "02_별지서식_가이드.md",
    )
    print("  ✓ 02_별지서식_가이드.md 생성 완료")

    # Summary
    print("\n" + "=" * 60)
    print("생성 완료! 아래 파일을 확인하세요:")
    print(f"  1. {OUTPUT_DIR / '02_사업비 총괄표.xlsx'}")
    print(f"  2. {OUTPUT_DIR / '02_수행계획서.hwpx'}")
    print(f"  3. {OUTPUT_DIR / '02_별지서식_가이드.md'}")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

---

## 5. Error Handling

| 상황 | 처리 |
|------|------|
| 양식 파일 없음 | FileNotFoundError + 경로 안내 |
| HWPX ZIP 손상 | zipfile.BadZipFile + 양식 재다운로드 안내 |
| XLSX 시트명 불일치 | KeyError + 사용 가능한 시트 목록 출력 |
| 사업비 합계 불일치 | 검증 후 경고 메시지 (합계 ≠ 7억) |
| XML 치환 대상 없음 | 경고 출력 (치환 0건) |

---

## 6. Test Plan

### 6.1 검증 항목

| # | 테스트 | 방법 | 기대결과 |
|---|--------|------|----------|
| 1 | XLSX 합계 검증 | Python 스크립트 내 assert | 총합 = 700,000,000 |
| 2 | XLSX Excel 호환 | Excel에서 열기 | 수식 동작, 서식 유지 |
| 3 | HWPX 한컴오피스 호환 | 한컴오피스에서 열기 | 텍스트 치환 확인, 서식 유지 |
| 4 | 기관 정보 정합성 | 3종 문서 간 기관명 대조 | 동일 |
| 5 | 사업비 기관별 합계 | lead + partner1 + partner2 = total | 정확 |

---

## 7. Implementation Order

1. [ ] `bid_data.py` — 데이터 정의 (기관, 과제, 사업비)
2. [ ] `generate_budget.py` — 사업비 총괄표 XLSX 생성 (가장 구조적, 검증 용이)
3. [ ] `generate_proposal.py` — 수행계획서 HWPX 생성 (XML 치환)
4. [ ] `generate_forms.py` — 별지서식 가이드 Markdown 생성
5. [ ] `run_all.py` — 일괄 실행 + 검증
6. [ ] 사용자 검토 → 내용 보완

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — 4개 스크립트 상세 설계 | Claude |
