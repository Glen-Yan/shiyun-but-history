import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useStore } from "./state/store";
import { loadData } from "./data/load";
import { Galaxy } from "./three/Galaxy";
import { PersonStars } from "./three/PersonStars";
import { RelationLines } from "./three/RelationLines";
import { FlyControls } from "./three/FlyControls";
import { HUD } from "./ui/HUD";
import { PersonPanel } from "./ui/PersonPanel";

export function App() {
  const loaded = useStore(s => s.loaded);
  const setLoaded = useStore(s => s.setLoaded);
  const quality = useStore(s => s.quality);
  const selected = useStore(s => s.selected);
  const uiHidden = useStore(s => s.uiHidden);

  useEffect(() => {
    loadData()
      .then(() => setLoaded(true))
      .catch(e => { console.error("数据载入失败", e); setLoaded(true); });
  }, [setLoaded]);

  return (
    <div className="app">
      <Canvas
        camera={{ position: [800, 3600, 3600], fov: 55, near: 0.1, far: 14000 }}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={["#03040a"]} />
        <fog attach="fog" args={["#03040a", 2400, 11000]} />
        <Galaxy />
        {loaded && <PersonStars />}
        {loaded && <RelationLines />}
        <FlyControls />
        {quality === "high" && (
          <EffectComposer>
            <Bloom intensity={0.8} luminanceThreshold={0.15} luminanceSmoothing={0.3} radius={0.7} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>

      {!uiHidden && (
        <>
          <HUD />
          <PersonPanel />
        </>
      )}

      {!loaded && (
        <div className="loading-screen">
          <div className="loading-title">史云</div>
          <div className="loading-subtitle">点亮历史人物星图…</div>
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
}
