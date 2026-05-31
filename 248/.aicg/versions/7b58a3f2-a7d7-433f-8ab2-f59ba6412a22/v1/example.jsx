// Usage Example
import GreenButton from './GreenButton';

function App() {
  const handleClick = () => {
    alert('Hello!');
  };

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
      <GreenButton onClick={handleClick}>
        Click Me
      </GreenButton>
      
      <GreenButton disabled>
        Disabled
      </GreenButton>
    </div>
  );
}

export default App;