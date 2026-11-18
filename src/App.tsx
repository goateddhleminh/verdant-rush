import React, { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from './store/useGameStore';
import { bootstrapAssets } from './data/assetLoader';
import { audioManager } from './audio/audioManager';
import { TrackScene } from './world/TrackScene';
import { LoadingScreen } from './ui/LoadingScreen';
import { MainMenu } from './ui/MainMenu';
import { RaceHUD } from './ui/RaceHUD';
import { GarageScreen } from './ui/GarageScreen';
import { JourneyScreen } from './ui/JourneyScreen';
import { AchievementsScreen } from './ui/AchievementsScreen';
import { ResultsScreen } from './ui/ResultsScreen';
import { PauseModal } from './ui/PauseModal';
import { PhotoModeOverlay } from './ui/PhotoModeOverlay';
import { SettingsModal } from './ui/SettingsModal';
import { HelpModal } from './ui/HelpModal';
import { ToastContainer } from './ui/ToastContainer';

export const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('Opening forest road...');

  const screen = useGameStore((s) => s.screen);
  const trackId = useGameStore((s) => s.raceConfig.trackId);
  const quality = useGameStore((s) => s.settings.quality);
  const showFps = useGameStore((s) => s.settings.showFps);
  const baseFov = useGameStore((s) => s.settings.baseFov);

  // FPS tracking
  const [fps, setFps] = useState(60);
  const fpsFramesRef = useRef(0);
  const fpsTimeRef = useRef(performance.now());

  // Bootstrap asset bundle on startup
  useEffect(() => {
    let mounted = true;
    bootstrapAssets((percent, text) => {
      if (mounted) {
        setLoadProgress(percent);
        setLoadStatus(text);
      }
    })
      .then(() => {
        if (mounted) {
          setTimeout(() => {
            setIsLoading(false);
            useGameStore.getState().setScreen('menu');
          }, 300);
        }
      })
      .catch((err) => {
        console.error('Asset load error, proceeding with procedural fallbacks:', err);
        if (mounted) {
          setIsLoading(false);
          useGameStore.getState().setScreen('menu');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Audio start on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioManager.resumeOnInteraction();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Music routing based on screen
  useEffect(() => {
    if (isLoading) return;

    if (screen === 'race') {
      const musicId =
        trackId === 'amber-woods'
          ? 'music-amber-woods'
          : trackId === 'lakeside-haven'
          ? 'music-lakeside'
          : 'music-emerald-valley';

      audioManager.playMusic(musicId);
      audioManager.startAmbience(trackId);
    } else {
      // Menu / Garage / Results ambient music
      audioManager.playMusic('music-emerald-valley');
      audioManager.stopAmbience();
    }
  }, [screen, trackId, isLoading]);

  // FPS calculation loop
  useEffect(() => {
    if (!showFps) return;
    let animId: number;
    const calcFps = () => {
      fpsFramesRef.current++;
      const now = performance.now();
      if (now - fpsTimeRef.current >= 500) {
        setFps(Math.round((fpsFramesRef.current * 1000) / (now - fpsTimeRef.current)));
        fpsFramesRef.current = 0;
        fpsTimeRef.current = now;
      }
      animId = requestAnimationFrame(calcFps);
    };
    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, [showFps]);

  if (isLoading) {
    return <LoadingScreen progress={loadProgress} statusText={loadStatus} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows={quality !== 'low'}
          dpr={Math.min(1.75, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
          camera={{
            position: [0, 6, -12],
            fov: baseFov,
            near: 0.1,
            far: 1800,
          }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true, // Needed for Photo Mode canvas capture
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.95,
          }}
        >
          <Suspense fallback={null}>
            <TrackScene />
          </Suspense>
        </Canvas>
      </div>

      {/* Screen Routing UI */}
      {screen === 'menu' && <MainMenu />}
      {screen === 'garage' && <GarageScreen />}
      {screen === 'journey' && <JourneyScreen />}
      {screen === 'achievements' && <AchievementsScreen />}
      {screen === 'race' && <RaceHUD />}
      {screen === 'results' && <ResultsScreen />}

      {/* Modals & Overlays */}
      <PauseModal />
      <PhotoModeOverlay />
      <SettingsModal />
      <HelpModal />
      <ToastContainer />

      {/* FPS & Performance Pill */}
      {showFps && (
        <div className="fixed top-3 left-3 z-50 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400 pointer-events-none">
          {fps} FPS • {quality.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default App;
