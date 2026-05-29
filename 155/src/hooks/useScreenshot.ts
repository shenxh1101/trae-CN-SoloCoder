import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { downloadImage, generateTimestamp } from '../utils/exportUtils';

export function useScreenshot(trigger: number) {
  const { gl, scene, camera } = useThree();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger > 0 && trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      
      gl.render(scene, camera);
      
      setTimeout(() => {
        const filename = `light-forest_${generateTimestamp()}.png`;
        downloadImage(gl.domElement, filename);
      }, 100);
    }
  }, [trigger, gl, scene, camera]);
}
