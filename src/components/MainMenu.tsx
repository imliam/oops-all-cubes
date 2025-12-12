import { useState } from 'react';

interface GameOption {
    id: string;
    name: string;
    description: string;
    icon: string;
    available: boolean;
}

const games: GameOption[] = [
    {
        id: 'snake',
        name: 'Snake',
        description: 'Classic snake game wrapping around a 3D cube. Eat apples, grow longer, don\'t hit yourself!',
        icon: '🐍',
        available: true,
    },
    {
        id: 'minesweeper',
        name: 'Minesweeper',
        description: 'Find all the mines hidden across 6 cube faces. Left-click to reveal, right-click to flag!',
        icon: '💣',
        available: true,
    },
    {
        id: 'tetris',
        name: '3D Tetris',
        description: 'Tetris inside a hollow cube! Pieces fall from above - fill complete layers to clear them.',
        icon: '🧊',
        available: true,
    },
    {
        id: 'nonogram',
        name: 'Nonogram',
        description: 'Solve picture puzzles on each cube face! Use number clues to reveal hidden patterns.',
        icon: '🧩',
        available: true,
    },
    // {
    //     id: 'chess',
    //     name: 'Chess',
    //     description: 'Chess on a cube - pieces can wrap around edges for mind-bending strategies.',
    //     icon: '♟️',
    //     available: false,
    // },
    // {
    //     id: 'wordle',
    //     name: 'Wordle',
    //     description: 'Six word puzzles at once - one on each face of the cube.',
    //     icon: '📝',
    //     available: false,
    // },
    // {
    //     id: 'crossword',
    //     name: 'Crossword',
    //     description: 'Crossword puzzles that span across cube faces.',
    //     icon: '✏️',
    //     available: false,
    // },
];

const styles = {
    container: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'white',
        overflow: 'auto',
        padding: '40px 20px',
    },
    title: {
        fontSize: '48px',
        fontWeight: 'bold' as const,
        marginBottom: '8px',
        textShadow: '0 4px 20px rgba(99, 102, 241, 0.5)',
    },
    subtitle: {
        fontSize: '18px',
        opacity: 0.7,
        marginBottom: '50px',
    },
    gamesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        maxWidth: '900px',
        width: '100%',
    },
    gameCard: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    gameCardHover: {
        background: 'rgba(99, 102, 241, 0.2)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        transform: 'translateY(-4px)',
        boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)',
    },
    gameCardDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    gameIcon: {
        fontSize: '40px',
    },
    gameName: {
        fontSize: '24px',
        fontWeight: 'bold' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    gameDescription: {
        fontSize: '14px',
        opacity: 0.7,
        lineHeight: 1.5,
    },
    comingSoon: {
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'normal' as const,
    },
    playButton: {
        marginTop: 'auto',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold' as const,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    playButtonDisabled: {
        background: 'rgba(255, 255, 255, 0.1)',
        cursor: 'not-allowed',
    },
};

interface MainMenuProps {
    onSelectGame: (gameId: string) => void;
}

export function MainMenu({ onSelectGame }: MainMenuProps) {
    const [hoveredGame, setHoveredGame] = useState<string | null>(null);

    return (
        <div style={styles.container}>
            <div style={styles.title}>🎲 Oops! All Cubes</div>
            <div style={styles.subtitle}>Classic games reimagined on a 3D cube</div>

            <div style={styles.gamesGrid}>
                {games.map((game) => (
                    <div
                        key={game.id}
                        style={{
                            ...styles.gameCard,
                            ...(hoveredGame === game.id && game.available ? styles.gameCardHover : {}),
                            ...(!game.available ? styles.gameCardDisabled : {}),
                        }}
                        onMouseEnter={() => setHoveredGame(game.id)}
                        onMouseLeave={() => setHoveredGame(null)}
                        onClick={() => game.available && onSelectGame(game.id)}
                    >
                        <div style={styles.gameName}>
                            <span style={styles.gameIcon}>{game.icon}</span>
                            {game.name}
                            {!game.available && <span style={styles.comingSoon}>Coming Soon</span>}
                        </div>
                        <div style={styles.gameDescription}>{game.description}</div>
                        <button
                            style={{
                                ...styles.playButton,
                                ...(!game.available ? styles.playButtonDisabled : {}),
                            }}
                            disabled={!game.available}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (game.available) onSelectGame(game.id);
                            }}
                        >
                            {game.available ? 'Play' : 'Coming Soon'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
