import { describe, it, expect } from "vitest";
import { chromium, expect as browserExpect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

// Browser-only API fixtures: no accounts, credentials or records are created.
// Run against a running development workflow with PARCEL_BROWSER_TESTS=1.
describe.skipIf(process.env.PARCEL_BROWSER_TESTS !== "1")("parcel destination browser workflow", () => {
  it("uses the active V2 form, reloads destination, checks Admin edits and member error recovery", async () => {
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ?? (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const base = process.env.PARCEL_BROWSER_BASE_URL ?? "http://127.0.0.1:5000";
      const group = { id: "G", name: "Synthetic parcel group", status: "active", currency: "GBP", shippingOptions: [], organiserId: "owner" };
      const parcels: any[] = [];
      const writes: any[] = [];
      const errors: string[] = [];
      let memberState: "error" | "empty" | "ready" | "loading" = "error";
      let releaseLoading: (() => void) | undefined;
      page.on("pageerror", error => {
        // Local capture cannot reach the proxied HTTPS HMR websocket.
        if (!error.message.includes("WebSocket closed without opened")) {
          errors.push(error.message);
          console.error("Fixture page error:", error.message);
        }
      });
      page.on("console", message => { if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("[vite]")) console.error("Fixture console:", message.text()); });
      await page.addInitScript(() => { localStorage.setItem("v2:welcomeDismissed", "true"); });
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith("/api/")) return route.continue();
        const path = url.pathname.slice(4);
        const method = route.request().method();
        let body: any = [];
        let status = 200;
        if (path === "/account/me") body = { telegramUsername: "owner", organiserStatus: "approved", rulesetVersion: 1, ruleAcceptedVersion: 1 };
        else if (path === "/organiser/me") body = { telegramUsername: "owner", organiserStatus: "approved" };
        else if (path === "/organiser/group-buys") body = [group];
        else if (path.endsWith("/reshippers")) body = [{ reshipperUsername: "alpha" }, { reshipperUsername: "beta" }];
        else if (path === "/account/group-buys/G/parcels") {
          if (memberState === "loading") await new Promise<void>(resolve => { releaseLoading = resolve; });
          if (memberState === "error") { status = 503; body = { error: "Tracking temporarily unavailable" }; }
          else if (memberState === "empty") body = [];
          else body = [{ id: "parcel-1", label: "Package 1 - AJ", carrier: "", maskedTrackingNumber: "••••••••••",
            status: "in_transit", items: [{ name: "Member product", qty: 2 }],
            events: [{ date: "2026-10-20", status: "In transit", location: "China" }], trackingUrl: null }];
        } else if (/\/(organiser|admin)\/group-buys\/G\/parcels/.test(path)) {
          if (method === "GET") body = parcels;
          else {
            const write = route.request().postDataJSON();
            writes.push(write);
            if (method === "POST") parcels.push({ id: "parcel-1", ...write, groupBuyId: "G", status: "pending", cachedEvents: [], createdAt: "2026-10-20" });
            else Object.assign(parcels[0], write);
            body = parcels[0];
          }
        } else if (path.endsWith("/testing")) body = { contributions: { pending: 0 }, pools: [] };
        else if (path === "/organiser/tickets") body = { tickets: [] };
        else if (path === "/config") body = {};
        return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      });
      await page.goto(`${base}/gborganiser-v2?gb=G&tab=parcels`);
      await page.getByRole("button", { name: "New Parcel", exact: true }).click({ timeout: 30000 }).catch(async error => {
        console.error("Browser fixture errors:", errors, await page.locator("body").innerText());
        throw error;
      });
      await browserExpect(page.getByTestId("warning-parcel-destination")).toBeVisible();
      await page.getByTestId("select-parcel-destination").selectOption("alpha");
      await page.getByPlaceholder("e.g. Batch A — UK Members").fill("Package 1 - AJ");
      await page.getByPlaceholder("e.g. TN123456789").fill("SYNTHETIC123");
      await page.getByRole("button", { name: "Create Parcel", exact: true }).click();
      await browserExpect(page.getByTestId("text-parcel-destination")).toHaveText("Destination: @alpha");
      expect(writes[0].reshipperUsername).toBe("alpha");
      await page.reload();
      await page.getByTitle("Edit parcel", { exact: true }).click();
      await browserExpect(page.getByTestId("select-parcel-destination")).toHaveValue("alpha");
      await page.getByTestId("select-parcel-destination").selectOption("beta");
      await page.getByRole("button", { name: "Update Parcel", exact: true }).click();
      await page.getByTitle("Edit parcel", { exact: true }).click();
      await browserExpect(page.getByTestId("select-parcel-destination")).toHaveValue("beta");
      await mkdir("../../generated-artifacts/parcel-tracking", { recursive: true });
      await page.screenshot({ path: "../../generated-artifacts/parcel-tracking/organiser-edit.jpg" });

      // Mount the actual shared Admin form and member modal via a browser-only
      // intercepted HTML document. This adds no route or auth bypass to the app.
      await page.route("**/__parcel-fixture?*", route => {
        const admin = new URL(route.request().url()).searchParams.get("view") === "admin";
        return route.fulfill({ contentType: "text/html", body: `
          <html><body><div id="root"></div>
          <script type="module">
          import RefreshRuntime from "/@react-refresh";
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          </script><script type="module">
          import React from "/node_modules/.vite/deps/react.js";
          import ReactDOM from "/node_modules/.vite/deps/react-dom_client.js";
          import "/src/index.css";
          import {ParcelForm} from "/src/components/admin/group-buys/panels/ParcelsPanel.tsx";
          import {GBParcelsModal} from "/src/pages/CustomerPortal.tsx";
          const initial = ${JSON.stringify(parcels[0])};
          ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(
            ${admin ? "ParcelForm" : "GBParcelsModal"},
            ${admin ? '{secret:"synthetic",gbId:"G",initial,catalogProducts:[],onSave:()=>document.body.dataset.saved="yes",onCancel:()=>{}}'
              : '{gb:{id:"G",name:"Synthetic parcel group"},orders:[],onClose:()=>{}}'}
          ));
          </script></body></html>` });
      });
      await page.goto(`${base}/__parcel-fixture?view=admin`);
      await browserExpect(page.getByTestId("select-parcel-destination")).toHaveValue("beta");
      await page.getByTestId("select-parcel-destination").selectOption("alpha");
      await page.getByRole("button", { name: "Save Changes", exact: true }).click();
      await browserExpect(page.locator("body")).toHaveAttribute("data-saved", "yes");
      expect(writes.at(-1).reshipperUsername).toBe("alpha");
      await page.goto(`${base}/__parcel-fixture?view=admin`);
      await browserExpect(page.getByTestId("select-parcel-destination")).toHaveValue("alpha");
      await page.getByRole("button", { name: "Save Changes", exact: true }).click();
      await browserExpect(page.locator("body")).toHaveAttribute("data-saved", "yes");
      expect(writes.at(-1)).not.toHaveProperty("reshipperUsername");

      await page.goto(`${base}/__parcel-fixture?view=member`);
      await browserExpect(page.getByTestId("error-member-parcels")).toContainText("Tracking temporarily unavailable");
      await browserExpect(page.getByText("No parcel tracking is available for your order yet.")).toHaveCount(0);
      memberState = "empty";
      await page.getByRole("button", { name: "Retry tracking" }).click();
      await browserExpect(page.getByText("No parcel tracking is available for your order yet.")).toBeVisible();
      memberState = "loading";
      await page.reload();
      await browserExpect(page.getByTestId("error-member-parcels")).toHaveCount(0);
      await browserExpect(page.getByText("No parcel tracking is available for your order yet.")).toHaveCount(0);
      await browserExpect.poll(() => Boolean(releaseLoading)).toBe(true);
      memberState = "ready";
      releaseLoading!();
      await browserExpect(page.getByText("Member product", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: /Package 1/ }).click();
      await browserExpect(page.getByText("China", { exact: true })).toBeVisible();
      await page.screenshot({ path: "../../generated-artifacts/parcel-tracking/member-tracking.jpg" });
      expect(errors).toEqual([]);
    } finally { await browser.close(); }
  }, 120000);
});
