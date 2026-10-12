import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { logger } from "../../web/utils/logger";
import { apiFetch } from "../../lib/apiFetch";


type ToastType = "success" | "error";

type ToastState = {
  message: string;
  type: ToastType;
};

type Channel = {
  id: string;
  name: string;
  url: string;
  epg_id?: string;
  epg_name?: string;
};

type EPGItem = {
  epg_id: string;
  name: string;
};

const ChannelMapper = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [epgList, setEpgList] = useState<EPGItem[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [epgPreview, setEpgPreview] = useState<EPGItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    fetch("/api/admin/channels")
      .then((res) => res.json())
      .then((data: Channel[]) => setChannels(data))
      .catch((err) => {
        console.error("Failed to load channels:", err);
        showToast("Failed to load channels.", "error");
      });

    fetch("/api/admin/custom_epg")
      .then((res) => res.json())
      .then((data: EPGItem[]) => setEpgList(data))
      .catch((err) => {
        console.error("Failed to load EPG list:", err);
        showToast("Failed to load EPG list.", "error");
      });
  }, []);

  useEffect(() => {
    if (!selectedStream || !videoRef.current) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();

      hls.loadSource(selectedStream);
      hls.attachMedia(video);

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selectedStream;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedStream]);

  const attachEPG = (epg: EPGItem) => {
    setEpgPreview(epg);

    setSelectedChannel((prev) => {
      if (!prev) {
        showToast("Preview a channel before attaching EPG.", "error");
        return prev;
      }

      return {
        ...prev,
        epg_id: epg.epg_id,
        epg_name: epg.name,
      };
    });

    showToast(`Attached EPG: ${epg.name}`, "success");
  };

  const saveMapping = async () => {
    try {
      if (!selectedChannel) {
        showToast("Select a channel first.", "error");
        return;
      }

      if (!selectedChannel.epg_id) {
        showToast("Attach an EPG entry before saving.", "error");
        return;
      }

      const res = await apiFetch("/api/admin/update_channel_mapping", {
  method: "POST",
  body: JSON.stringify(selectedChannel),
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  throw new Error(
    data?.error ||
      data?.message ||
      `Save failed with status ${res.status}`
  );
}

showToast("Channel mapping saved.", "success");
} catch (err) {
  logger.error("Failed to save channel mapping:", err);
  showToast("Failed to save channel mapping.", "error");
}
  };

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 16px",
            borderRadius: 10,
            color: "#fff",
            background:
              toast.type === "error"
                ? "rgba(220, 38, 38, 0.95)"
                : "rgba(22, 163, 74, 0.95)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            fontWeight: 600,
          }}
        >
          {toast.message}
        </div>
      )}

      <div
        style={{
          width: "30%",
          overflowY: "scroll",
          borderRight: "1px solid #ccc",
        }}
      >
        <h2>IPTV Channels</h2>

        {channels.map((ch, i) => (
          <div
            key={ch.id || i}
            style={{ padding: 10, borderBottom: "1px solid #eee" }}
          >
            <div>
              <strong>{ch.name}</strong>
            </div>

            <button
              onClick={() => {
                setSelectedStream(ch.url);
                setSelectedChannel({
                  id: ch.id,
                  name: ch.name,
                  url: ch.url,
                });
                setEpgPreview(null);
              }}
            >
              Preview
            </button>
          </div>
        ))}
      </div>

      <div style={{ width: "40%", padding: 20 }}>
        <h2>Live Preview</h2>

        <video
          ref={videoRef}
          controls
          style={{ width: "100%", background: "#000" }}
        />

        {selectedChannel && (
          <>
            <h3>Selected: {selectedChannel.name}</h3>

            {epgPreview && (
              <p>
                Attached EPG: <strong>{epgPreview.name}</strong>
              </p>
            )}

            <button onClick={saveMapping}>Save EPG Mapping</button>
          </>
        )}
      </div>

      <div
        style={{
          width: "30%",
          overflowY: "scroll",
          borderLeft: "1px solid #ccc",
        }}
      >
        <h2>EPG Entries</h2>

        {epgList.map((epg, i) => (
          <div
            key={epg.epg_id || i}
            style={{ padding: 10, borderBottom: "1px solid #eee" }}
          >
            <div>{epg.name}</div>
            <button onClick={() => attachEPG(epg)}>Attach</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelMapper;