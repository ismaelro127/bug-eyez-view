import React from "react";
import { Channel } from "../../../../types";
import SmartVideoPlayer from "../../SmartVideoPlayer";

interface Props {
  selected: Channel | null;
}

const VideoPanel: React.FC<Props> = ({ selected }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      {selected ? (
        <SmartVideoPlayer key={selected.id} channel={selected} source="sidebar" />      ) : (
        <div className="text-white/60">Select a channel</div>
      )}
    </div>
  );
};

export default VideoPanel;
