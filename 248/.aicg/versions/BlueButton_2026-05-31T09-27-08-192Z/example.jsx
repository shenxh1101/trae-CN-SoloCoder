// Usage Example
import BlueButton from './BlueButton';

function App() {
  return (
    <div>
      <BlueButton onClick={() => alert('Hello!')}>
        Click Me
      </BlueButton>
      
      <BlueButton disabled>
        Disabled
      </BlueButton>
    </div>
  );
}