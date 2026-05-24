import React, { useEffect, useRef, useCallback } from 'react';
import { useGlacier } from '../context/GlacierContext';
import { formatDateFull, dateToMonthIndex, monthIndexToDate, getTotalMonths, addMonths } from '../utils/dateUtils';

export default function TimelineControl() {
  const { state, setCurrentDate, setPlaying, setPlaybackSpeed } = useGlacier();
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const totalMonths = getTotalMonths(state.startDate, state.endDate);
  const currentIndex = dateToMonthIndex(state.currentDate, state.startDate);

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    const newDate = monthIndexToDate(index, state.startDate);
    setCurrentDate(newDate);
  };

  const togglePlay = () => {
    setPlaying(!state.isPlaying);
  };

  const goToStart = () => {
    setCurrentDate(new Date(state.startDate));
  };

  const goToEnd = () => {
    setCurrentDate(new Date(state.endDate));
  };

  const stepBackward = () => {
    const newDate = addMonths(state.currentDate, -1);
    if (newDate >= state.startDate) {
      setCurrentDate(newDate);
    }
  };

  const stepForward = () => {
    const newDate = addMonths(state.currentDate, 1);
    if (newDate <= state.endDate) {
      setCurrentDate(newDate);
    }
  };

  const animate = useCallback((timestamp) => {
    if (!state.isPlaying) return;

    const interval = 100 / state.playbackSpeed;
    if (timestamp - lastUpdateRef.current >= interval) {
      lastUpdateRef.current = timestamp;

      setCurrentDate(prevDate => {
        const nextDate = addMonths(prevDate, 1);
        if (nextDate > state.endDate) {
          return new Date(state.startDate);
        }
        return nextDate;
      });
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [state.isPlaying, state.playbackSpeed, state.startDate, state.endDate, setCurrentDate]);

  useEffect(() => {
    if (state.isPlaying) {
      lastUpdateRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isPlaying, animate]);

  const yearMarks = [];
  for (let year = 1980; year <= 2024; year += 5) {
    const date = new Date(year, 0, 1);
    const index = dateToMonthIndex(date, state.startDate);
    yearMarks.push({ year, index });
  }

  return (
    <div className="panel" style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '900px',
      zIndex: 100
    }}>
      <div className="panel-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={goToStart} title="跳转到开始">
              ⏮
            </button>
            <button className="btn btn-secondary" onClick={stepBackward} title="上一月">
              ◀
            </button>
            <button
              className="btn btn-primary"
              onClick={togglePlay}
              style={{ minWidth: '60px' }}
              title={state.isPlaying ? '暂停' : '播放'}
            >
              {state.isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <button className="btn btn-secondary" onClick={stepForward} title="下一月">
              ▶
            </button>
            <button className="btn btn-secondary" onClick={goToEnd} title="跳转到结束">
              ⏭
            </button>
          </div>

          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-color)' }}>
            {formatDateFull(state.currentDate)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>速度:</span>
            <select
              value={state.playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                background: 'var(--bg-light)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
            </select>
          </div>
        </div>

        <div className="slider-container">
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={totalMonths - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="slider"
              style={{ width: '100%', margin: 0 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {yearMarks.map(({ year, index }) => (
                <div key={year} style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '1px',
                    height: '8px',
                    background: 'var(--border-color)'
                  }} />
                  {year}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>{formatDateFull(state.startDate)}</span>
          <span>{formatDateFull(state.endDate)}</span>
        </div>
      </div>
    </div>
  );
}
