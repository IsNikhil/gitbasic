if (new URL(window.location.href).searchParams.get("practice") === "story") {
  await import("./story-app.mjs");
} else {
  await import("./guided-app.mjs");
}
