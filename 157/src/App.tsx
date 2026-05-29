import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainMenu } from "@/pages/MainMenu";
import { GamePage } from "@/pages/GamePage";
import { ResultPage } from "@/pages/ResultPage";
import { CustomSongEditor } from "@/pages/CustomSongEditor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/play/:songId" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/custom" element={<CustomSongEditor />} />
      </Routes>
    </Router>
  );
}
