if (new URL(window.location.href).searchParams.get("practice") === "commands") {
  await import("./advanced-app.mjs");
} else {
  await import("./guided-app.mjs");
}
