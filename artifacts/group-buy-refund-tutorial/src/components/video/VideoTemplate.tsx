import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { VideoCanvas, useVideoPlayer } from "@/lib/video";
import { SCENE_DURATIONS, SCRIPT } from "./tutorial-script";
import Captions from "./Captions";

import TitleScene from "./video_scenes/TitleScene";
import OrdersScene from "./video_scenes/OrdersScene";
import RefundFormScene from "./video_scenes/RefundFormScene";
import StatusScene from "./video_scenes/StatusScene";
import ClosingScene from "./video_scenes/ClosingScene";

const SCENE_COMPONENTS: Record<string, React.FC<any>> = {
  title: TitleScene,
  orders: OrdersScene,
  refundForm: RefundFormScene,
  status: StatusScene,
  closing: ClosingScene,
};

function useSceneElapsedTime(sceneKey: string) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    let frameId = 0;
    const tick = () => {
      setTime(performance.now() - startedAt);
      frameId = requestAnimationFrame(tick);
    };
    setTime(0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [sceneKey]);
  return time;
}

export default function VideoTemplate() {
  const { currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, "");
  const time = useSceneElapsedTime(currentSceneKey);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (baseSceneKey === "title" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [baseSceneKey, currentSceneKey]);
  
  const CurrentComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <VideoCanvas aspectRatio="16:9" className="bg-black">
      <audio 
        ref={audioRef} 
        src={`${import.meta.env.BASE_URL}audio/refund-tutorial-voiceover.mp3`} 
        preload="auto"
      />
      <div className="absolute inset-0 z-0 bg-[#F8FAFC]">
        <AnimatePresence mode="popLayout">
          {CurrentComponent && (
            <CurrentComponent
              key={currentSceneKey}
              time={time}
              duration={SCENE_DURATIONS[baseSceneKey as keyof typeof SCENE_DURATIONS]}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 bottom-16 z-50 pointer-events-none">
        <Captions currentSceneId={baseSceneKey} time={time} />
      </div>
    </VideoCanvas>
  );
}