import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCRIPT } from "./tutorial-script";

export default function Captions({ currentSceneId, time }: { currentSceneId: string, time: number }) {
  const scene = SCRIPT.find(s => s.id === currentSceneId);
  if (!scene) return null;
  
  const currentLine = scene.spokenLines.find(line => time >= line.startMs && time <= line.endMs);
  
  return (
    <div className="w-full flex justify-center px-24">
      <AnimatePresence mode="wait">
        {currentLine && (
          <motion.div
            key={currentLine.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="px-6 py-3 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-4xl text-center"
          >
            <p className="text-white text-3xl font-medium tracking-wide leading-tight drop-shadow-lg" style={{ fontFamily: "Inter, sans-serif" }}>
              {currentLine.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}