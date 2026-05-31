import AIGeneratedButton from './AIGeneratedButton';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <AIGeneratedButton onClick={() => alert('Hello!')}>Click Me</AIGeneratedButton>
    </div>
  );
}