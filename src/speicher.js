/*
  Speicherabstraktion.

  Im Artefakt-Kontext steht window.storage bereit, im normalen Browser nicht.
  Diese Datei kapselt beides, damit die App in beiden Umgebungen läuft — und damit
  später nur eine einzige Stelle auf den Serverdienst umgestellt werden muss.
*/

const hatArtefaktSpeicher = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

export async function lesen(schluessel) {
  try {
    if (hatArtefaktSpeicher()) {
      const r = await window.storage.get(schluessel);
      return r?.value ?? null;
    }
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}

export async function schreiben(schluessel, wert) {
  if (hatArtefaktSpeicher()) {
    await window.storage.set(schluessel, wert);
    return;
  }
  window.localStorage.setItem(schluessel, wert);
}
