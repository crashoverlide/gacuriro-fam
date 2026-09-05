export async function requestMediaPermissions() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    stream.getTracks().forEach((t) => t.stop());
    localStorage.setItem("gf_media_perm", "1");
    return { ok: true };
  } catch (e) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem("gf_media_perm", "audio");
      return { ok: true, partial: true };
    } catch (e2) {
      return { ok: false, reason: e2.message || "denied" };
    }
  }
}

export function shouldAskMediaPermissions() {
  return !localStorage.getItem("gf_media_perm");
}