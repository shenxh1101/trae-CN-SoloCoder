import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import MoleculeScene from './components/MoleculeScene';
import Toolbar from './components/Toolbar';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import { PRESET_MOLECULES } from './data/molecules';
import {
  MoleculeData,
  DisplayOptions,
  BackgroundType,
  MeasurementResult,
  MoleculeSize,
} from './types';
import {
  calculateDistance,
  calculateMoleculeSize,
  exportPNG,
  saveMoleculeToJSON,
  loadMoleculeFromJSON,
} from './utils/helpers';

export default function App() {
  const [currentMolecule, setCurrentMolecule] = useState<MoleculeData | null>(
    PRESET_MOLECULES[0]
  );
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showLabels: true,
    showVanDerWaals: false,
    showElectronCloud: false,
    showDipoleMoment: true,
    autoRotate: false,
  });
  const [background, setBackground] = useState<BackgroundType>('gradient');
  const [hoveredAtom, setHoveredAtom] = useState<string | null>(null);
  const [selectedAtoms, setSelectedAtoms] = useState<string[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [moleculeSize, setMoleculeSize] = useState<MoleculeSize | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (currentMolecule) {
      const size = calculateMoleculeSize(currentMolecule.atoms);
      setMoleculeSize(size);
    }
  }, [currentMolecule]);

  const handleMoleculeChange = useCallback((molecule: MoleculeData) => {
    setCurrentMolecule(molecule);
    setSelectedAtoms([]);
    setMeasurementResult(null);
    setIsMeasuring(false);
  }, []);

  const handleDisplayOptionsChange = useCallback((options: Partial<DisplayOptions>) => {
    setDisplayOptions((prev) => ({ ...prev, ...options }));
  }, []);

  const handleAtomClick = useCallback(
    (atomId: string) => {
      if (isMeasuring) {
        setSelectedAtoms((prev) => {
          if (prev.length === 0) {
            return [atomId];
          } else if (prev.length === 1 && prev[0] !== atomId) {
            const newSelected = [...prev, atomId];
            if (currentMolecule) {
              const atom1 = currentMolecule.atoms.find((a) => a.id === newSelected[0]);
              const atom2 = currentMolecule.atoms.find((a) => a.id === newSelected[1]);
              if (atom1 && atom2) {
                const distance = calculateDistance(atom1.position, atom2.position);
                setMeasurementResult({
                  atom1: newSelected[0],
                  atom2: newSelected[1],
                  distance,
                });
              }
            }
            setIsMeasuring(false);
            return newSelected;
          }
          return [atomId];
        });
      }
    },
    [isMeasuring, currentMolecule]
  );

  const handleAtomHover = useCallback((atomId: string | null) => {
    setHoveredAtom(atomId);
  }, []);

  const handleStartMeasuring = useCallback(() => {
    setIsMeasuring(true);
    setSelectedAtoms([]);
    setMeasurementResult(null);
  }, []);

  const handleClearMeasurement = useCallback(() => {
    setIsMeasuring(false);
    setSelectedAtoms([]);
    setMeasurementResult(null);
  }, []);

  const handleExportPNG = useCallback(() => {
    if (rendererRef.current) {
      const filename = currentMolecule
        ? `${currentMolecule.name}_${Date.now()}.png`
        : `molecule_${Date.now()}.png`;
      exportPNG(rendererRef.current, filename);
    } else {
      console.warn('渲染器未就绪');
    }
  }, [currentMolecule]);

  const handleSaveJSON = useCallback(() => {
    if (currentMolecule) {
      const filename = `${currentMolecule.name}.json`;
      saveMoleculeToJSON(currentMolecule, filename);
    }
  }, [currentMolecule]);

  const handleLoadJSON = useCallback(async (file: File) => {
    try {
      const molecule = await loadMoleculeFromJSON(file);
      setCurrentMolecule(molecule);
      setSelectedAtoms([]);
      setMeasurementResult(null);
      setIsMeasuring(false);
      console.log('成功加载分子数据:', molecule.name);
    } catch (error) {
      console.error('加载分子数据失败:', error);
      alert('加载分子数据失败，请检查文件格式是否正确');
    }
  }, []);

  const handleRendererReady = useCallback((renderer: THREE.WebGLRenderer) => {
    rendererRef.current = renderer;
    console.log('渲染器就绪，可导出PNG');
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gray-900">
      <MoleculeScene
        molecule={currentMolecule}
        displayOptions={displayOptions}
        background={background}
        onAtomClick={handleAtomClick}
        onAtomHover={handleAtomHover}
        selectedAtoms={selectedAtoms}
        measurementResult={measurementResult}
        onRendererReady={handleRendererReady}
      />

      <Toolbar
        currentMolecule={currentMolecule}
        background={background}
        onMoleculeChange={handleMoleculeChange}
        onBackgroundChange={setBackground}
        onExportPNG={handleExportPNG}
        onSaveJSON={handleSaveJSON}
        onLoadJSON={handleLoadJSON}
      />

      <ControlPanel
        displayOptions={displayOptions}
        onDisplayOptionsChange={handleDisplayOptionsChange}
        isMeasuring={isMeasuring}
        onStartMeasuring={handleStartMeasuring}
        onClearMeasurement={handleClearMeasurement}
      />

      <InfoPanel
        molecule={currentMolecule}
        moleculeSize={moleculeSize}
        measurementResult={measurementResult}
        hoveredAtom={hoveredAtom}
      />

      {isMeasuring && selectedAtoms.length === 1 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-yellow-500 text-black px-4 py-2 rounded-full font-medium text-sm shadow-lg animate-pulse">
          请点击第二个原子完成键长测量
        </div>
      )}
    </div>
  );
}
