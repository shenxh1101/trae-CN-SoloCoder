// Usage Example
import YellowButton from './YellowButton';

function App() {
  return (
    <div>
      <YellowButton onClick={() => alert('Hello!')}>
        Click Me
      </YellowButton>
      
      <YellowButton disabled>
        Disabled
      </YellowButton>
    </div>
  );
}