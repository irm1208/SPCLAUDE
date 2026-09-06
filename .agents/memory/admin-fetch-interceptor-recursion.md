---
name: Admin fetch interceptor recursion
description: Prevent browser crashes when enabled-mode admin authentication intercepts global fetch.
---

The admin authentication controller must capture and bind the native fetch function before replacing `globalThis.fetch`.

**Why:** A default transport implemented as a closure that resolves global fetch at call time starts calling the interceptor after installation. Intercepted admin requests then recurse through the controller without reaching the server, causing mobile Safari to repeatedly kill and reload the page.

**How to apply:** Keep the captured native transport as the controller's internal fetcher. The global interceptor may delegate admin calls to the controller, but the controller must always terminate at the pre-interceptor native transport. Retain a behavioral regression test that installs the interceptor on global fetch and confirms one request produces exactly one native call.