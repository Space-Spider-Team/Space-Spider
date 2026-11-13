# SageCare: Crew Health Monitoring for Deep-Space Missions

> A sensor-driven health monitoring and measurement-review platform for astronauts, with a linked base-station console. SageCare helps crew members understand their measurements, notice changes over time, and review them in the context of mission-approved procedures, even when the ground is minutes away.

Built for the **NASA Space Apps Challenge 2026: Create Health Monitoring Software for Astronauts on Space Missions** (challenge author: Brazilian Space Agency).

References are kept in [REFERENCES.md](REFERENCES.md).

---

## 1. Problem statement

Long-duration missions expose crews to the five hazards mapped by NASA's Human Research Program: **space radiation, isolation and confinement, distance from Earth, altered gravity, and hostile closed environments.** These can contribute to slow, easily missed changes in bone and muscle, the cardiovascular system, eyes, the immune system, sleep, nutrition, body mass, fluid balance and behavioral health.

On a Mars transit, one-way communication delay can reach about 4 to 24 minutes. The crew carries more of the responsibility for monitoring their own health, and astronauts are not doctors. Slow changes are hard to see in your own body, and daily manual self-reporting is unreliable under workload and fatigue.

**The question we address:**

> How can crew members **understand their measurements, notice changes, and review them in the context of mission-approved procedures**, with minimal manual entry and without depending on a live link to Earth?

## 2. Solution overview

SageCare has two applications connected by a delay-tolerant data link:

- **Crew App:** the astronaut's dashboard, notifications, history, trends, daily plan tracking, nutrition and fluid tracking, and a reference to mission-approved procedures.
- **Base Station Console:** the ground team's view of each crew member's data, trends and messages.

SageCare **informs and does not instruct.** It does not diagnose, classify a person as safe or unsafe, or prescribe a response.

### Main features

| # | Feature | What it does |
|---|---|---|
| 1 | **Health dashboard** | Profile (age, sex, body mass) and per-system cards: cardiovascular, bone, muscle, eyes, gastrointestinal, sleep, mental state, immune and more |
| 2 | **Measurement review** | Each measurement is shown against three kinds of information: general reference, personal baseline and trend (section 4) |
| 3 | **Notifications** | Neutral notices when a measurement is outside a selected reference range or differs from the astronaut's baseline, with debouncing and acknowledgment tracking |
| 4 | **Body status view** | A body map where each system shows its latest measurements, data quality and how they compare with reference, baseline and trend |
| 5 | **Sensor and gear status** | Battery, calibration age and signal quality for every device, so a sensor problem is not mistaken for a physiological change |
| 6 | **Live sensor ingest** | Continuous streams from wearables, exercise gear and suit diagnostics |
| 7 | **Nutrition tracking** | Food intake, individualized energy requirements and macronutrient targets, with the target and the recorded intake kept strictly separate (section 6) |
| 8 | **Body mass tracking** | Body mass measurements over time with the measurement method and timestamp |
| 9 | **Fluid intake tracking** | Recorded fluid intake and its source, compared with the mission-defined fluid target |
| 10 | **Messaging** | Two-way crew and base-station messages with priorities and simulated comm delay |
| 11 | **Base-station view** | Crew roster, per-astronaut history and trends, and a message thread |
| 12 | **Space time** | UTC, mission elapsed time, ship day-cycle time and comm delay in one clock |
| 13 | **Daily plan with automatic tracking** | Mission-assigned activities (exercise, sleep, measurements, medication) verified from sensors rather than typed in (section 7) |
| 14 | **History and trend view** | Multi-metric line charts with measurement context, baseline band and a descriptive trend |
| 15 | **Mission procedure reference** | Shows procedures that the mission and its flight surgeons have approved, and sends recent measurements to the base station |
| 16 | **Dynamic color theme** | Palette follows the ship's configured day cycle |
| 17 | **Projection** | A short-term statistical projection of each metric with its uncertainty, shown only when enough data exist |

### Provenance of every number

Not everything can be measured in flight. Each value carries a provenance tag:

- **Measured:** direct sensor or device reading (heart rate, SpO₂, blood pressure, temperature, body mass)
- **Derived:** calculated from several measurements (heart rate variability, sleep stages)
- **Estimated:** modeled (bone and muscle mass estimated from loading history, activity and periodic imaging or biomarkers)
- **Calculated target:** a requirement computed from the astronaut's profile (energy requirement, macronutrient targets). It is never displayed as an observation.

## 3. Measurement context

A number is meaningless without its conditions. Every reading stores:

| Field | Examples |
|---|---|
| Value and **unit** | 72 bpm, 118/76 mmHg, 92 mg/dL, 97 % |
| **Timestamp** | UTC and mission elapsed time |
| **Device** | Device ID, model, calibration age |
| **Measurement conditions** | Resting or exercising, posture, fasting or after eating, arm used, time since exercise |
| **Data quality** | Signal-quality score, motion, wear status |

Context decides which reference applies:

- **Heart rate during exercise is not interpreted like resting heart rate.** The two are separate metrics with separate references and baselines.
- **Blood pressure** is compared only with readings taken under comparable conditions (resting, seated or restrained, same arm, same cuff size).
- **Glucose** is separated by fasting and post-meal conditions.
- **SpO₂** is shown with signal quality and perfusion, since cold fingers and motion distort readings.
- A reading with missing or poor context is shown as **context incomplete** and is excluded from baseline and trend calculations.

## 4. How SageCare presents a measurement

Instead of a triage level, each measurement carries three kinds of information.

| Information | Meaning |
|---|---|
| **General reference** | Whether the value is within or outside a **properly sourced** reference range, shown only when an appropriate range exists for that metric and context. If none exists, the app says so. |
| **Personal baseline** | How the latest measurement compares with the astronaut's own established baseline (recent or preflight, depending on the metric) |
| **Trend** | Whether readings have been increasing, decreasing or remaining relatively stable over a stated window |

### Example wording

- "Your latest resting heart-rate measurement differs from your recent baseline. Check the measurement conditions and review it in accordance with your mission's approved procedures."
- "This measurement is outside the selected general reference range. Check the measurement conditions and review it in accordance with your mission's approved procedures."
- "Resting heart-rate readings have been relatively stable over the past 14 days."

### Language rules

SageCare does **not** use words such as "dangerous", "normal", "healthy", "act now" or "critical", and it does not prescribe a response. Wording stays descriptive and points to mission-approved procedures.

### Trend rules

- A trend needs a **minimum window and number of valid readings**, set per metric and configurable. Below that, the app says **insufficient data to describe a trend.**
- A trend based on three days of data is **not** treated as evidence of deterioration. Short series are shown as plain data without a direction label.
- Trend labels are descriptive (increasing, decreasing, relatively stable). Significance testing (Mann-Kendall or a Bayesian slope) is applied only when the window is long enough, and the window and method are shown to the user.
- Reference ranges, baselines and minimum windows live in a versioned configuration that mission medical staff can review and edit.

## 5. Tech stack

| Layer | Technology | Why it fits |
|---|---|---|
| Frontend framework | **Next.js (React) + TypeScript + Tailwind CSS** | Fast, responsive dashboard. CSS variables let the palette shift across the day cycle. |
| Data visualization | **Apache ECharts** (primary), Recharts for simple components | Interactive multi-metric line charts for history, baseline bands and projections |
| Backend and live streams | **Python (FastAPI) + WebSockets** | Real-time two-way messaging and telemetry, with Python analytics in the same service |
| Sensor ingestion | **MQTT (Mosquitto or HiveMQ)**, WebSockets for browser clients | Continuous high-frequency streams from wearables, exercise gear and suit diagnostics |
| Primary and time-series DB | **PostgreSQL + TimescaleDB** | Profiles, configuration and millions of timestamped readings with fast historical queries |
| Analytics | **Python: statsmodels, Prophet, scikit-learn** | Baselines, trend estimation, seasonality, projections and data-quality models |
| Offline layer | Service worker (PWA), IndexedDB | The crew app keeps working with no link |
| Quality | pytest and Hypothesis, Vitest, Playwright, GitHub Actions | Property tests on the reference and baseline engine, end-to-end tests |

**Deployment note:** TimescaleDB extension support differs by hosted provider. Verify it on Supabase or Neon before committing, and fall back to Timescale Cloud or a Docker-hosted Postgres with the extension if it is missing.

## 6. Nutrition, body mass and fluid intake

These are core features of the project.

### What is tracked

| Item | Description |
|---|---|
| **Individualized energy requirement** | Calculated from the astronaut's profile (age, sex, body mass, activity) using mission nutritional requirements |
| **Macronutrient targets** | Protein, carbohydrate and fat targets derived from the same requirements |
| **Food intake** | What was **recorded** as eaten, from galley or food-package events, optionally with a crew confirmation |
| **Body mass** | Measured with the onboard mass measurement device, with timestamp and method |
| **Fluid intake** | Recorded fluid from dispenser or bottle events, compared with the mission-defined fluid target |

### Targets are not intake

A calculated target is a **requirement**, not a record of consumption.

- Targets and recorded intake are stored in **separate tables and separate UI elements.**
- The app never shows that an astronaut has consumed their target merely because the target was calculated.
- If no intake data were recorded, the app shows **not recorded**, not zero and not the target.
- Dispensed fluid and scanned food packages are labeled **dispensed** or **opened**. They are shown as consumed only with crew confirmation, and the source is always visible.
- Intake summaries state which meals or days have no data, so gaps are never hidden.

The nutritional requirement values and equations will come from the mission nutrition documents supplied by the team (see [REFERENCES.md](REFERENCES.md)). SageCare does not invent its own formulas.

## 7. Daily plan with automatic tracking

The daily plan is **assigned by the mission and its medical staff.** SageCare tracks completion and does not generate clinical advice. Because manual entry is unreliable, each task has a **verification source** and a **confidence level**. A task is marked as completed only when the evidence passes a configured threshold, and self-report is flagged as lower confidence.

| Task | Passive verification | Confidence |
|---|---|---|
| Resistance or cardio session | Exercise-device telemetry (load, reps, duration), wrist IMU plus heart-rate pattern, camera pose-based rep counting (planned) | Verified |
| Sleep | Actigraphy, heart rate and HRV, cabin light and noise | Verified |
| Scheduled measurements | The cuff, oximeter or glucometer posts its own reading | Verified |
| Fluid | Dispenser or smart-bottle events | Recorded (dispensed, not confirmed consumed) |
| Food | Galley events and package scans | Recorded (opened or prepared, not confirmed eaten) |
| Medication | Smart dispenser open event | Recorded |
| Social contact | Call and message metadata only | Inferred |
| Anything else | Self-report | Low confidence |

## 8. Architecture

```
 SENSORS / GEAR                 ONBOARD (works offline)                      GROUND
 ──────────────                 ───────────────────────                      ──────
 wearables ─┐                  ┌─────────────────────────────────────┐
 exercise  ─┼─ MQTT ─────────▶ │ ingest + context + quality gate     │
 gear       │                  │ TimescaleDB (readings, config)       │
 suit diag ─┘                  │ reference + baseline + trend engine  │
 galley / bottle events        │ projection service (FastAPI)         │
 camera (planned)              │ procedure reference (mission-owned)  │
                               │ message queue (store-and-forward)    │
        WebSocket              │                                      │
 Crew App (Next.js) ◀────────▶ └──────────────┬──────────────────────┘
                                              │ delayed link (simulated 1 s to 24 min)
                                              ▼
                                   Base Station Console (Next.js)
```

**Design principles**

1. **Offline first.** Every onboard feature works with no ground link.
2. **Context before comparison.** A reading is compared only with references and baselines that match its conditions.
3. **Sensor problem is not a physiological change.** Notices pass through a data-quality check.
4. **Describe, don't decide.** Statistics describe measurements. Medical decisions belong to the crew, flight surgeons and mission-approved procedures.
5. **Delay-tolerant by design.** Messages and telemetry are queued and synced when the link allows.

### MQTT topic scheme

```
sagecare/{crew_id}/vitals/{metric}        # hr_rest, hr_exercise, bp, spo2, temp, glucose
sagecare/{crew_id}/activity/{source}      # imu, ared, treadmill, bike
sagecare/{crew_id}/sleep                  # actigraphy summary
sagecare/{crew_id}/nutrition/{event}      # food_opened, fluid_dispensed
sagecare/{crew_id}/body_mass              # mass device measurement
sagecare/gear/{device_id}/status          # battery, calibration, signal quality
sagecare/comms/{channel}                  # crew and base messages
```

### Core data model (TimescaleDB)

`astronaut` · `device` · `reading` (hypertable: time, crew_id, metric, value, unit, device_id, conditions, quality, provenance) · `baseline` · `reference_range` (source, context, version) · `notification` · `plan_task` · `task_verification` (source, confidence) · `energy_target` · `macro_target` · `intake_event` · `fluid_event` · `body_mass` · `projection` · `message` · `procedure_ref`

## 9. History and projection

### History and trend

- Multi-metric line charts with measurement context, the personal baseline band and, where one exists, the general reference range.
- Trends follow the rules in section 4, including **insufficient data** states.
- No composite health score is shown until the team and domain experts agree on how it should be defined.

### Projection

- **State-space trend models** (statsmodels) per metric, with prediction intervals, shown only when enough valid readings exist.
- **Prophet** for metrics with daily and weekly cycles when enough history is available.
- **Change-point detection** (CUSUM, EWMA) to describe when a series appears to shift.
- Output is statistical and descriptive: a projected range with uncertainty and a stated data window. It is not a prediction of a medical outcome and carries no recommendation.

### Evaluation

No open dataset of continuous astronaut physiology exists, so we build a **synthetic crew simulator** calibrated to published spaceflight findings. We report:

- How early baseline-based change detection flags a simulated shift compared with a fixed reference range
- False-notification rate
- Projection interval coverage

All results are labeled **simulation, not clinical validation.**

## 10. Mission procedure reference

SageCare does **not** author medical or first-aid instructions. It provides:

- A searchable library of procedures that the mission and its flight surgeons have **approved and supplied**, versioned and labeled with their source
- Links from a notification to the relevant mission procedure
- A one-tap report that sends recent measurements, context and data quality to the base station

## 11. Dynamic time-based theme

The palette follows the **ship's configured day cycle**, not the wall clock (the ISS sees about 16 sunrises a day). Colors are CSS variables updated as the cycle advances.

| Ship time | Palette |
|---|---|
| Midnight to dawn | Dark, low-glare, low blue light |
| Morning | Cool, bright, blue-enriched |
| Afternoon | Neutral and clear |
| Evening | Warm amber, dimmed |

Respects reduced-motion and contrast preferences. Information is never conveyed by color alone.

## 12. Using NASA OSDR data

The [NASA Open Science Data Repository](https://osdr.nasa.gov/bio/repo/) holds space biology data from GeneLab and the Ames Life Sciences Data Archive (ALSDA).

**Note:** most OSDR studies use model organisms, with a smaller amount of human data from non-NASA flights. They are an **evidence layer**, not a source of human reference ranges.

| Use | How |
|---|---|
| "Why this matters" cards | Curated OSDR studies per hazard and tissue, with dataset links |
| Hazard-to-tissue map | Filter by organism and tissue to show the evidence available per body system |
| Realistic test shapes | Public physiological tables (labeled as animal data) for testing chart and trend code |

- **Biological Data API:** `https://visualization.osdr.nasa.gov/biodata/api/v2/query/metadata/` and `/v2/query/data/`
- **Developer API:** `https://osdr.nasa.gov/osdr/data/osd/files/{OSD_ID}`
- An ETL script in `data/osdr-etl/` builds a small cached evidence bundle that ships with the app.

## 13. Repository structure

```
sagecare/
  apps/
    crew-app/            Next.js + TypeScript + Tailwind
    base-station/        Next.js (ground console)
  services/
    api/                 FastAPI: REST, WebSockets, messaging
    ingest/              MQTT subscriber, context and quality checks
    analytics/           baselines, trends, projection, simulator, evals
  packages/
    reference/           reference ranges, baselines, wording templates (with tests)
    procedures/          mission-supplied procedure library (schema and loader)
  data/
    osdr-etl/            OSDR pipeline and evidence bundle
  infra/                 docker-compose: Mosquitto, Postgres + Timescale
  docs/
  REFERENCES.md
```

## 14. Build plan

| Phase | Deliverable |
|---|---|
| 1 | Reading schema with context, reference and baseline engine, wording templates, synthetic crew simulator, tests |
| 2 | Docker stack, MQTT mock sensor fleet, TimescaleDB schema, ingest with context and quality checks |
| 3 | Trend and projection service plus ECharts history views |
| 4 | Crew App dashboard, body view, space-time clock, dynamic theme |
| 5 | Nutrition, body mass and fluid tracking (targets and intake kept separate) |
| 6 | Base Station console and delayed two-way messaging |
| 7 | Passive task verification and activity recognition |
| 8 | Procedure library, OSDR evidence layer, demo scenario, evaluation report |

## 15. Demo scenario (3 minutes)

1. The interface shifts to the ship's evening palette.
2. The history view shows resting heart-rate readings differing from the astronaut's baseline. The notice reads: check the measurement conditions and review in accordance with mission-approved procedures.
3. A short 3-day series is shown with **insufficient data to describe a trend**, to demonstrate the guardrail.
4. A loose chest strap appears as a sensor-quality issue, not a physiological change.
5. The nutrition view shows a calculated energy target next to **recorded intake with gaps marked "not recorded"**.
6. A report reaches the base station after the simulated delay.
7. The evaluation slide shows simulated detection results.

## 16. Safety and limitations

- A **research prototype for information and review**, not a medical device. It does not diagnose, classify safety status, or prescribe a response.
- Reference ranges and baselines are configurable and need review by qualified medical staff before any real use.
- Procedures shown in the app are supplied and approved by the mission. SageCare does not write them.
- Demo data are simulated. Projection performance is reported on simulation only.
- Real use would require encryption, access control and medical privacy handling. Data sharing with the base station is permissioned per astronaut.

## 17. Potential benefits

- **Crews:** clearer understanding of their measurements and how they change over time, with less manual logging.
- **Ground medical teams:** structured, context-labeled data and compact reports that may make delayed communication more productive.
- **Mission design:** one codebase adaptable to station, lunar and Mars habitats.
- **On Earth:** the same offline-first monitoring pattern could support remote and low-resource communities.
- **Open science:** an applied example of reusing OSDR data.

## 18. Team

*Add names and roles here.*