# GB Organiser v2 — Guided Tour Script (v1 draft)

**Format:** In-app interactive tour with voiceover.
**Voice:** conversational British English (proposed: `en-GB-RyanNeural` or `en-GB-SoniaNeural`).
**Pacing:** ~150 wpm. Each step's VO is 20–45 words → roughly 8–18 seconds. Total spoken time ≈ **7½ minutes**, self-paced.
**Conventions used below:**

- **Target** — the `data-tour` anchor the spotlight highlights.
- **Caption** — short text shown on the caption card (VO is also displayed as subtitles).
- **VO** — the voiceover line, verbatim.
- **Action** — what the tour engine does automatically (navigate, open a tab) or asks the user to do (**YOUR TURN** steps pause until the user acts).

Terminology follows the UI: "group buy" / "GB", "members" (never buyers/customers), "dispatch" = packing & fulfilment, "shipping" = rates & options, GBP as default currency.

---

## Chapter 1 — Welcome (3 steps, ~40s)

### 1.1 `welcome-intro`
- **Target:** whole screen (no spotlight, centred card)
- **Caption:** Welcome to the GB Organiser
- **VO:** "Welcome to Salt and Peps' GB Organiser — your control centre for running a group buy from first order to final delivery. This quick tour takes about eight minutes, and you can leave or come back at any point."
- **Action:** none. Buttons: **Start tour** / **Maybe later**.

### 1.2 `welcome-what-is-a-gb`
- **Target:** whole screen (centred card, simple diagram: You → Members → Supplier → Delivery)
- **Caption:** What's a group buy?
- **VO:** "A group buy is simple: you gather orders from members, buy from the supplier in bulk, and everyone shares the savings. As the organiser, you're the one running the show — and this tool keeps every moving part in one place."

### 1.3 `welcome-journey`
- **Target:** topbar context rail (Status · Members · Orders)
- **Caption:** Two halves of the job
- **VO:** "There are two halves to organising: setting up your group buy, and then running it day to day. We'll start with setup — a wizard with seven quick steps. It takes about five minutes, and you can save a draft whenever you like."
- **Action:** navigate into the Setup Wizard.

---

## Chapter 2 — Creating your group buy (9 steps, ~2½ min)

### 2.1 `wizard-shell`
- **Target:** wizard step list (left sidebar) + progress cards
- **Caption:** The Setup Wizard
- **VO:** "This is the Setup Wizard. The seven steps are listed on the left, and your progress is tracked up top. Steps tick off as you complete them — and you can jump between them freely. Nothing goes live until you launch."

### 2.2 `wizard-basics`
- **Target:** Basics step form
- **Caption:** Step 1 — Basics
- **VO:** "First, the basics. Give your group buy a name members will recognise, pick a currency, and set a close date if you want a deadline. Only the name and currency are required — everything else can wait."
- *(Secondary tooltip on Supplier Information: "Optional — record your manufacturer and lab-test supplier here so members can see them.")*

### 2.3 `wizard-products`
- **Target:** Products step, Add Product button
- **Caption:** Step 2 — Products
- **VO:** "Next, what people can order. Add each product with a name, price, and stock if it's limited. Don't worry about getting the full list perfect — once your GB is live you can import products in bulk, even straight from a price-list image."

### 2.4 `wizard-shipping`
- **Target:** Shipping step, first shipping option card
- **Caption:** Step 3 — Shipping
- **VO:** "Now delivery. Create a shipping option for each way members can receive their order — say, UK standard post, or a locker drop. For each one, choose whether members must give an address, or upload a postage label or QR code instead."

### 2.5 `wizard-payments`
- **Target:** Payments step, the four method cards
- **Caption:** Step 4 — Accepting Payments
- **VO:** "How do you get paid? Toggle on any mix of direct crypto to your wallets, AnonPay, Revolut, or PayPal. They all start disabled — so enable at least one, or your members will have no way to pay you."

### 2.6 `wizard-access`
- **Target:** Access step
- **Caption:** Step 5 — Access
- **VO:** "Access controls who can join. You can charge an entry fee, restrict or block countries, and set a four-digit PIN if you want the group invite-only. If you're running an open GB, you can skip straight past this step."

### 2.7 `wizard-rules`
- **Target:** Rules & Info step
- **Caption:** Step 6 — Rules & Info
- **VO:** "This is your front door. Write a welcome message, list your rules — payment deadlines are a favourite — and add a disclaimer. A few honest sentences here prevents most disputes later, so it's worth two minutes now."

### 2.8 `wizard-review`
- **Target:** Review step, status banner + section cards
- **Caption:** Step 7 — Review & Launch
- **VO:** "Review pulls everything together. Green ticks mean a section's ready; amber means something's missing, and the Edit link jumps you straight back to fix it. When the banner says 'Ready to Launch', you're good to go."

### 2.9 `wizard-launch`
- **Target:** Launch group buy dialog (visibility choice)
- **Caption:** Going live
- **VO:** "Launching asks one last question: public, so anyone can find your GB — or private, link-only. Public group buys go to the admins for a quick approval first. And relax: most settings can still be changed after launch."
- **Action:** tour transitions to the workspace (demo GB).

---

## Chapter 3 — Running your group buy (13 steps, ~4 min)

*Follows the real sidebar order. If the workspace is empty, the tour loads demo data first (see Open Questions).*

### 3.1 `workspace-shell`
- **Target:** sidebar + topbar together (wide spotlight)
- **Caption:** Your workspace
- **VO:** "Welcome to your workspace — home for the day-to-day. The sidebar on the left is your map, grouped by job: people, money, shipping, quality, and setup. Up top, live counters show your GB's status, members, and orders at a glance."

### 3.2 `workspace-overview`
- **Target:** Overview — metric cards + "Needs your attention"
- **Caption:** Overview — start here every day
- **VO:** "Overview is your morning coffee screen. Four numbers tell you what matters: active orders, order value, who still needs to pay, and what's ready to dispatch. Below that, 'Needs your attention' queues up anything that actually needs you today."

### 3.3 `workspace-pipeline`
- **Target:** Live order pipeline board (Intake · Paid · Packing · Dispatched)
- **Caption:** The order pipeline
- **VO:** "Every order moves through the same four stages: intake, paid, packing, dispatched. This board shows where each one sits right now. Prefer a spreadsheet or a calendar? Switch views up here — same orders, different lens."

### 3.4 `workspace-tasks`
- **Target:** Tasks tab
- **Caption:** Tasks — your to-do list
- **VO:** "Tasks is a built-in to-do list that understands group buys — you can link a task straight to an order. Overdue items turn red, and the timeline groups everything into today, tomorrow, and this week."
- **Action:** auto-navigates to Tasks.

### 3.5 `workspace-members` — ⭐ YOUR TURN
- **Target:** sidebar "Members" item (pulsing highlight)
- **Caption:** Your turn — open Members
- **VO:** "Time to try the controls yourself. In the sidebar under People, click Members."
- **Action:** tour **pauses** until the user clicks Members. Fallback "Do it for me" link appears after 10s.

### 3.6 `workspace-members-detail`
- **Target:** Members metrics row + directory table
- **Caption:** Members — who's in your GB
- **VO:** "Nicely done. This is your member directory — every participant, their country, orders, and total spent. The Payments column flags who's pending, and clicking any row opens their full history. One person behind on payment? Message them from right here."

### 3.7 `workspace-broadcast`
- **Target:** Announcements (Broadcast) — templates + recipients
- **Caption:** Announcements — message everyone
- **VO:** "When you need to tell everyone at once, use Announcements. Ready-made templates cover the classics — payment reminders, shipping updates — and you can target precisely: all members, only the unpaid, or just those who ordered a specific product."

### 3.8 `workspace-orders`
- **Target:** Orders table + bulk actions
- **Caption:** Orders — the engine room
- **VO:** "Orders is where you'll spend most of your time. Search by member, order ID, or transaction ID; filter by status; and select multiple rows to mark them paid or dispatched in one go. Click any order for the full picture — items, delivery, and notes."

### 3.9 `workspace-money`
- **Target:** Profit & Loss — three KPI cards
- **Caption:** Supplier Summary & Profit and Loss
- **VO:** "Two money tools live here. Supplier Summary rolls your orders into exactly what to buy from the supplier — copy it as text or download a CSV. And Profit and Loss tracks revenue automatically; just enter your costs, and your live margin updates as orders confirm."

### 3.10 `workspace-parcels`
- **Target:** Incoming Parcels — status tiles + Add Parcel
- **Caption:** Incoming Parcels — track the goods
- **VO:** "Once you've ordered from the supplier, log each parcel here with its tracking number. The tour of duty runs supplier, to forwarder, to member — and this screen watches the first leg, flagging anything in transit, delivered, or stuck."

### 3.11 `workspace-dispatch`
- **Target:** Dispatch manager
- **Caption:** Dispatch — getting orders out
- **VO:** "Dispatch is the satisfying part. When parcels arrive, mark them received, assign products to paid orders, and print labels. The workflow walks you through receive, prepare, and ready — so nothing ships half-packed."

### 3.12 `workspace-shipping-quality`
- **Target:** sidebar Shipping + Quality groups (group spotlight)
- **Caption:** Deeper tools, when you need them
- **VO:** "The rest of the shipping group handles the advanced stuff — package forwarders, international routes, and your shipping rates. And under Quality, you can post vendor lab certificates and run a community testing pool. Skip these until you need them."

### 3.13 `workspace-settings-search`
- **Target:** topbar search box (⌘K)
- **Caption:** Settings, Products & search
- **VO:** "Under Setup, Settings and Products let you edit your live GB any time — prices, stock, close date, capacity. And when you're lost, don't click around: press command-K and search any order, member, or parcel instantly."

---

## Finale (1 step, ~15s)

### 4.1 `tour-finish`
- **Target:** whole screen (centred card, confetti)
- **Caption:** You're ready 🎉
- **VO:** "That's the tour! Set up in seven steps, then live in Overview, Orders, and Dispatch — and everything else is there when you need it. You can replay this any time from the help menu. Now go run a great group buy."
- **Action:** buttons **Start Setup Wizard** / **Explore on my own**. Progress saved to `localStorage` (`v2:tourProgress`).

---

## Totals

| Chapter | Steps | Spoken time |
|---|---|---|
| 1 — Welcome | 3 | ~40s |
| 2 — Setup Wizard | 9 | ~2m 30s |
| 3 — Workspace | 13 | ~4m |
| Finale | 1 | ~15s |
| **Total** | **26** | **~7m 25s** |

## Open questions (for review)

1. **Demo data** — Chapter 3 assumes a populated workspace. Seed a demo GB, or inject sample data client-side when empty?
2. **Voice** — Ryan (male) vs Sonia (female), both en-GB. I'll generate a sample of step 1.1 in each before batch-recording.
3. **Parcels naming** — script narrates the tab by function (supplier → forwarder → member) since the sidebar says "Incoming Parcels" but the component says "Masked Shipping". OK, or should the UI labels be harmonised first?
4. **Second "your turn"?** — currently only one interactive moment (3.5). Could add one in the wizard (e.g. "type a name for your GB") if we want more hands-on.
5. **Tickets tab** — deliberately left out to keep the tour tight; it's discoverable under People. Include it?
