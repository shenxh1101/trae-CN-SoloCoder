import React, { createContext, useContext, useReducer, useCallback } from 'react';

const GlacierContext = createContext(null);

const initialState = {
  currentDate: new Date(2024, 0, 1),
  startDate: new Date(1980, 0, 1),
  endDate: new Date(2024, 11, 1),
  isPlaying: false,
  playbackSpeed: 1,
  visualizationMode: 'mass_loss',
  compareMode: false,
  compareYear1: 1980,
  compareYear2: 2024,
  compareSplitMode: 'slider',
  seaLevelScenario: null,
  selectedRegion: null,
  profileLine: null,
  showFlowArrows: true,
  showStability: false,
  showLegend: true,
  showDebugPanel: false,
  terrainProvider: null,
  imageryProvider: null,
  layers: {
    massLoss: true,
    flowArrows: true,
    stability: false,
    seaLevel: false
  }
};

function glacierReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.payload };
    case 'SET_VISUALIZATION_MODE':
      return { ...state, visualizationMode: action.payload };
    case 'SET_COMPARE_MODE':
      return { ...state, compareMode: action.payload };
    case 'SET_COMPARE_YEARS':
      return { ...state, compareYear1: action.payload.year1, compareYear2: action.payload.year2 };
    case 'SET_COMPARE_SPLIT_MODE':
      return { ...state, compareSplitMode: action.payload };
    case 'SET_SEA_LEVEL_SCENARIO':
      return { ...state, seaLevelScenario: action.payload };
    case 'SET_SELECTED_REGION':
      return { ...state, selectedRegion: action.payload };
    case 'SET_PROFILE_LINE':
      return { ...state, profileLine: action.payload };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        layers: { ...state.layers, [action.payload]: !state.layers[action.payload] }
      };
    case 'SET_TERRAIN_PROVIDER':
      return { ...state, terrainProvider: action.payload };
    case 'SET_IMAGERY_PROVIDER':
      return { ...state, imageryProvider: action.payload };
    case 'TOGGLE_DEBUG_PANEL':
      return { ...state, showDebugPanel: !state.showDebugPanel };
    case 'TOGGLE_LEGEND':
      return { ...state, showLegend: !state.showLegend };
    default:
      return state;
  }
}

export function GlacierProvider({ children }) {
  const [state, dispatch] = useReducer(glacierReducer, initialState);

  const setCurrentDate = useCallback((date) => {
    dispatch({ type: 'SET_CURRENT_DATE', payload: date });
  }, []);

  const setPlaying = useCallback((playing) => {
    dispatch({ type: 'SET_PLAYING', payload: playing });
  }, []);

  const setPlaybackSpeed = useCallback((speed) => {
    dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
  }, []);

  const setVisualizationMode = useCallback((mode) => {
    dispatch({ type: 'SET_VISUALIZATION_MODE', payload: mode });
  }, []);

  const setCompareMode = useCallback((enabled) => {
    dispatch({ type: 'SET_COMPARE_MODE', payload: enabled });
  }, []);

  const setCompareYears = useCallback((year1, year2) => {
    dispatch({ type: 'SET_COMPARE_YEARS', payload: { year1, year2 } });
  }, []);

  const setCompareSplitMode = useCallback((mode) => {
    dispatch({ type: 'SET_COMPARE_SPLIT_MODE', payload: mode });
  }, []);

  const setSeaLevelScenario = useCallback((scenario) => {
    dispatch({ type: 'SET_SEA_LEVEL_SCENARIO', payload: scenario });
  }, []);

  const setSelectedRegion = useCallback((region) => {
    dispatch({ type: 'SET_SELECTED_REGION', payload: region });
  }, []);

  const setProfileLine = useCallback((line) => {
    dispatch({ type: 'SET_PROFILE_LINE', payload: line });
  }, []);

  const toggleLayer = useCallback((layer) => {
    dispatch({ type: 'TOGGLE_LAYER', payload: layer });
  }, []);

  const toggleDebugPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEBUG_PANEL' });
  }, []);

  const toggleLegend = useCallback(() => {
    dispatch({ type: 'TOGGLE_LEGEND' });
  }, []);

  const value = {
    state,
    setCurrentDate,
    setPlaying,
    setPlaybackSpeed,
    setVisualizationMode,
    setCompareMode,
    setCompareYears,
    setCompareSplitMode,
    setSeaLevelScenario,
    setSelectedRegion,
    setProfileLine,
    toggleLayer,
    toggleDebugPanel,
    toggleLegend
  };

  return (
    <GlacierContext.Provider value={value}>
      {children}
    </GlacierContext.Provider>
  );
}

export function useGlacier() {
  const context = useContext(GlacierContext);
  if (!context) {
    throw new Error('useGlacier must be used within a GlacierProvider');
  }
  return context;
}
