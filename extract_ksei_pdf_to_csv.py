import csv
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from os.path import commonprefix
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENDOR_PYPDF = ROOT / ".vendor" / "pypdf"
if str(VENDOR_PYPDF) not in sys.path:
    sys.path.insert(0, str(VENDOR_PYPDF))

from pypdf import PdfReader


COLUMNS = [
    "DATE",
    "SHARE_CODE",
    "ISSUER_NAME",
    "INVESTOR_NAME",
    "INVESTOR_TYPE",
    "LOCAL_FOREIGN",
    "NATIONALITY",
    "DOMICILE",
    "HOLDINGS_SCRIPLESS",
    "HOLDINGS_SCRIP",
    "TOTAL_HOLDING_SHARES",
    "PERCENTAGE",
]

INDONESIAN_COLUMNS = [
    "Tanggal",
    "Kode Saham",
    "Nama Emiten",
    "Nama Investor",
    "Tipe Investor",
    "Lokal/Asing",
    "Kewarganegaraan",
    "Domisili",
    "Kepemilikan Scripless",
    "Kepemilikan Scrip",
    "Total Kepemilikan Saham",
    "Persentase",
]

DATE_PATTERN = re.compile(r"^\s*\d{2}-[A-Za-z]{3}-\d{4}\b")
SPACE_PATTERN = re.compile(r"\s+")
NUMERIC_TRAILER_PATTERN = re.compile(
    r"(?P<holdings_scripless>\d[\d\.]*)\s+"
    r"(?P<holdings_scrip>\d[\d\.]*)\s+"
    r"(?P<total_holding_shares>\d[\d\.]*)\s+"
    r"(?P<percentage>\d+,\d+)\s*$"
)
LEFT_SECTION_PATTERN = re.compile(
    r"^(?P<date>\d{2}-[A-Za-z]{3}-\d{4})\s+(?P<share_code>\S+)\s+(?P<rest>.*)$"
)
GAP_PATTERN = re.compile(r"\s{3,}")


def normalize_text(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value.strip())


def iso_date(value: str) -> str:
    return datetime.strptime(value, "%d-%b-%Y").strftime("%Y-%m-%d")


def plain_integer(value: str) -> str:
    return value.replace(".", "") if value else ""


def plain_decimal(value: str) -> str:
    return value.replace(".", "").replace(",", ".") if value else ""


def normalize_row(row: list[str]) -> list[str]:
    return [
        iso_date(row[0]),
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        plain_integer(row[8]),
        plain_integer(row[9]),
        plain_integer(row[10]),
        plain_decimal(row[11]),
    ]


def derived_path(path: Path, suffix: str) -> Path:
    return path.with_name(f"{path.stem}{suffix}{path.suffix}")


def write_csv(path: Path, header: list[str], rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(header)
        writer.writerows(rows)


def header_positions(header_line: str) -> dict[str, int]:
    labels = ["INVESTOR_TYPE", "LOCAL_FOREIGN", "NATIONALITY", "DOMICILE"]
    positions: dict[str, int] = {}
    search_from = 0
    for label in labels:
        idx = header_line.find(label, search_from)
        if idx == -1:
            raise ValueError(f"Could not find column {label!r} in header: {header_line!r}")
        positions[label] = idx
        search_from = idx + len(label)
    return positions


def split_nationality_and_domicile(prefix: str, positions: dict[str, int]) -> tuple[str, str]:
    tail = prefix[positions["NATIONALITY"] :].rstrip()
    if tail.strip():
        parts = re.split(r"\s{3,}", tail.strip(), maxsplit=1)
        if len(parts) == 2:
            return normalize_text(parts[0]), normalize_text(parts[1])

    nationality = normalize_text(
        prefix[positions["NATIONALITY"] : positions["DOMICILE"]]
    )
    domicile = normalize_text(prefix[positions["DOMICILE"] :])
    return nationality, domicile


def collect_page_rows(page) -> tuple[dict[str, int] | None, list[tuple[str, re.Match[str], re.Match[str]]]]:
    lines = page.extract_text(extraction_mode="layout").splitlines()
    header_line = next(
        (line for line in lines if "SHARE_CODE" in line and "INVESTOR_NAME" in line),
        None,
    )
    if header_line is None:
        return None, []

    positions = header_positions(header_line)
    page_rows: list[tuple[str, re.Match[str], re.Match[str]]] = []
    for line in lines:
        if not DATE_PATTERN.match(line):
            continue
        numeric_match = NUMERIC_TRAILER_PATTERN.search(line)
        if numeric_match is None:
            continue
        prefix = line[: numeric_match.start()].rstrip()
        left_section = prefix[: positions["INVESTOR_TYPE"]].rstrip()
        left_match = LEFT_SECTION_PATTERN.match(left_section)
        if left_match is None:
            continue
        page_rows.append((line, numeric_match, left_match))
    return positions, page_rows


def extract_rows(pdf_path: Path) -> list[list[str]]:
    reader = PdfReader(str(pdf_path))
    page_payloads: list[tuple[dict[str, int], list[tuple[str, re.Match[str], re.Match[str]]]]] = []
    issuer_candidates: dict[str, Counter[str]] = defaultdict(Counter)
    issuer_rests: dict[str, list[str]] = defaultdict(list)

    for page in reader.pages:
        positions, page_rows = collect_page_rows(page)
        if positions is None:
            continue

        page_payloads.append((positions, page_rows))
        for _, _, left_match in page_rows:
            share_code = left_match.group("share_code")
            rest = left_match.group("rest")
            issuer_rests[share_code].append(rest)
            gap_match = GAP_PATTERN.search(rest)
            if gap_match is not None:
                issuer_candidates[share_code][normalize_text(rest[: gap_match.start()])] += 1

    issuer_map: dict[str, str] = {}
    for share_code, rests in issuer_rests.items():
        if issuer_candidates[share_code]:
            issuer_map[share_code] = issuer_candidates[share_code].most_common(1)[0][0]
        elif len(rests) > 1:
            issuer_map[share_code] = normalize_text(commonprefix(rests))

    rows: list[list[str]] = []

    for positions, page_rows in page_payloads:
        for line, numeric_match, left_match in page_rows:
            prefix = line[: numeric_match.start()].rstrip()
            share_code = left_match.group("share_code")
            rest = left_match.group("rest")

            issuer_name = issuer_map.get(share_code, "")
            if issuer_name and rest.startswith(issuer_name):
                investor_name = normalize_text(rest[len(issuer_name) :])
            else:
                gap_match = GAP_PATTERN.search(rest)
                if gap_match is None:
                    raise ValueError(f"Could not split issuer/investor for share code {share_code}")
                issuer_name = normalize_text(rest[: gap_match.start()])
                investor_name = normalize_text(rest[gap_match.end() :])

            nationality, domicile = split_nationality_and_domicile(prefix, positions)

            rows.append(
                [
                    left_match.group("date"),
                    share_code,
                    issuer_name,
                    investor_name,
                    normalize_text(
                        prefix[positions["INVESTOR_TYPE"] : positions["LOCAL_FOREIGN"]]
                    ),
                    normalize_text(
                        prefix[positions["LOCAL_FOREIGN"] : positions["NATIONALITY"]]
                    ),
                    nationality,
                    domicile,
                    numeric_match.group("holdings_scripless"),
                    numeric_match.group("holdings_scrip"),
                    numeric_match.group("total_holding_shares"),
                    numeric_match.group("percentage"),
                ]
            )

    return rows


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: extract_ksei_pdf_to_csv.py <input.pdf> [output.csv]", file=sys.stderr)
        return 1

    pdf_path = Path(sys.argv[1]).resolve()
    if not pdf_path.exists():
        print(f"Input PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    output_path = (
        Path(sys.argv[2]).resolve()
        if len(sys.argv) >= 3
        else pdf_path.with_suffix(".csv")
    )

    rows = extract_rows(pdf_path)
    normalized_rows = [normalize_row(row) for row in rows]
    translated_output_path = derived_path(output_path, "_normalized_id")
    normalized_output_path = derived_path(output_path, "_normalized")

    write_csv(output_path, COLUMNS, rows)
    write_csv(normalized_output_path, COLUMNS, normalized_rows)
    write_csv(translated_output_path, INDONESIAN_COLUMNS, normalized_rows)

    print(f"Wrote {len(rows)} rows to {output_path}")
    print(f"Wrote {len(normalized_rows)} normalized rows to {normalized_output_path}")
    print(f"Wrote {len(normalized_rows)} translated rows to {translated_output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
