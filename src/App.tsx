import { useState } from 'react';
import { MainMenu } from '@/components';
import { SnakeGameComponent } from '@/games/snake';
import { MinesweeperGameComponent } from '@/games/minesweeper';
import { TetrisGameComponent } from '@/games/tetris';
import { NonogramGameComponent } from '@/games/nonogram';

type GameScreen = 'menu' | 'snake' | 'minesweeper' | 'chess' | 'tetris' | 'nonogram' | 'wordle' | 'crossword';

export function App() {
    const [currentScreen, setCurrentScreen] = useState<GameScreen>('menu');

    const handleSelectGame = (gameId: string) => {
        setCurrentScreen(gameId as GameScreen);
    };

    const handleBackToMenu = () => {
        setCurrentScreen('menu');
    };

    switch (currentScreen) {
        case 'menu':
            return <MainMenu onSelectGame={handleSelectGame} />;
        case 'snake':
            return <SnakeGameComponent onBack={handleBackToMenu} />;
        case 'minesweeper':
            return <MinesweeperGameComponent onBack={handleBackToMenu} />;
        case 'tetris':
            return <TetrisGameComponent onBack={handleBackToMenu} />;
        // case 'nonogram':
        //     return <NonogramGameComponent onBack={handleBackToMenu} />;
        // Future games will be added here
        default:
            return <MainMenu onSelectGame={handleSelectGame} />;
    }
}

export default App;
