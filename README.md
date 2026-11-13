# SageCare: Crew Health Monitor

> An offline-first health self-assessment tool for astronauts on deep-space missions. It helps non-doctors measure, understand and act on their own health when the ground is minutes away or unreachable.

Built for the **NASA Space Apps Challenge 2026: Create Health Monitoring Software for Astronauts on Space Missions** (challenge author: Brazilian Space Agency).

---

## 1. Problem statement

Missions to the Moon and Mars last months to years. The crew is exposed to the five hazards mapped by NASA's Human Research Program: **space radiation, isolation and confinement, distance from Earth, altered gravity, and hostile closed environments.** These produce slow, easy-to-miss changes: bone and muscle loss, immune shifts, cardiovascular strain, poor sleep and nutrition, and behavioral health decline.

On a Mars transit, one-way communication delay can reach about 4 to 24 minutes. An emergency conversation with a flight surgeon becomes a delayed exchange, so **the crew becomes the first responder, including for themselves.** Astronauts are not doctors, and slow drifts are hardest to notice in your own body.

**The question we answer:**

> How can a crew member quickly check their own health, understand what the numbers mean in space, and know exactly what to do, including in an emergency, without needing a doctor on the line?

## 2. Our solution

Meridian turns daily measurements into a clear status, trend and next action:

| Need | What Meridian does |
|---|---|
| "How do I measure this?" | Step-by-step instructions for each indicator |
| "Is this normal?" | Green, amber, red status with a shape marker (accessible, not color-only) |
| "Why does it matter up here?" | Links each indicator to a spaceflight hazard (fluid shift, radiation, bone loading, isolation) |
| "Is something changing?" | Trend charts and rising or falling labels, with a shaded normal band |
| "What do I do now?" | Action text per status, plus emergency protocols with a compression pace guide |
| "Will I remember to do it?" | Daily mission routine with XP and levels |
| "My habitat is different" | Habitat profiles: station, Moon transit, lunar base, Mars |

### Indicators tracked

Heart rate, systolic and diastolic blood pressure, blood oxygen (SpO2), fasting blood sugar, body temperature, sleep hours, mood (1 to 5), and daily exercise minutes (bone and muscle countermeasure).

## 3. Methodology

1. **Hazard-first mapping.** We started from the five NASA HRP hazards and mapped each to the health risks it causes, then to indicators the crew can actually measure with onboard kit (cuff, oximeter, glucometer, thermometer, wearable, self-report).
2. **Body-region model.** Indicators roll up into five clickable regions (brain and mind, heart and lungs, metabolism, immune, bones and muscles), so a user sees the system, not a spreadsheet.
3. **Three-level triage.** Each reading is classified as *Normal / Watch / Act now* using configurable thresholds. Each level maps to a concrete action.
4. **Trend over snapshot.** A single value is less informative than direction. The app compares the last three days to the three before and flags rising or falling.
5. **Environment context.** Communication delay, gravity level and radiation exposure change the advice. On Mars the app emphasizes self-reliance.
6. **Design for non-experts.** Plain language, one primary action per screen, shape plus color status, keyboard accessible, dark and light themes, reduced-motion support.
7. **Evidence layer from NASA OSDR (in progress, see section 5).**

### Triage thresholds (prototype)

Thresholds are simplified from general adult reference ranges and are **configurable placeholders**. They have **not** been clinically validated against NASA's medical standards. They must be reviewed by a flight surgeon before any real use.

## 4. Architecture

```
 Inputs               Core (on device, offline)            Outputs
 ──────               ─────────────────────────            ───────
 manual entry   ─┐    ┌───────────────────────────┐   ┌─ body map (status by region)
 wearable feed  ─┼──▶ │ readings store (per day)  │──▶├─ trend charts
 (planned)       │    │ rules engine (thresholds) │   ├─ guidance (how / why / act)
 camera / photo ─┘    │ habitat profile           │   ├─ emergency protocols
 (planned)            │ gamification (XP, tasks)  │   └─ report for ground (planned)
                      └───────────────────────────┘
                                   ▲
                       OSDR evidence layer (planned, cached)
```

Design principle: **everything works with no network.** Evidence data from OSDR is cached before launch and refreshed when a link is available.

## 5. Using NASA OSDR data

The [NASA Open Science Data Repository](https://osdr.nasa.gov/bio/repo/) holds space biology data from GeneLab and the Ames Life Sciences Data Archive (ALSDA), including physiological, phenotypic, behavioral, imaging and environmental telemetry data. The repository search page can filter by data source (GeneLab, ALSDA, ESA) and data type (study).

**Important honesty note:** most OSDR studies use model organisms (rodents, plants, microbes, etc.), with a smaller amount of human data from non-NASA flights. They are not a source of human clinical thresholds. We use them as an **evidence layer**, not as a diagnosis engine.

### How we plan to use it

| Feature | OSDR role |
|---|---|
| **"Why this matters" evidence cards** | For each hazard, show curated OSDR studies (organism, tissue, spaceflight condition, assay) that support the explanation, with a link to the dataset |
| **Hazard-to-tissue map** | Query by tissue and organism (for example, bone, heart, kidney, liver, immune) to show which body systems have the most spaceflight evidence |
| **Condition filter** | Filter studies by spaceflight, radiation, simulated gravity, isolation and confinement, to match the habitat selector |
| **Demo and test data** | Use real physiological tables from public studies to test chart and trend code on realistic spaceflight shapes (labelled as animal data) |

### How we connect

- **Biological Data API:** `https://visualization.osdr.nasa.gov/biodata/api/v2/query/metadata/` with filters such as `study.characteristics.organism=mus musculus`, and `/v2/query/data/` for tabular data.
- **Developer API:** `https://osdr.nasa.gov/osdr/data/osd/files/{OSD_ID}` for file metadata and downloads.
- **Public AWS S3 bucket** for bulk data.
- Responses are filtered and cached into a small JSON bundle that the app ships with, so it runs offline.

*Status: the OSDR integration is planned work. The current prototype uses simulated crew data.*

## 6. Tech stack

**Current prototype**

- HTML, CSS and vanilla JavaScript in a single file (no build step, fast to run anywhere)
- Inline SVG for body map and charts
- Browser `localStorage` for readings and progress
- Barlow Semi Condensed typeface, theme-aware color tokens

**Planned**

- TypeScript and a PWA shell (service worker) for offline-first use
- Thresholds and protocols stored as JSON config, so flight surgeons can edit them without touching code
- OSDR evidence bundle built with a small Python script (requests and pandas)
- Optional web-bluetooth import from wearables
- Unit tests for the rules engine

## 7. Impact

- **For crews:** faster recognition of early drift (sleep, mood, exercise gaps) before it becomes a medical event, and calmer, clearer action during an emergency.
- **For flight surgeons:** structured, timestamped trend data that can be sent in a short report, which makes delayed communication more productive.
- **For mission design:** habitat-aware guidance supports station, lunar and Mars scenarios from one codebase.
- **On Earth:** the same offline self-assessment pattern can support remote and low-resource communities with limited access to health services.
- **For open science:** a concrete example of reusing OSDR data to make space biology findings visible to the people who live the risk.

## 8. Safety and limitations

- This is a **prototype for decision support**, not a medical device. It does not diagnose.
- Emergency steps follow general first-aid logic. A real mission must use its approved flight protocols first.
- Thresholds are unvalidated placeholders pending expert review.
- Data are stored locally in the browser. A real system needs encryption, access control and medical privacy handling.
- Current crew data in the demo is simulated.

## 9. Roadmap

1. OSDR evidence cards for each hazard
2. Radiation dose tracker and solar-event shelter timer
3. Crew-of-many view and shared emergency log
4. Photo or ultrasound upload with guided capture
5. Flight-surgeon report export (PDF)
6. Threshold review with a clinician and a personal baseline per astronaut (z-score from own history)
7. Multi-language support (English, Portuguese)

## 10. Run it

Open `astro-health.html` in any modern browser. No install needed.

## 11. References

- NASA Human Research Program: hazards of human spaceflight and Human Research Roadmap
- NASA Open Science Data Repository: https://osdr.nasa.gov/bio/repo/
- OSDR Biological Data API: https://visualization.osdr.nasa.gov/biodata/api
- OSDR tutorials: https://osdr-tutorials.readthedocs.io/
- NASA Space Apps Challenge 2026, Brazilian Space Agency challenge brief

## 12. Team

-> Sule 
-> Burhan
-> Celina
-> Raza