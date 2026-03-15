import csv
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = ROOT / "public" / "generated"

INVESTOR_TYPE_LABELS = {
    "ID": "Individual",
    "CP": "Corporate",
    "IB": "Insurance / Bank / Specific Institution",
    "IS": "Institutional",
    "SC": "Securities Company",
    "OT": "Other",
}

LOCAL_FOREIGN_LABELS = {
    "L": "Local",
    "A": "Foreign",
}


@dataclass(frozen=True)
class SnapshotFile:
    path: Path
    snapshot_id: str


def normalize_space(value: str) -> str:
    return " ".join((value or "").strip().split())


def normalize_code(value: str) -> str:
    return normalize_space(value).upper()


def normalize_name(value: str) -> str:
    cleaned = normalize_space(value)
    cleaned = cleaned.replace(" ,", ",").replace(" .", ".")
    return cleaned


def clean_country(value: str, *, mode: str) -> str:
    cleaned = normalize_space(value).upper()
    if not cleaned:
        return ""

    replacements = {
        "INDONESIA": "Indonesia" if mode == "domicile" else "Indonesian",
        "NDONESIA": "Indonesia" if mode == "domicile" else "Indonesian",
        "INDONESIAN": "Indonesia" if mode == "domicile" else "Indonesian",
        "I": "Indonesia" if mode == "domicile" else "Indonesian",
        "SINGAPORE": "Singapore" if mode == "domicile" else "Singaporean",
        "INGAPORE": "Singapore" if mode == "domicile" else "Singaporean",
        "SINGAPOREAN": "Singapore" if mode == "domicile" else "Singaporean",
        "INGAPOREAN": "Singapore" if mode == "domicile" else "Singaporean",
        "S": "Singapore" if mode == "domicile" else "Singaporean",
        "HONG KONG": "Hong Kong",
        "ONG KONG": "Hong Kong",
        "NG KONG": "Hong Kong",
        "TED STATES": "United States",
        "UNITE": "United States" if mode == "domicile" else "United States",
        "UNI": "United States" if mode == "domicile" else "United States",
        "ITZERLAND": "Switzerland",
        "SW": "Switzerland" if mode == "domicile" else "Switzerland",
        "MALAYSIA": "Malaysia" if mode == "domicile" else "Malaysian",
        "MALAYSIAN": "Malaysia" if mode == "domicile" else "Malaysian",
        "CHINESE": "China" if mode == "domicile" else "Chinese",
        "VIRGIN I": "British Virgin Islands",
        "SLANDS, BRITISH": "British Virgin Islands",
        "AN ISLANDS": "Cayman Islands",
        "CAYM": "Cayman Islands",
        "CAYMA": "Cayman Islands",
        "OUTH KOREAN": "South Korea" if mode == "domicile" else "South Korean",
        "AUDI ARABIAN": "Saudi Arabia" if mode == "domicile" else "Saudi Arabian",
    }
    if cleaned in replacements:
        return replacements[cleaned]

    if "KOREA" in cleaned and "REPUBLIC" in cleaned:
        return "South Korea" if mode == "domicile" else "South Korean"
    if cleaned == "REPUBLIC OF":
        return "South Korea"
    if "VIRGIN" in cleaned:
        return "British Virgin Islands"
    if "CAYMAN" in cleaned:
        return "Cayman Islands"

    return normalize_name(value)


def clean_local_foreign(value: str) -> tuple[str, str]:
    cleaned = normalize_code(value)
    if not cleaned:
        return "", "Unknown"
    if cleaned.startswith("L"):
        return "L", LOCAL_FOREIGN_LABELS["L"]
    if cleaned.startswith("A"):
        return "A", LOCAL_FOREIGN_LABELS["A"]
    return cleaned, "Unknown"


def clean_investor_type(value: str) -> tuple[str, str]:
    cleaned = normalize_code(value)
    if not cleaned:
        return "", "Unknown"
    return cleaned, INVESTOR_TYPE_LABELS.get(cleaned, cleaned)


def decimal_value(value: str) -> Decimal:
    try:
        return Decimal(normalize_space(value))
    except InvalidOperation:
        return Decimal(0)


def integer_value(value: str) -> int:
    stripped = normalize_space(value)
    return int(stripped) if stripped else 0


def safe_slug(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def investor_id(name: str) -> str:
    digest = hashlib.sha1(name.lower().encode("utf-8")).hexdigest()[:12]
    slug = safe_slug(name)[:48]
    return f"{slug}-{digest}" if slug else digest


def list_snapshot_files() -> list[SnapshotFile]:
    files: list[SnapshotFile] = []
    for path in sorted(ROOT.glob("*_normalized.csv")):
        if path.name.endswith("_normalized_id.csv"):
            continue
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            first = next(reader, None)
        if not first:
            continue
        snapshot_id = normalize_space(first["DATE"])
        files.append(SnapshotFile(path=path, snapshot_id=snapshot_id))
    return files


def choose_canonical(counter: Counter[str], fallback: str) -> str:
    if not counter:
        return fallback
    return sorted(counter.items(), key=lambda item: (-item[1], -len(item[0]), item[0]))[0][0]


def build_snapshot(snapshot_file: SnapshotFile) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
    rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    issuer_name_counts: dict[str, Counter[str]] = defaultdict(Counter)

    with snapshot_file.path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for line_number, source_row in enumerate(reader, start=2):
            share_code = normalize_code(source_row["SHARE_CODE"])
            issuer_name = normalize_name(source_row["ISSUER_NAME"])
            investor_name = normalize_name(source_row["INVESTOR_NAME"])
            investor_type_code, investor_type_label = clean_investor_type(source_row["INVESTOR_TYPE"])
            local_foreign_code, local_foreign_label = clean_local_foreign(source_row["LOCAL_FOREIGN"])
            nationality = clean_country(source_row["NATIONALITY"], mode="nationality")
            domicile = clean_country(source_row["DOMICILE"], mode="domicile")
            holdings_scripless = integer_value(source_row["HOLDINGS_SCRIPLESS"])
            holdings_scrip = integer_value(source_row["HOLDINGS_SCRIP"])
            total_holding_shares = integer_value(source_row["TOTAL_HOLDING_SHARES"])
            percentage = decimal_value(source_row["PERCENTAGE"])

            if holdings_scripless + holdings_scrip != total_holding_shares:
                warnings.append(
                    f"{snapshot_file.snapshot_id} {share_code} line {line_number}: holdings mismatch "
                    f"({holdings_scripless} + {holdings_scrip} != {total_holding_shares})"
                )

            if investor_type_code and investor_type_code not in INVESTOR_TYPE_LABELS:
                warnings.append(
                    f"{snapshot_file.snapshot_id} {share_code} line {line_number}: unmapped investor type {investor_type_code}"
                )

            if local_foreign_code and local_foreign_code not in LOCAL_FOREIGN_LABELS:
                warnings.append(
                    f"{snapshot_file.snapshot_id} {share_code} line {line_number}: noisy local/foreign code {local_foreign_code}"
                )

            issuer_name_counts[share_code][issuer_name] += 1
            rows.append(
                {
                    "snapshotDate": snapshot_file.snapshot_id,
                    "shareCode": share_code,
                    "issuerNameRaw": issuer_name,
                    "investorName": investor_name,
                    "investorId": investor_id(investor_name),
                    "investorTypeCode": investor_type_code,
                    "investorTypeLabel": investor_type_label,
                    "localForeignCode": local_foreign_code,
                    "localForeignLabel": local_foreign_label,
                    "nationality": nationality,
                    "domicile": domicile,
                    "holdingsScripless": holdings_scripless,
                    "holdingsScrip": holdings_scrip,
                    "totalHoldingShares": total_holding_shares,
                    "percentage": float(percentage),
                }
            )

    canonical_issuer_names = {
        share_code: choose_canonical(counter, share_code) for share_code, counter in issuer_name_counts.items()
    }

    issuer_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    investor_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    graph_nodes: dict[str, dict[str, Any]] = {}
    adjacency: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for share_code, counter in issuer_name_counts.items():
        if len(counter) > 1:
            variants = ", ".join(sorted(counter.keys()))
            warnings.append(f"{snapshot_file.snapshot_id} {share_code}: issuer name variants detected -> {variants}")

    for row in rows:
        share_code = row["shareCode"]
        issuer_name = canonical_issuer_names[share_code]
        row["issuerName"] = issuer_name
        row.pop("issuerNameRaw", None)
        issuer_rows[share_code].append(row)
        investor_rows[row["investorId"]].append(row)

    issuers_by_code: dict[str, Any] = {}
    investors_by_id: dict[str, Any] = {}

    for share_code, items in issuer_rows.items():
        items.sort(key=lambda item: (-item["percentage"], -item["totalHoldingShares"], item["investorName"]))
        percentage_sum = round(sum(item["percentage"] for item in items), 2)
        issuer_name = items[0]["issuerName"]
        issuers_by_code[share_code] = {
            "shareCode": share_code,
            "issuerName": issuer_name,
            "holderCount": len(items),
            "knownDisclosedPercentageSum": percentage_sum,
            "estimatedPublicRemainderPercentage": round(max(0.0, 100 - percentage_sum), 2),
            "knownDisclosedShares": sum(item["totalHoldingShares"] for item in items),
            "topInvestorName": items[0]["investorName"],
            "topInvestorPercentage": items[0]["percentage"],
        }
        issuer_node_id = f"issuer:{share_code}"
        graph_nodes[issuer_node_id] = {
            "id": issuer_node_id,
            "entityId": share_code,
            "type": "issuer",
            "label": issuer_name,
            "shareCode": share_code,
            "holderCount": len(items),
            "knownDisclosedPercentageSum": percentage_sum,
        }

    for investor_key, items in investor_rows.items():
        items.sort(key=lambda item: (-item["percentage"], item["shareCode"], item["issuerName"]))
        investor_name = items[0]["investorName"]
        investors_by_id[investor_key] = {
            "investorId": investor_key,
            "investorName": investor_name,
            "positionCount": len(items),
            "issuerCount": len({item["shareCode"] for item in items}),
            "topShareCode": items[0]["shareCode"],
            "topIssuerName": items[0]["issuerName"],
            "topPercentage": items[0]["percentage"],
        }
        investor_node_id = f"investor:{investor_key}"
        graph_nodes[investor_node_id] = {
            "id": investor_node_id,
            "entityId": investor_key,
            "type": "investor",
            "label": investor_name,
            "positionCount": len(items),
        }

    for row in rows:
        issuer_node_id = f"issuer:{row['shareCode']}"
        investor_node_id = f"investor:{row['investorId']}"
        edge_payload = {
            "targetId": investor_node_id,
            "counterpartName": row["investorName"],
            "counterpartType": "investor",
            "shareCode": row["shareCode"],
            "issuerName": row["issuerName"],
            "investorId": row["investorId"],
            "investorName": row["investorName"],
            "investorTypeCode": row["investorTypeCode"],
            "investorTypeLabel": row["investorTypeLabel"],
            "localForeignCode": row["localForeignCode"],
            "localForeignLabel": row["localForeignLabel"],
            "totalHoldingShares": row["totalHoldingShares"],
            "percentage": row["percentage"],
        }
        adjacency[issuer_node_id].append(edge_payload)
        adjacency[investor_node_id].append(
            {
                **edge_payload,
                "targetId": issuer_node_id,
                "counterpartName": row["issuerName"],
                "counterpartType": "issuer",
            }
        )

    for node_id, edges in adjacency.items():
        edges.sort(key=lambda edge: (-edge["percentage"], edge["counterpartName"], edge["targetId"]))

    search_index: list[dict[str, Any]] = []
    for issuer in issuers_by_code.values():
        search_index.append(
            {
                "type": "issuer",
                "id": issuer["shareCode"],
                "title": issuer["shareCode"],
                "subtitle": issuer["issuerName"],
                "description": f"{issuer['holderCount']} disclosed holders",
                "path": f"/snapshots/{snapshot_file.snapshot_id}/issuers/{issuer['shareCode']}",
                "terms": [
                    issuer["shareCode"],
                    issuer["issuerName"],
                    f"{issuer['shareCode']} {issuer['issuerName']}",
                ],
            }
        )
    for investor in investors_by_id.values():
        search_index.append(
            {
                "type": "investor",
                "id": investor["investorId"],
                "title": investor["investorName"],
                "subtitle": f"{investor['issuerCount']} issuers in snapshot",
                "description": investor["topIssuerName"],
                "path": f"/snapshots/{snapshot_file.snapshot_id}/investors/{investor['investorId']}",
                "terms": [
                    investor["investorName"],
                    investor["topIssuerName"],
                ],
            }
        )

    snapshot_data = {
        "snapshot": {
            "id": snapshot_file.snapshot_id,
            "date": snapshot_file.snapshot_id,
            "rowCount": len(rows),
            "issuerCount": len(issuers_by_code),
            "investorCount": len(investors_by_id),
            "warningCount": len(warnings),
        },
        "issuersByCode": issuers_by_code,
        "investorsById": investors_by_id,
        "issuerHoldings": issuer_rows,
        "investorPositions": investor_rows,
        "warnings": warnings,
    }
    graph_data = {
        "snapshotId": snapshot_file.snapshot_id,
        "settings": {
            "defaultHopLimit": 1,
            "maxHopLimit": 4,
            "defaultMinPercentage": 1,
            "defaultMaxEdgesPerNode": 12,
            "maxNodes": 180,
            "maxEdges": 260,
        },
        "nodes": graph_nodes,
        "adjacency": adjacency,
    }

    return snapshot_data, {"entries": search_index}, graph_data


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def main() -> int:
    snapshot_files = list_snapshot_files()
    if not snapshot_files:
        raise SystemExit("No *_normalized.csv files found.")

    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    manifest_snapshots: list[dict[str, Any]] = []
    latest_snapshot_id = max(snapshot.snapshot_id for snapshot in snapshot_files)

    for snapshot_file in snapshot_files:
        snapshot_data, search_index, graph_data = build_snapshot(snapshot_file)
        snapshot_id = snapshot_file.snapshot_id
        snapshot_dir = OUTPUT_ROOT / "snapshots" / snapshot_id
        write_json(snapshot_dir / "data.json", snapshot_data)
        write_json(snapshot_dir / "search-index.json", search_index)
        write_json(snapshot_dir / "graph.json", graph_data)
        manifest_snapshots.append(snapshot_data["snapshot"])

    manifest = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "latestSnapshotId": latest_snapshot_id,
        "snapshots": sorted(manifest_snapshots, key=lambda item: item["id"]),
    }
    write_json(OUTPUT_ROOT / "manifest.json", manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
