# Encar API recon — findings

Findings from the 2026-05-19 recon runs. Sample car: BMW X5 (G05) xDrive 30d M Sport, carid `40756868`, plate `251루5895`, VIN `WBACV6109KLJ71750`.

## Headline finding

**We do not need a separate 카히스토리 (KIDI) scraper or the ₩2,200/lookup paid integration.** Encar's `/v1/readside/record/vehicle/{id}/open` endpoint returns the full insurance/accident summary for free, sourced from the same KIDI data. The cost line item in the original plan can be removed.

VIN is also exposed in the inspection record — so we can cross-reference against manufacturer recall databases (BMW/Audi/VW) and EU/US history sources if a car was ever exported through there.

---

## Search endpoint

```
GET https://api.encar.com/search/car/list/premium
  ?count=true
  &q=<expression>
  &sr=|<sort>|<offset>|<limit>
```

**Query expression syntax** (dotted Lucene-like):
- `And.A._.B.` = AND
- `Or.A._.B.` = OR
- `C.A.` = single-select constraint
- `_.` = separator between operands
- Trailing `.` always required

**CarType facet (critical):**
- `CarType.Y` = domestic Korean cars (158,114 listings)
- `CarType.N` = imported cars (66,282 listings) ← our scope
- `CarType.A` = all (224,396)

**Sample query for imported BMW X5:**
```
(And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.)))
```
Returns Count=1285, 20 results per page.

**Manufacturer values are stored differently by origin:**
- Korean brands: Korean text (`현대`, `기아`, `제네시스`)
- Imported brands: English (`BMW`, `Audi`, `Volkswagen`)

**Sort options** seen: `ModifiedDate`. Others TBD — pull from iNav `Sort` metadata.

**Facet metadata endpoint** (use to discover available filters):
```
GET /search/car/list/premium?q=<expression>&inav=|Metadata|Sort
```
Returns `iNav.Nodes[]` — every facet name, every value, count under current filter.

**Listing payload** (per item in `SearchResults`):
| Field | Example | Notes |
|---|---|---|
| `Id` | 41837124 | carid — used in all detail endpoints |
| `Manufacturer` | `BMW` | English for imports, Korean for domestic |
| `Model` | `X5 (G05)` | Generation code in parens |
| `Badge` | `xDrive 30d M 스포츠` | Trim, mixed Korean/English |
| `Transmission` | `오토` | Auto |
| `FuelType` | `디젤` | 디젤/가솔린/하이브리드/전기 |
| `Year` | `202107.0` | YYYYMM as float |
| `FormYear` | `2021` | Model year |
| `Mileage` | `74008.0` | km |
| `Price` | `6250.0` | In **만원** (units of 10,000 KRW). 6250 = ₩62,500,000 |
| `OfficeCityState` | `광주` | Dealer city (Korean) |
| `OfficeName` | `(주)삼성모터스` | Dealer office |
| `DealerName` | `한상연` | Salesperson |
| `ModifiedDate` | `2026-05-20 01:41:05.000 +09` | KST |
| `Photo` | `/carpicture02/pic4182/41828720_` | Prefix; append `001.jpg`, `002.jpg`, ... |
| `Photos[]` | `[{type, location, ...}]` | Explicit list |
| `ServiceMark[]` | `["EncarMeetgo", "EncarDiagnosisP1"]` | Encar certification flags |
| `Condition[]` | `["Inspection", "Record", "Resume"]` | Flags for what data is available |

---

## Per-car detail endpoints

All `GET https://api.encar.com{path}` with carid in the path. No auth required.

### 1. Insurance/accident history — **the gold**
```
/v1/readside/record/vehicle/{carid}/open?vehicleNo={plate}
```
Returns the KIDI-sourced summary:
- `firstDate` — first registration
- `myAccidentCnt`, `otherAccidentCnt` — accident counts for this car vs. damage to others
- `myAccidentCost` — total cost across all "my" accidents in KRW
- `accidents[]` — per-accident breakdown: `type`, `date`, `insuranceBenefit`, `partCost`, `laborCost`, `paintingCost`
- `ownerChangeCnt`, `ownerChanges[]` — ownership history
- `carNoChangeCnt`, `carInfoChanges[]` — plate history
- `floodTotalLossCnt`, `floodPartLossCnt`, `floodDate` — flood damage
- `robberCnt`, `robberDate` — theft history
- `totalLossCnt`, `totalLossDate` — total loss declarations
- `government`, `business`, `loan` — usage flags (rental, taxi, financed)
- `notJoinDate1..5` — periods without insurance (red flag)
- `carShape` — body type
- `displacement` — engine cc

### 2. Performance inspection record (성능점검기록부)
```
/v1/readside/inspection/vehicle/{carid}
```
- `master.detail.vin` — **full 17-digit VIN** (cross-referenceable!)
- `master.detail.mileage`, `firstRegistrationDate`, `motorType` — engine code
- `master.detail.recall` + `recallFullFillTypes` — recall status
- `master.detail.waterlog`, `tuning`, `seriousTypes[]` — red-flag flags
- `master.detail.paintPartTypes[]` — repainted panels
- `master.detail.comments` — free-text inspector notes (Korean)
- `master.detail.boardStateType`, `carStateType` — overall state
- `inners[]` — system-by-system inspection (engine/trans/brakes/...) with 양호/불량 codes
- `outers[]` — exterior panel inspection
- `images[]` — diagram PNGs of panel damage map

### 3. Encar's own diagnosis (separate from inspection)
```
/v1/readside/diagnosis/vehicle/{carid}
```
- `items[]` — panel-by-panel: HOOD, FRONT_DOOR_LEFT, TRUNK_LID, etc., with `resultCode` (NORMAL/...)
- Includes a `CHECKER_COMMENT` text and final verdict like "무사고" (no accident)

### 4. Verified options/spec
```
/verification/{carid}/simple?optionIds=10,16,327,328,...
```
- `items[].option.optionName` — option name (Korean)
- `items[].option.category` — BASIC, EXTERIOR, INTERIOR, etc.
- `items[].value` — actual value found
- `items[].option.faultOption[]` — possible fault states (RIPPED/SCRATCH/NEEDS_RESTORE/...)

### 5. Dealer-highlighted selling points
```
/v1/readside/diagnosis/vehicle/{carid}/sellingpoint
```
Marketing copy from the dealer. Lower-priority.

### 6. Misc
- `/v1/readside/clean-encar/vehicle/{carid}` — Clean Encar program flag
- `/v1/vehicle/resume/valid?vehicleNo={plate}` — boolean: is the accident report still valid
- `/v1/readside/user/{dealerId}` — dealer profile (for trust scoring)

---

## Detail page URL (for screenshot/manual review)

```
http://www.encar.com/dc/dc_cardetailview.do?carid={carid}
```

The 78 listing-card links found via `a[href*="carid="]` confirms this is stable.

---

## Implications for the build

1. **No Playwright needed for normal operation** — every endpoint is plain JSON over HTTPS, no Cloudflare interception on `api.encar.com`. Keep Playwright only for recon and edge cases.
2. **One car = ~6 API calls** to fully enrich. Cheap to parallelize. Cache by carid + ModifiedDate.
3. **Translation surface is small** — most response data is structured codes (`statusType.code: "1"` = "양호" = Good). We translate the *code table* once, not every response. Free-text comments still need DeepL.
4. **The carhistory.or.kr paid integration is unnecessary** unless we discover the `/record/.../open` endpoint omits something material. Drop it from MVP.
5. **VIN is exposed** — we can layer in additional data sources later: BMW recall API, EU type-approval database, autoDNA for previously-imported cars, etc.

## Open questions for next session

- Pagination behavior past 1000 results — does Encar cap?
- Are there per-IP rate limits? Run a small load test before building.
- Photo URLs — are they on a CDN that requires Referer header? Test direct fetch.
- The carhistory `notJoinDate1..5` periods need decoding — is `"202004~202102"` always YYYYMM~YYYYMM?
- ModelGroup vs Model vs Badge — what's the hierarchy? Build a recon for the facet metadata to enumerate all VW/Audi/BMW SUV options.
