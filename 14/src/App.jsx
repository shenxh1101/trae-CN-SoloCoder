import React, { useState, useEffect } from 'react';
import { GlacierProvider } from './context/GlacierContext';
import CesiumViewer from './components/CesiumViewer';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import TimelineControl from './components/TimelineControl';
import GlacierLayer from './components/GlacierLayer';
import FlowArrowsLayer from './components/FlowArrowsLayer';
import CompareModePanel from './components/CompareModePanel';
import ProfileAnalysisPanel from './components/ProfileAnalysisPanel';
import SeaLevelPanel from './components/SeaLevelPanel';
import RegionStatsPanel from './components/RegionStatsPanel';
import LegendPanel from './components/LegendPanel';
import DebugPanel from './components/DebugPanel';
import FlightTour from './components/FlightTour';
import ErrorBoundary from './components/ErrorBoundary';
import { generateGlacierData, generateAntarcticaData } from './utils/mockData';

export default function App() {
  const [activeRegion, setActiveRegion] = useState('greenland');
  const [greenlandData, setGreenlandData] = useState(null);
  const [antarcticaData, setAntarcticaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cachedGreenland = localStorage.getItem('greenland_data');
        const cachedAntarctica = localStorage.getItem('antarctica_data');

        const safeSetCache = (key, data) => {
          try {
            const toCache = {
              ...data,
              variables: Object.fromEntries(
                Object.entries(data.variables).map(([key, value]) => [
                  key,
                  { ...value, data: Array.from(value.data) }
                ])
              )
            };
            const jsonStr = JSON.stringify(toCache);
            if (jsonStr.length < 4 * 1024 * 1024) {
              localStorage.setItem(key, jsonStr);
            }
          } catch (e) {
            console.warn('Cache storage failed, skipping:', e.message);
          }
        };

        const restoreFromCache = (cached) => {
          const parsed = JSON.parse(cached);
          Object.keys(parsed.variables).forEach(key => {
            if (parsed.variables[key].data && Array.isArray(parsed.variables[key].data)) {
              parsed.variables[key].data = new Float32Array(parsed.variables[key].data);
            }
          });
          return parsed;
        };

        if (cachedGreenland) {
          setGreenlandData(restoreFromCache(cachedGreenland));
        } else {
          const data = generateGlacierData(new Date(1980, 0, 1), new Date(2024, 11, 1), 25, 25);
          safeSetCache('greenland_data', data);
          setGreenlandData(data);
        }

        if (cachedAntarctica) {
          setAntarcticaData(restoreFromCache(cachedAntarctica));
        } else {
          const data = generateAntarcticaData(new Date(1980, 0, 1), new Date(2024, 11, 1), 20, 40);
          safeSetCache('antarctica_data', data);
          setAntarcticaData(data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        const greenland = generateGlacierData(new Date(1980, 0, 1), new Date(2024, 11, 1), 25, 25);
        const antarctica = generateAntarcticaData(new Date(1980, 0, 1), new Date(2024, 11, 1), 20, 40);
        setGreenlandData(greenland);
        setAntarcticaData(antarctica);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const currentData = activeRegion === 'greenland' ? greenlandData : antarcticaData;

  return (
    <GlacierProvider>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <CesiumViewer>
          <Header activeRegion={activeRegion} setActiveRegion={setActiveRegion} />

          {loading ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--text-primary)',
              zIndex: 1000
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>正在加载冰川数据...</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                首次加载可能需要几秒钟生成模拟数据
              </div>
            </div>
          ) : (
            <>
              {currentData && (
                <>
                  <ErrorBoundary>
                    <GlacierLayer data={currentData} region={activeRegion} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <FlowArrowsLayer data={currentData} />
                  </ErrorBoundary>
                </>
              )}

              <ErrorBoundary>
                <ControlPanel />
              </ErrorBoundary>
              <ErrorBoundary>
                <TimelineControl />
              </ErrorBoundary>
              <ErrorBoundary>
                <CompareModePanel data={currentData} />
              </ErrorBoundary>

              {activeRegion === 'greenland' && (
                <>
                  <ErrorBoundary>
                    <ProfileAnalysisPanel data={currentData} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <RegionStatsPanel data={currentData} />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <FlightTour />
                  </ErrorBoundary>
                </>
              )}

              <ErrorBoundary>
                <SeaLevelPanel />
              </ErrorBoundary>
              <ErrorBoundary>
                <LegendPanel data={currentData} activeRegion={activeRegion} />
              </ErrorBoundary>
              <ErrorBoundary>
                <DebugPanel />
              </ErrorBoundary>
            </>
          )}
        </CesiumViewer>
      </div>
    </GlacierProvider>
  );
}
