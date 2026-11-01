# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS served by Vercel (cleanUrls), no build step. Three.js and GSAP (with ScrollTrigger) loaded as ES modules / scripts for 3D and motion. One serverless function, `api/contact.js` (nodemailer over SMTP, env vars SMTP_USER / SMTP_PASS / MAIL_TO). Bilingual: English at the root, French under `/fr/`, kept at parity (confirmed by the user, 2026-11-01).

## Users

- Security decision-makers of sensitive sites: prisons, energy and industrial sites (OIV), regional airports, stadiums and event organisers. They evaluate whether SkyKraken can protect their perimeter and integrate with their existing tools.
- Law enforcement and gendarmerie units: they need to know which drone, where the pilot is, and to hand over evidence.
- Private security companies and their agents in the field (SK-1 detector).
- Integrators certified on Genetec Security Center and Milestone XProtect, and C2 / radar vendors looking for an identity layer (Horizon API, Eyes plugin).

Most visitors arrive on desktop at work, often from a forwarded link or after a meeting, and judge credibility quickly before requesting a demonstration.

## Product Purpose

SkyKraken is a French company (Cockpit Bordeaux Technowest, 58 avenue Marcel Dassault, 33700 Mérignac) building passive radio-frequency drone detection. It answers three questions: is there a drone, which drone, where is the pilot — and turns each flight into evidence. Success for the website: a qualified visitor understands the product range in seconds, trusts the technical expertise, and requests a demonstration.

## Product Range (from the October 2026 product brochure and Eyes documents)

1. **SkyKraken Mobile** (the case / la valise) — autonomous and mobile; carried, opened, powered on. Passively identifies drones in seconds with drone and pilot position. 100 % local: no internet, no connection. DJI drones: model, serial number, positions of drone, pilot and take-off point. European Remote ID over WiFi and Bluetooth. Operator-drawn protection zones (circle or polygon). Whitelist of friendly drones. Voice and audible alerts. Threat classifier 0–100 with 4 levels (low, medium, high, critical) explained rule by rule (zone, altitude, speed, approach, night flight). Legal evidence: PDF dossier per flight with classification reasons, trajectory, timestamped chronology and SHA-256 fingerprint (chain of custody), exported on USB key. Calendar of captured flights. Auto start, touch screen, offline map of all of France, usable by a non-technician.
2. **SkyKraken Horizon** (fixed station, "première série", built to order) — watches a site 24/7 from a mast, brings the case's functions to a permanent install and talks directly to the customer's systems. Range up to 10 km in line of sight on clear terrain; real range measured on site during the trial. Single network cable for power and data (PoE). Open API: REST and WebSocket (tracks, identities, positions, threat levels, zones), webhooks, MQTT, custom formats. Connectors developed by SkyKraken and delivered tested: alerts to C2 / tactical situation, VMS alarms (Milestone, Genetec), automatic PTZ camera pointing (ONVIF), radar + radio identity fusion, alert broadcast over loudspeakers. Sensor fusion both ways, association by position and time, deduplication, explained threat. Conventions: WGS 84, UTC timestamps, stable track IDs, authenticated access. Integration method: technical workshop → development and tests → commissioning and follow-up.
3. **SkyKraken SK-1** (FPV detector, pre-order, delivery 10–12 weeks) — field tablet that detects FPV drones (fast, low, no identifier, no Remote ID). 4 bands monitored on 4 channels: 1.2 · 3.3 · 5.8 · 6.5 GHz. 7" screen under sun hood showing the drone's analog FPV video. Spectrum screen, confidence index, audible and visual alert. 191 × 218 × 55 mm, about 1 kg, shock corners, built-in battery recharged by USB-C, 100 % passive.
4. **SkyKraken Eyes** (software, in development — pilot programme) — AI that detects drones on cameras already installed, as a plugin for Genetec Security Center and Milestone XProtect, with the **Trace** evidence layer. Reads RTSP everywhere (ONVIF cameras directly, Milestone AI Bridge / Open Network Bridge, Genetec Media Gateway). Sends alerts to Milestone (analytics events / REST Events API) and Genetec (Web SDK), webhook and MQTT for others. Search in archives by zone and period. Trace: timestamped dossier sealed by fingerprint (clips, trajectory, map, RF detections), PDF export. Fusion with the case/Horizon: an RF detection points a PTZ camera at the drone, AI confirms visually. Runs on the customer's servers, on-premise. Limit stated honestly: a camera sees a drone at short to medium range; Eyes is for compact sites and visual confirmation, not a radar replacement.

## Positioning

French, sovereign, 100 % passive RF detection that identifies the drone AND locates the pilot, then produces evidence with a chain of custody. A coherent family: portable (Mobile), permanent and integrated (Horizon), FPV in the agent's hand (SK-1), and the existing camera fleet turned into drone sensors (Eyes). Everything runs locally.

## Operating Context

Regulatory context cited in the brochure: interministerial instruction against malicious drones (arrêté of 22 October 2026, effective 1 November 2026) requires sites to report unauthorised overflights to the Interior Ministry's national centralisation point within 6 hours; the law of 16 August 2026 allows operators of vital importance and their security providers to be authorised to neutralise a threatening drone — identification comes first.

## Capabilities and Constraints

- Passive: emits nothing. Works without line of sight.
- Identity detection: DJI (model, serial, pilot, take-off) and European Remote ID (WiFi / Bluetooth). The brochure does not mention Autel; do not add brands beyond supplied truth.
- Do not publish: prices, budgets, revenue hypotheses, partner certifications not yet obtained (no "Genetec certified" / "Milestone verified" claims), customer names.
- Eyes must be presented as in development / pilot programme.
- Visuals in the brochure are "non contractuels".

## Brand Commitments

- Name: SkyKraken. Logo: round emblem "SKYKRAKEN · DRONE DETECTION" (assets/skykraken-logo*.png).
- Colours kept (user decision 2026-11-01): navy night, cream, insignia red.
- Tagline in use: "See the drone. Identify the pilot. Prove the incursion." / FR equivalent.
- Discretion: enquiries handled confidentially.
- Contact: contact@skykraken.fr; founder Hosni Ben Hassen.

## Evidence on Hand

- Product photos extracted from the brochure (Mobile case, Horizon station, SK-1 detector).
- Videos: assets/hero.mp4, manifesto.mp4, tactical.mp4, use-events.mp4, use-law.mp4, use-sites.mp4.
- Live tactical UI demo: ui-demo.html.
- Articles (5 EN, 5 FR).
- No testimonials, customer logos, certifications or benchmark figures: never fabricate them.

## Product Principles

1. Show the radio spectrum at work: the expertise is RF, prove it visually.
2. Identity before action: know which drone and where the pilot is.
3. Evidence is the product, not an add-on.
4. Integrate, don't replace: work with the customer's radar, cameras, VMS and C2.
5. Honest limits build trust: measured range on site, Eyes in pilot.

## Accessibility & Inclusion

WCAG 2.2 AA contrast, keyboard navigation, prefers-reduced-motion respected (3D and scroll motion degrade to static), content readable without WebGL.
