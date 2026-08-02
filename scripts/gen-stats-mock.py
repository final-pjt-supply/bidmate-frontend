# -*- coding: utf-8 -*-
"""통계 화면 목업 데이터를 실제 DB에서 생성한다 (임시).

집계 테이블과 API가 준비되면 이 스크립트와 src/lib/data/stats-mock.json은 지운다.
가짜 숫자 대신 실제 수치를 쓰는 이유는, 축 범위나 이름 길이가 실제와 다르면
레이아웃·신뢰성 판단이 빗나가기 때문이다. 실제로 이 방식 덕에 아래 문제들이
커밋 전에 드러났다.

여기서 처리하는 데이터 함정 (전부 실측으로 확인)
  1. '각 수요기관'은 기관이 아니라 다수공급자·제3자단가계약의 플레이스홀더다.
     물품에서 1,051건(11.1%)으로 건수 1위이고, 금액은 343조가 나온다
     ("금속제창" 단일 공고가 236조 — 단가 x 총예상수량이라 계약금액이 아니다).
     1조 초과 12건 중 11건이 이 값이다. 기관 순위에서 제외한다.
  2. 외자는 presmpt_prce가 565건 전부 0이고 bdgt_amt는 아예 없다.
     "금액이 0"이 아니라 "금액 정보가 없다"는 뜻이라 null로 내보낸다.
     0을 사실로 그리면 "외자는 전부 5천만 미만"이라는 거짓이 화면에 뜬다.
  3. 기관명이 지사 단위로 쪼개져 있다. 공사 상위 8개 중 6개가 한국철도공사의
     지사였다. 상위 기관명이 그 자체로 존재하면 하위를 그쪽으로 묶는다
     (데이터에서 유도 — 손으로 만든 매핑표를 두지 않는다).
  4. 시계열에 값이 없는 달·주는 행 자체가 없다. 그대로 두면 축에서 사라져
     "그때부터 발주가 생긴 것"처럼 읽힌다. 0으로 채운다.
  5. 진행 중인 달을 모든 집계에서 똑같이 뺀다. 총계만 8월을 포함하고 월별은
     빼면 헤더 총계와 추세 막대 합이 2건 어긋난다(실제로 그랬다).
  6. 기관 순위는 건수용·금액용을 따로 뽑는다. 건수 top-N을 금액으로 재정렬하면
     금액 순위가 틀린다(이전 버전의 실제 버그).

실행:
  RDS 접속 정보는 파이프라인 레포의 .env를 읽는다.
  python scripts/gen-stats-mock.py
"""
import json
import re
from collections import defaultdict
from pathlib import Path

import psycopg2

PIPELINE_ENV = Path(r"C:\Users\user\Desktop\PROJECTS\bidding-agent\.env")
OUT = Path(__file__).resolve().parent.parent / "src" / "lib" / "data" / "stats-mock.json"

MAS_PLACEHOLDER = "각 수요기관"
TOP_N = 8
BUCKET_SQL = """CASE WHEN b.presmpt_prce < 5e7 THEN 0 WHEN b.presmpt_prce < 2e8 THEN 1
  WHEN b.presmpt_prce < 1e9 THEN 2 WHEN b.presmpt_prce < 5e9 THEN 3 ELSE 4 END"""
# 태그 신뢰도가 낮은 건 파이프라인이 source에 _low를 붙인다. 통계에서 빼면 분포가
# 왜곡되므로 태그별 집계에서만 제외하고, 업종 전체(ALL)에는 남긴다.
# LIKE '%_low' 대신 right()를 쓴다 — psycopg2가 파라미터 있는 쿼리에서 %_를
# 자리표시자로 해석해 IndexError를 낸다.
TAG_JOIN = "JOIN bid_tags t ON t.bid_id = b.bid_id AND right(t.source, 4) <> '_low'"
CLOSED_MONTHS = "b.bid_ntce_dt < date_trunc('month', CURRENT_DATE)"


def connect():
    env = {}
    for line in PIPELINE_ENV.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Za-z_]+)=(.*)$", line.strip())
        if m:
            env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return psycopg2.connect(host=env["RDS_Host"], dbname=env["RDS_DB"],
                            user=env["RDS_Username"], password=env["RDS_Password"], port=5432)


# 상위기관의 하위조직임을 알려주는 꼬리말. 이게 붙은 경우에만 묶는다.
SUBUNIT = re.compile(r"(본부|지사|지역본부|사업소|사업단|관리단|출장소|센터|지부|지원단"
                     r"|사무소|영업소|지방청|세관|우체국|보건소|지청)$")
# 이름이 겹쳐도 별개 발주 주체다. "충청북도"와 "충청북도교육청"은 예산도 담당자도 다르다.
INDEPENDENT = re.compile(r"(교육청|대학교|대학|공사|공단|재단|진흥원|연구원|병원|공항공사"
                         r"|시설관리공단|도시공사|의료원|과학관|박물관)$")


def build_parent_map(cur) -> dict:
    """기관명 → 상위기관명. 하위조직으로 보이는 경우에만 묶는다.

    묶는 이유: 공사 상위 8개 중 6개가 한국철도공사의 지사였다. 슬롯 6개를 써서
    "철도공사가 많다" 하나만 말한다.

    묶는 조건 두 가지를 다 만족해야 한다.
      1. 상위기관명이 데이터에 독립 행으로 존재한다 (손으로 만든 매핑표를 두지
         않는다 — 기관이 2,027개라 유지가 안 되고 새 기관이 들어오면 조용히 틀린다)
      2. 남는 꼬리가 하위조직 어휘로 끝난다 (본부/지사/센터…)

    2번이 없으면 "충청북도교육청"이 "충청북도"로 들어간다. 실제로 규칙을 넓게
    잡았을 때 219건이 그렇게 잘못 묶였다 — 교육청·대학교·공사는 이름이 겹쳐도
    예산과 담당자가 다른 별개 발주 주체다.

    띄어쓰기가 들쭉날쭉해서(있는 것도 없는 것도 있다) 공백을 지우고 비교한다.
    """
    cur.execute("SELECT DISTINCT dminstt_nm FROM bid_table WHERE dminstt_nm IS NOT NULL")
    names = [r[0] for r in cur.fetchall()]
    by_key = {re.sub(r"\s+", "", n): n for n in names}
    keys = sorted(by_key, key=len)   # 짧은 것부터 봐야 가장 상위로 붙는다
    parent = {}
    for k in keys:
        for cand in keys:
            if len(cand) >= len(k):
                break
            if not k.startswith(cand) or len(cand) < 4:   # 2~3글자는 우연 일치가 많다
                continue
            tail = k[len(cand):]
            if SUBUNIT.search(tail) and not INDEPENDENT.search(tail):
                parent[by_key[k]] = by_key[cand]
            break
    return parent


def fill_gaps(rows, axis):
    """축에 빠진 구간을 0으로 채운다. 시리즈마다 축 범위가 다르면 비교가 안 되므로
    전체 축을 기준으로 맞춘다."""
    axis_values = sorted({r[axis] for r in rows})
    by_series = defaultdict(dict)
    for r in rows:
        by_series[(r["c"], r["tag"])][r[axis]] = r["cnt"]
    out = []
    for (c, tag), series in by_series.items():
        for v in axis_values:
            out.append({axis: v, "c": c, "tag": tag, "cnt": series.get(v, 0)})
    return out


def main():
    conn = connect()
    cur = conn.cursor()
    parent = build_parent_map(cur)
    out = {}

    # 업종별 총계 — 화면이 모집단(분모)을 보여줄 수 있게
    cur.execute(f"SELECT b.bid_category, count(*) FROM bid_table b WHERE {CLOSED_MONTHS} GROUP BY 1")
    out["totals"] = {c: n for c, n in cur.fetchall()}
    cur.execute(f"SELECT b.bid_category, t.tag, count(*) FROM bid_table b {TAG_JOIN} WHERE {CLOSED_MONTHS} GROUP BY 1,2")
    tag_totals = defaultdict(dict)
    for c, tag, n in cur.fetchall():
        tag_totals[c][tag] = n
    out["tagTotals"] = tag_totals

    # 태그 목록(상위 N). 상위 8개가 물량의 71~91%를 덮는다.
    out["tags"] = {
        c: [{"tag": t, "cnt": n} for t, n in sorted(d.items(), key=lambda x: -x[1])[:TOP_N]]
        for c, d in tag_totals.items()
    }

    # 금액 정보가 없는 업종 — 0을 "금액이 작다"로 그리지 않기 위해
    cur.execute(f"SELECT b.bid_category, sum(b.presmpt_prce), count(b.bdgt_amt) FROM bid_table b WHERE {CLOSED_MONTHS} GROUP BY 1")
    out["amountUnavailable"] = [c for c, s, b in cur.fetchall() if (s or 0) == 0 and b == 0]

    # 월별 (업종 전체 + 업종x태그). 진행 중인 달은 뺀다.
    cur.execute(f"""SELECT to_char(b.bid_ntce_dt,'YYYY-MM'), b.bid_category, 'ALL', count(*)
        FROM bid_table b WHERE {CLOSED_MONTHS} GROUP BY 1,2""")
    monthly = [{"m": a, "c": b, "tag": c, "cnt": d} for a, b, c, d in cur.fetchall()]
    cur.execute(f"""SELECT to_char(b.bid_ntce_dt,'YYYY-MM'), b.bid_category, t.tag, count(*)
        FROM bid_table b {TAG_JOIN} WHERE {CLOSED_MONTHS} GROUP BY 1,2,3""")
    monthly += [{"m": a, "c": b, "tag": c, "cnt": d} for a, b, c, d in cur.fetchall()]
    out["monthly"] = fill_gaps(monthly, "m")

    # 기관 순위. 건수용과 금액용을 따로 뽑는다.
    # 금액은 '각 수요기관'을 빼고, 지사는 상위기관으로 묶은 뒤 재집계한다.
    cur.execute(f"""SELECT b.bid_category, 'ALL', b.dminstt_nm, count(*), sum(b.presmpt_prce)
        FROM bid_table b WHERE b.dminstt_nm <> %s AND {CLOSED_MONTHS} GROUP BY 1,2,3""", (MAS_PLACEHOLDER,))
    raw = [(a, b, c, d, e) for a, b, c, d, e in cur.fetchall()]
    cur.execute(f"""SELECT b.bid_category, t.tag, b.dminstt_nm, count(*), sum(b.presmpt_prce)
        FROM bid_table b {TAG_JOIN} WHERE b.dminstt_nm <> %s AND {CLOSED_MONTHS} GROUP BY 1,2,3""", (MAS_PLACEHOLDER,))
    raw += [(a, b, c, d, e) for a, b, c, d, e in cur.fetchall()]

    merged = defaultdict(lambda: [0, 0])
    for c, tag, name, cnt, amt in raw:
        key = (c, tag, parent.get(name, name))
        merged[key][0] += cnt
        merged[key][1] += int(amt or 0)

    by_group = defaultdict(list)
    for (c, tag, name), (cnt, amt) in merged.items():
        by_group[(c, tag)].append({"name": name, "cnt": cnt, "eok": round(amt / 1e8)})

    inst = {"byCount": [], "byAmount": []}
    for (c, tag), rows in by_group.items():
        for r in sorted(rows, key=lambda x: -x["cnt"])[:TOP_N]:
            inst["byCount"].append({"c": c, "tag": tag, **r})
        for r in sorted(rows, key=lambda x: -x["eok"])[:TOP_N]:
            inst["byAmount"].append({"c": c, "tag": tag, **r})
    out["institutions"] = inst
    # 순위에서 뺀 단가계약 건수 — 화면이 각주로 밝힐 수 있게
    cur.execute(f"SELECT b.bid_category, count(*) FROM bid_table b WHERE b.dminstt_nm=%s AND {CLOSED_MONTHS} GROUP BY 1", (MAS_PLACEHOLDER,))
    out["excludedMas"] = {c: n for c, n in cur.fetchall()}

    # 예산 구간. 경계는 실무 기준선이다(소액수의 5천만 / 적격심사 2억 / 종합심사 10억).
    cur.execute(f"SELECT b.bid_category,'ALL',{BUCKET_SQL},count(*) FROM bid_table b WHERE {CLOSED_MONTHS} GROUP BY 1,2,3")
    budget = [{"c": a, "tag": b, "b": c, "cnt": d} for a, b, c, d in cur.fetchall()]
    cur.execute(f"SELECT b.bid_category,t.tag,{BUCKET_SQL},count(*) FROM bid_table b {TAG_JOIN} WHERE {CLOSED_MONTHS} GROUP BY 1,2,3")
    budget += [{"c": a, "tag": b, "b": c, "cnt": d} for a, b, c, d in cur.fetchall()]
    out["budget"] = budget

    cur.execute(f"SELECT min(b.bid_ntce_dt)::date, max(b.bid_ntce_dt)::date "
                f"FROM bid_table b WHERE {CLOSED_MONTHS}")
    lo, hi = cur.fetchone()
    out["period"] = {"from": lo.strftime("%Y-%m"), "to": hi.strftime("%Y-%m")}

    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"저장: {OUT}  ({OUT.stat().st_size // 1024}KB)")
    print("  총계:", out["totals"])
    print("  금액 정보 없는 업종:", out["amountUnavailable"])
    print("  순위 제외된 단가계약:", out["excludedMas"])
    print("  기간:", out["period"])
    conn.close()


if __name__ == "__main__":
    main()
