import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Slider,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  ArrowBack,
  PhotoLibrary,
  Computer,
  TextFields,
  Tune,
  MusicNote,
  Close,
  Check,
  EmojiEmotions,
  Collections,
  Add,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const STICKERS = [
  "🔥", "❤️", "😂", "✨", "🎉", "💯", "👀", "🙌",
  "😎", "🥳", "💪", "🌟", "🎵", "📸", "💬", "👑",
];

const TEXT_STYLES = [
  { id: "classic", label: "Classic", font: "Arial, sans-serif", weight: 700 },
  { id: "signature", label: "Signature", font: "Georgia, serif", weight: 400, italic: true },
  { id: "strong", label: "Strong", font: "Impact, sans-serif", weight: 900 },
  { id: "typewriter", label: "Type", font: '"Courier New", monospace', weight: 600 },
  { id: "modern", label: "Modern", font: "Helvetica, sans-serif", weight: 300 },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

function Create() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState(0); // post | reel | story
  const [files, setFiles] = useState([]); // multi
  const [previews, setPreviews] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editTab, setEditTab] = useState(0);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textStyleId, setTextStyleId] = useState("classic");
  const [textBg, setTextBg] = useState(false);

  const [stickers, setStickers] = useState([]); // {emoji, x, y, id}
  const [musicName, setMusicName] = useState("");
  const [musicFile, setMusicFile] = useState(null);

  const fileRef = useRef(null);
  const musicRef = useRef(null);
  const canvasRef = useRef(null);

  const textStyle = TEXT_STYLES.find((t) => t.id === textStyleId) || TEXT_STYLES[0];
  const accept = mode === 1 ? "video/*" : "image/*,video/*";

  const pickLabel = useMemo(() => {
    if (isMobile) return mode === 1 ? "Select videos from gallery" : "Select from gallery";
    return mode === 1 ? "Select video from computer" : "Select from computer";
  }, [isMobile, mode]);

  const isVideo = (f) => f?.type?.startsWith("video");

  const onPick = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    const nextFiles = mode === 1 ? list.slice(0, 1) : list.slice(0, 10);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
    setActiveSlide(0);
    setStep(1);
    setStickers([]);
    setTextOverlay("");
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
  };

  const addMorePhotos = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    const merged = [...files, ...list].slice(0, 10);
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
  };

  const addSticker = (emoji) => {
    setStickers((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        emoji,
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 40,
      },
    ]);
  };

  const exportSlideBlob = (file, previewUrl) =>
    new Promise((resolve) => {
      if (isVideo(file)) {
        resolve(file);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";

        // stickers
        stickers.forEach((s) => {
          const size = Math.floor(w / 8);
          ctx.font = `${size}px serif`;
          ctx.textAlign = "center";
          ctx.fillText(s.emoji, (s.x / 100) * w, (s.y / 100) * h);
        });

        // text
        if (textOverlay.trim()) {
          const fontSize = Math.floor(w / 11);
          ctx.font = `${textStyle.italic ? "italic " : ""}${textStyle.weight} ${fontSize}px ${textStyle.font}`;
          ctx.textAlign = "center";
          const tx = w / 2;
          const ty = h * 0.82;
          if (textBg) {
            const metrics = ctx.measureText(textOverlay);
            const pad = 16;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(
              tx - metrics.width / 2 - pad,
              ty - fontSize,
              metrics.width + pad * 2,
              fontSize + pad
            );
          }
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(0,0,0,0.45)";
          ctx.strokeText(textOverlay, tx, ty);
          ctx.fillStyle = textColor;
          ctx.fillText(textOverlay, tx, ty);
        }

        canvas.toBlob((blob) => {
          if (!blob) resolve(file);
          else resolve(new File([blob], "slide.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => resolve(file);
      img.src = previewUrl;
    });

  const publish = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();

      if (files.length === 1) {
        const out = await exportSlideBlob(files[0], previews[0]);
        formData.append("media", out);
      } else {
        for (let i = 0; i < files.length; i++) {
          const out = await exportSlideBlob(files[i], previews[i]);
          formData.append("media", out);
        }
      }

      formData.append("caption", caption);
      formData.append("location", location);
      if (mode === 1) formData.append("isReel", "true");
      if (musicName) formData.append("musicName", musicName);
      if (musicFile) formData.append("music", musicFile);

      const url = mode === 2 ? `${API_URL}/api/stories` : `${API_URL}/api/posts`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        navigate(mode === 1 ? "/reels" : "/");
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setUploading(false);
    }
  };

  const currentPreview = previews[activeSlide];
  const currentIsVideo = files[activeSlide] && isVideo(files[activeSlide]);

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`,
    maxWidth: "100%",
    maxHeight: isMobile ? "48vh" : "62vh",
    objectFit: "contain",
  };

  const EditorChrome = (
    <>
      {/* slides strip */}
      {previews.length > 1 && (
        <Box display="flex" gap={1} px={1} py={1} overflow="auto">
          {previews.map((src, i) => (
            <Box
              key={i}
              onClick={() => setActiveSlide(i)}
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1,
                overflow: "hidden",
                border: i === activeSlide ? "2px solid #4af" : "2px solid transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {isVideo(files[i]) ? (
                <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </Box>
          ))}
          {mode === 0 && previews.length < 10 && (
            <IconButton
              size="small"
              onClick={() => document.getElementById("add-more-input")?.click()}
              sx={{ border: "1px dashed #666", borderRadius: 1 }}
            >
              <Add />
            </IconButton>
          )}
          <input id="add-more-input" type="file" accept="image/*" multiple hidden onChange={addMorePhotos} />
        </Box>
      )}

      {/* canvas area */}
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        bgcolor="#000"
        overflow="hidden"
        minHeight={isMobile ? 280 : 400}
      >
        {currentPreview &&
          (currentIsVideo ? (
            <video src={currentPreview} controls style={{ maxWidth: "100%", maxHeight: "60vh" }} />
          ) : (
            <>
              <img src={currentPreview} alt="" style={filterStyle} />
              {stickers.map((s) => (
                <Typography
                  key={s.id}
                  sx={{
                    position: "absolute",
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    fontSize: isMobile ? 36 : 48,
                    transform: "translate(-50%, -50%)",
                    cursor: "grab",
                    userSelect: "none",
                  }}
                  onClick={() => setStickers((prev) => prev.filter((x) => x.id !== s.id))}
                  title="Tap to remove"
                >
                  {s.emoji}
                </Typography>
              ))}
              {textOverlay ? (
                <Typography
                  sx={{
                    position: "absolute",
                    bottom: "12%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: textColor,
                    fontFamily: textStyle.font,
                    fontWeight: textStyle.weight,
                    fontStyle: textStyle.italic ? "italic" : "normal",
                    fontSize: isMobile ? 20 : 28,
                    textShadow: "0 2px 10px #000",
                    bgcolor: textBg ? "rgba(0,0,0,0.5)" : "transparent",
                    px: textBg ? 1.5 : 0,
                    py: textBg ? 0.5 : 0,
                    borderRadius: 1,
                    maxWidth: "90%",
                    textAlign: "center",
                  }}
                >
                  {textOverlay}
                </Typography>
              ) : null}
            </>
          ))}
      </Box>

      {/* tools */}
      {step === 1 && !currentIsVideo && (
        <Box px={1.5} pb={2} bgcolor={isMobile ? "#111" : "background.paper"}>
          <Tabs
            value={editTab}
            onChange={(e, v) => setEditTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="inherit"
          >
            <Tab icon={<Tune />} label="Adjust" />
            <Tab icon={<TextFields />} label="Text" />
            <Tab icon={<EmojiEmotions />} label="Stickers" />
            <Tab icon={<MusicNote />} label="Music" />
            <Tab icon={<Collections />} label="Photos" />
          </Tabs>

          {editTab === 0 && (
            <Box pt={1}>
              <Typography fontSize={12}>Brightness</Typography>
              <Slider size="small" value={brightness} min={50} max={150} onChange={(e, v) => setBrightness(v)} />
              <Typography fontSize={12}>Contrast</Typography>
              <Slider size="small" value={contrast} min={50} max={150} onChange={(e, v) => setContrast(v)} />
              <Typography fontSize={12}>Saturation</Typography>
              <Slider size="small" value={saturate} min={0} max={200} onChange={(e, v) => setSaturate(v)} />
            </Box>
          )}

          {editTab === 1 && (
            <Box pt={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type something..."
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Typography fontSize={12} mb={0.5}>
                Style
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={textStyleId}
                onChange={(e, v) => v && setTextStyleId(v)}
                sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}
              >
                {TEXT_STYLES.map((t) => (
                  <ToggleButton key={t.id} value={t.id} sx={{ textTransform: "none", px: 1.5 }}>
                    <span style={{ fontFamily: t.font, fontStyle: t.italic ? "italic" : "normal", fontWeight: t.weight }}>
                      {t.label}
                    </span>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Box display="flex" alignItems="center" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontSize={12}>Color</Typography>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                </Box>
                <Chip
                  size="small"
                  label={textBg ? "Bg on" : "Bg off"}
                  onClick={() => setTextBg((b) => !b)}
                  color={textBg ? "primary" : "default"}
                />
              </Box>
            </Box>
          )}

          {editTab === 2 && (
            <Box pt={1} display="flex" flexWrap="wrap" gap={1}>
              {STICKERS.map((e) => (
                <Button
                  key={e}
                  onClick={() => addSticker(e)}
                  sx={{ fontSize: 28, minWidth: 48 }}
                >
                  {e}
                </Button>
              ))}
              <Typography fontSize={11} color="text.secondary" width="100%">
                Tap sticker on image to remove it
              </Typography>
            </Box>
          )}

          {editTab === 3 && (
            <Box pt={1}>
              <Button
                variant="outlined"
                startIcon={<MusicNote />}
                onClick={() => musicRef.current?.click()}
              >
                {musicName || "Add music"}
              </Button>
              <input
                ref={musicRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMusicFile(f);
                  setMusicName(f.name);
                }}
              />
              {musicName ? (
                <Chip
                  sx={{ ml: 1 }}
                  label={musicName}
                  onDelete={() => {
                    setMusicFile(null);
                    setMusicName("");
                  }}
                />
              ) : (
                <Typography fontSize={12} color="text.secondary" mt={1}>
                  Music is attached to this post (name shown on share)
                </Typography>
              )}
            </Box>
          )}

          {editTab === 4 && (
            <Box pt={1}>
              <Typography fontSize={13} mb={1}>
                Combine up to 10 photos (carousel)
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => document.getElementById("add-more-input")?.click()}
                disabled={files.length >= 10}
              >
                Add photos
              </Button>
              <Typography fontSize={12} color="text.secondary" mt={1}>
                {files.length} selected
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {step === 2 && (
        <Box p={2} display="flex" flexDirection="column" gap={1.5}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            placeholder="Add location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          {musicName ? <Chip icon={<MusicNote />} label={musicName} /> : null}
          {files.length > 1 ? (
            <Chip icon={<Collections />} label={`${files.length} photos`} />
          ) : null}
        </Box>
      )}
    </>
  );

  return (
    <Box
      minHeight="100vh"
      bgcolor={isMobile ? "#000" : "background.default"}
      color={isMobile ? "#fff" : "inherit"}
      display="flex"
      flexDirection="column"
    >
      <Box display="flex" alignItems="center" p={1.5} gap={1}>
        <IconButton
          sx={{ color: isMobile ? "#fff" : "inherit" }}
          onClick={() => (step ? setStep((s) => s - 1) : navigate(-1))}
        >
          {step ? <Close /> : <ArrowBack />}
        </IconButton>
        <Typography fontWeight={700} flex={1}>
          {mode === 1 ? "New reel" : mode === 2 ? "New story" : "New post"}
        </Typography>
        {step === 1 && (
          <Button color="primary" onClick={() => setStep(2)}>
            Next
          </Button>
        )}
        {step === 2 && (
          <Button
            color="primary"
            disabled={uploading}
            onClick={publish}
            startIcon={uploading ? <CircularProgress size={14} /> : <Check />}
          >
            {uploading ? "Sharing..." : "Share"}
          </Button>
        )}
      </Box>

      {step === 0 && (
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
          px={3}
        >
          <Tabs
            value={mode}
            onChange={(e, v) => {
              setMode(v);
              setFiles([]);
              setPreviews([]);
            }}
            textColor="inherit"
          >
            <Tab label="Post" />
            <Tab label="Reel" />
            <Tab label="Story" />
          </Tabs>
          {isMobile ? (
            <PhotoLibrary sx={{ fontSize: 64, opacity: 0.7 }} />
          ) : (
            <Computer sx={{ fontSize: 64, opacity: 0.5 }} />
          )}
          <Typography textAlign="center">{pickLabel}</Typography>
          <Typography fontSize={13} color="text.secondary" textAlign="center">
            Edit with text styles, stickers, music & multi-photo
          </Typography>
          <Button variant="contained" onClick={() => fileRef.current?.click()}>
            {isMobile ? "Open gallery" : "Browse files"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            multiple={mode === 0}
            hidden
            onChange={onPick}
          />
        </Box>
      )}

      {step >= 1 && EditorChrome}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
}

export default Create;