# Group Buy Refund Customer Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a polished 16:9 customer tutorial showing how an eligible Group Buy member requests and monitors a refund.

**Architecture:** Build a dedicated video artifact with ratio-aware React scenes, a persistent motion system, recreated customer-portal UI, synchronized British-English voiceover, and burned-in captions. Keep narration, timings, and scene components separate so visual and audio timing can be verified independently.

**Tech Stack:** React, TypeScript, Framer Motion, the workspace video playback/export system, generated speech audio, and existing Peps Anonymous brand assets.

---

### Task 1: Create the video artifact and timing contract

**Files:**
- Create: `artifacts/group-buy-refund-tutorial/.replit-artifact/artifact.toml`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/VideoTemplate.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/tutorial-script.ts`

- [ ] **Step 1: Define the narration and scene timing data**

Create a typed scene list covering the title, My Orders navigation, eligible order, refund form, method choice, crypto wallet entry, submission, status progression, confirmation wait, and closing reminder. Set total duration near 55 seconds and include the exact caption text for every spoken line.

- [ ] **Step 2: Persist the video format**

Set `kind = "video"` and `videoAspectRatio = "16:9"` in the artifact manifest using the protected artifact manifest replacement workflow.

- [ ] **Step 3: Implement the root composition**

Use the shared video canvas primitives, scene timing list, automatic playback, and seamless restart behavior. Do not add controls or other interactive elements.

- [ ] **Step 4: Verify the timing contract**

Run the artifact typecheck and confirm every scene has a positive duration, captions cover all narration, and the summed duration stays below 60 seconds.

- [ ] **Step 5: Commit**

Commit the artifact manifest, timing contract, and root composition together.

### Task 2: Build the customer walkthrough scenes

**Files:**
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/video_scenes/TitleScene.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/video_scenes/OrdersScene.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/video_scenes/RefundFormScene.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/video_scenes/StatusScene.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/video_scenes/ClosingScene.tsx`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/CustomerPortalFrame.tsx`

- [ ] **Step 1: Recreate the relevant customer portal UI**

Use `CustomerRefundPanel.tsx` and `AccountOrderDetail.tsx` as the behavioral and copy references. Show fictional order and wallet data. Include account credit and conditional crypto methods without implying crypto is universally available.

- [ ] **Step 2: Choreograph the walkthrough**

Animate a persistent cursor, focus rings, camera pushes, and a progress trail. Keep the interface moving subtly while captions remain readable. Do not use admin screens or static slide transitions.

- [ ] **Step 3: Show accurate status semantics**

Present Requested, Being verified, Verification failed, and Completed as customer-visible states. State that submission does not equal completion and blockchain confirmation may take time.

- [ ] **Step 4: Verify visual safety**

Render at 1920×1080 and confirm all critical interface text and captions stay inside title-safe margins with no clipping.

- [ ] **Step 5: Commit**

Commit all walkthrough scenes and the portal frame together.

### Task 3: Add voiceover, captions, and brand assets

**Files:**
- Create: `artifacts/group-buy-refund-tutorial/public/audio/refund-tutorial-voiceover.mp3`
- Create: `artifacts/group-buy-refund-tutorial/src/components/video/Captions.tsx`
- Copy: `artifacts/peps-anonymous/public/brand/salt-peps-logo-reverse.svg`
- Copy: `artifacts/peps-anonymous/public/brand/salt-peps-icon.svg`

- [ ] **Step 1: Generate the voiceover**

Generate one calm British-English voice track from the approved script. Keep delivery instructional and natural, with pauses aligned to on-screen actions.

- [ ] **Step 2: Add synchronized captions**

Render burned-in captions from the timing contract. Captions must reproduce the narration accurately and remain understandable with audio muted.

- [ ] **Step 3: Apply existing branding**

Use the exact Salt & Peps logo and icon files. Match the customer portal palette and typography without redrawing the brand.

- [ ] **Step 4: Verify audio and captions**

Play the full composition and confirm no caption starts before its spoken line, no line remains after the next scene, and audio has no clipping or silent gaps.

- [ ] **Step 5: Commit**

Commit audio, captions, and copied brand assets together.

### Task 4: Validate playback and export

**Files:**
- Modify: `artifacts/group-buy-refund-tutorial/src/components/video/VideoTemplate.tsx`
- Create: `exports/group-buy-refund-customer-tutorial.mp4`

- [ ] **Step 1: Run static validation**

Run the artifact typecheck and production build. Fix all errors in the video artifact.

- [ ] **Step 2: Review playback**

Restart the video workflow and inspect the complete playback for blank frames, missing assets, incorrect UI copy, abrupt transitions, caption overflow, and unsafe customer data.

- [ ] **Step 3: Export the MP4**

Use the workspace video export pipeline at 1920×1080 and wait for the export job to finish.

- [ ] **Step 4: Verify the exported file**

Confirm the MP4 exists, has video and audio streams, uses a 16:9 frame, and plays for the intended duration.

- [ ] **Step 5: Present the deliverables**

Present the runnable video artifact and exported MP4 to the user.