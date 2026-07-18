# Organizer V2 Group Buy Setup Video Design

**Date:** 2026-07-18  
**Status:** Approved for production planning

## Goal

Create a 3 minute 30 second narrated tutorial that teaches a first-time group-buy organiser how to create and launch a new group buy in Group Buy Organizer V2.

The tutorial will be watched inside the Organizer V2 app. It must show the real `/gborganiser-v2` interface and its current controls throughout the walkthrough. A generic dashboard, recreated form, or substitute interface must not appear in place of the product.

## Audience and Outcome

The audience is a first-time group-buy organiser with no assumed knowledge of Organizer V2. By the end of the video, the viewer should understand how to:

1. Start a new group buy in Organizer V2.
2. Complete each of the seven setup sections.
3. Review the configuration for mistakes.
4. Choose public or private visibility.
5. Confirm the launch.

The narration will briefly explain unfamiliar terms and why each section matters, without becoming a general course on operating an active group buy.

## Deliverables

- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.mp4`
  - H.264 video with AAC narration audio
  - 1920 × 1080, 16:9, 30 frames per second
  - Target duration: 3:30; acceptable final range: 3:25–3:35
- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.vtt`
  - Timed captions matching the spoken narration
- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2-poster.jpg`
  - A clean still from the real Basics screen with a small branded title treatment

The video will also include readable burned-in captions so it remains understandable when played muted inside the app.

## Production Approach

Use a hybrid guided walkthrough:

1. Load the actual current `/gborganiser-v2` route at 1920 × 1080.
2. Use a dedicated local tutorial session with deterministic, synthetic data. The session may intercept API responses, but it must render the same production React components and CSS as the real app.
3. Record real interactions with the seven wizard screens: clicking controls, typing example values, scrolling, continuing, reviewing, choosing visibility, and confirming launch.
4. Composite only restrained tutorial layers over the capture: narration, captions, cursor emphasis, field highlights, gentle zooms, and brief Peps Anonymous opening and closing cards.

This preserves product accuracy while preventing the tutorial from creating a real group buy, exposing customer data, or showing payment credentials.

## Tutorial Data

Use obviously synthetic but realistic values throughout the walkthrough:

- Group buy name: `Spring Research Run 2026`
- Currency: `GBP`
- Close date: a future date visible at capture time
- Manufacturer: `Example Supplier`
- Manufacturer country: `United Kingdom`
- Lab test supplier: `Example Testing Lab`
- Product: `Research Product A`
- Product price: `£25.00`
- Product stock: `100`
- Shipping option: `UK Tracked Delivery`, `£4.50`
- Rules and welcome text: short neutral examples written for tutorial use

No live wallet address, payment handle, email address, Telegram account, customer record, order, or production API mutation may appear. Payment controls should be demonstrated using safe placeholder values and only the methods needed to explain the screen.

## Storyboard and Timing

| Time | Section | Visible product action | Narration purpose |
|---|---|---|---|
| 0:00–0:12 | Opening | Branded title, then the real Organizer V2 route | Promise the outcome: a launched group buy in seven steps |
| 0:12–0:25 | Start setup | Open the new-group-buy setup flow | Orient the viewer and point out progress, Save draft, and Preview |
| 0:25–0:50 | Basics | Enter name, description, currency, close date, supplier, and testing lab | Explain the group details members will see |
| 0:50–1:15 | Products | Add the sample product, price, supplier, and stock | Explain member pricing and adding more products |
| 1:15–1:38 | Shipping | Configure UK Tracked Delivery, region, price, and requirements | Explain that each delivery option can collect the needed address or label information |
| 1:38–2:03 | Accepting Payments | Enable and review the relevant payment controls using placeholders | Explain that organisers should only enable methods they can reconcile |
| 2:03–2:25 | Access | Show entry-fee, joining, country, invite, and PIN controls | Explain who can join and when restrictions are useful |
| 2:25–2:47 | Rules & Info | Add welcome text, one clear rule, disclaimer, and member note | Explain that this content is shown to members before ordering |
| 2:47–3:08 | Review & Launch | Scan each summary card and demonstrate an Edit link | Encourage correcting incomplete or inaccurate details before launch |
| 3:08–3:25 | Visibility and launch | Choose Public, explain Private, and confirm launch | Explain discoverability and complete the launch flow |
| 3:25–3:30 | Closing | Real launched workspace behind a short recap card | Confirm success and point viewers back to Organizer V2 |

The total planned duration is exactly 210 seconds.

## Visual Treatment

- Keep the real app interface visible for at least 90% of the runtime.
- Use Peps Anonymous colors: Navy `#1B3A7A`, Brand Blue `#2D6BCC`, Deep Navy `#1B3164`, Amber `#E9A020`, and light background `#F8FAFC`.
- Use Inter or the exact font already rendered by Organizer V2.
- Apply only gentle 110–125% zooms when a form area would otherwise be too small in an embedded player.
- Use a visible pointer with a soft blue click ring. Cursor travel should be direct and slow enough to follow.
- Highlight the active field or control with a thin Brand Blue outline and soft translucent halo.
- Use short chapter labels such as `STEP 3 OF 7 · SHIPPING`; do not cover the app navigation or form labels.
- Avoid decorative transitions, stock footage, generic dashboard animation, rapid camera moves, or effects that make the product harder to inspect.
- Keep essential interface content and captions inside a 10% title-safe margin.

## Narration, Captions, and Sound

- Use a warm, neutral English-speaking voice at roughly 140–150 words per minute.
- Write approximately 490–520 spoken words, then time the final composition from the generated narration rather than forcing speech into fixed cuts.
- Captions must match the narration, use no more than two lines at once, and remain readable in the embedded player.
- Place captions at the bottom by default, but move them upward when they would obscure the active control.
- Use subtle interface click sounds sparingly. Do not use a music bed unless it remains clearly below the narration and adds no distraction.
- Target approximately `-16 LUFS` integrated loudness with no clipping.

## Data Flow and Isolation

The tutorial capture uses the current frontend source as the visual source of truth. A local browser session supplies an approved organiser account response and deterministic group-buy responses to the normal frontend request paths. Form interactions update the real React state. Save and launch requests are answered locally with synthetic success responses.

The recorded frames and narration feed a local video composition. The composition adds branded cards, zooms, highlights, captions, and sound, then renders the MP4, poster, and VTT deliverables into the app's public tutorial directory.

No tutorial action may reach a production database or external payment service.

## Failure Handling

- If the current UI differs from the storyboard at capture time, the current Organizer V2 interface wins. Update the narration and timing to match the product rather than recreating an outdated screen.
- If authentication or API availability prevents capture, use deterministic local response interception while continuing to render the real route and production components.
- If a field or modal is clipped at 1920 × 1080, adjust the capture scroll and zoom; do not replace it with a drawn imitation.
- If narration duration falls outside the target range, edit wording and pauses before changing the instructional scope.
- A failed or partial render is not a deliverable. Keep intermediate artifacts outside the final public tutorial directory until verification succeeds.

## Verification and Acceptance Criteria

The tutorial is complete only when all of the following are true:

1. The final video is 1920 × 1080, 30 fps, H.264/AAC, and between 3:25 and 3:35.
2. The actual current Organizer V2 interface appears throughout the setup walkthrough.
3. All seven wizard steps appear in order with the important controls visibly demonstrated.
4. The Review screen, Public and Private choices, and Confirm launch action are shown.
5. No real account, customer, payment, or production data appears.
6. Spoken narration is clear, captions match it, and neither captions nor overlays obscure the demonstrated controls.
7. Text is readable at the intended embedded-player size, with no clipped UI or caption overflow.
8. The final frame, audio stream, duration, codec, and dimensions pass automated media inspection.
9. Representative frames from the opening, Basics, Products, Payments, Review, and Launch sections pass visual inspection.
10. The MP4, VTT, and poster open successfully from their final app asset paths.

## Out of Scope

- Teaching day-to-day order, dispatch, parcel, testing, or support operations after launch
- A mobile or vertical social-media version
- A V1-to-V2 migration comparison
- Rebuilding or redesigning Organizer V2 as part of video production
- Embedding or redesigning the in-app video player; this design supplies the assets for it
