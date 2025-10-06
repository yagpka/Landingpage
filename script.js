// Game State
const gameState = {
    coins: 100,
    sunflowers: 0,
    energy: 100,
    level: 1,
    experience: 0,
    inventory: {
        'sunflower-seeds': 10,
        'corn-seeds': 5,
        'carrot-seeds': 3
    },
    achievements: {
        'first-plant': { unlocked: false, progress: 0, max: 1 },
        'harvest-master': { unlocked: false, progress: 0, max: 50 },
        'coin-collector': { unlocked: false, progress: 0, max: 1000 }
    },
    farmPlots: [],
    selectedSeed: 'sunflower-seeds'
};

// Crop data
const crops = {
    'sunflower-seeds': {
        name: 'Sunflower',
        icon: '🌻',
        growTime: 5000, // 5 seconds
        value: 15,
        energyCost: 5
    },
    'corn-seeds': {
        name: 'Corn',
        icon: '🌽',
        growTime: 8000, // 8 seconds
        value: 30,
        energyCost: 8
    },
    'carrot-seeds': {
        name: 'Carrot',
        icon: '🥕',
        growTime: 3000, // 3 seconds
        value: 10,
        energyCost: 3
    }
};

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initializeFarm();
    updateUI();
    setupEventListeners();
    startGameLoop();
});

// Initialize farm plots
function initializeFarm() {
    const farmGrid = document.getElementById('farmGrid');
    const plotCount = 20; // 4x5 grid
    
    for (let i = 0; i < plotCount; i++) {
        const plot = document.createElement('div');
        plot.className = 'farm-plot';
        plot.dataset.plotId = i;
        plot.addEventListener('click', () => handlePlotClick(i));
        
        farmGrid.appendChild(plot);
        gameState.farmPlots[i] = {
            planted: false,
            cropType: null,
            plantTime: 0,
            ready: false
        };
    }
}

// Setup event listeners
function setupEventListeners() {
    // Farm action buttons
    document.getElementById('plantBtn').addEventListener('click', () => {
        if (gameState.energy >= 5) {
            plantRandomPlot();
        } else {
            showNotification('Not enough energy!');
        }
    });
    
    document.getElementById('harvestBtn').addEventListener('click', harvestAll);
    document.getElementById('waterBtn').addEventListener('click', waterAll);
    
    // Shop items
    document.querySelectorAll('.shop-item').forEach(item => {
        const buyBtn = item.querySelector('.btn');
        buyBtn.addEventListener('click', () => {
            const itemType = item.dataset.item;
            const price = parseInt(item.dataset.price);
            buyItem(itemType, price);
        });
    });
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Handle plot click
function handlePlotClick(plotId) {
    const plot = gameState.farmPlots[plotId];
    const plotElement = document.querySelector(`[data-plot-id="${plotId}"]`);
    
    if (plot.ready) {
        harvestPlot(plotId);
    } else if (!plot.planted && gameState.inventory[gameState.selectedSeed] > 0) {
        plantCrop(plotId, gameState.selectedSeed);
    } else if (!plot.planted) {
        showNotification('No seeds available!');
    }
}

// Plant crop in specific plot
function plantCrop(plotId, seedType) {
    const plot = gameState.farmPlots[plotId];
    const crop = crops[seedType];
    
    if (gameState.energy < crop.energyCost) {
        showNotification('Not enough energy!');
        return;
    }
    
    if (gameState.inventory[seedType] <= 0) {
        showNotification('No seeds available!');
        return;
    }
    
    // Update game state
    plot.planted = true;
    plot.cropType = seedType;
    plot.plantTime = Date.now();
    plot.ready = false;
    
    gameState.inventory[seedType]--;
    gameState.energy -= crop.energyCost;
    
    // Update UI
    updatePlot(plotId);
    updateUI();
    
    // Check for first plant achievement
    if (!gameState.achievements['first-plant'].unlocked) {
        gameState.achievements['first-plant'].progress = 1;
        checkAchievement('first-plant');
    }
    
    showNotification(`Planted ${crop.name}!`);
    
    // Set timer for crop to be ready
    setTimeout(() => {
        if (gameState.farmPlots[plotId].planted) {
            gameState.farmPlots[plotId].ready = true;
            updatePlot(plotId);
        }
    }, crop.growTime);
}

// Plant random plot
function plantRandomPlot() {
    const availablePlots = gameState.farmPlots
        .map((plot, index) => ({ plot, index }))
        .filter(({ plot }) => !plot.planted);
    
    if (availablePlots.length === 0) {
        showNotification('No empty plots available!');
        return;
    }
    
    const randomPlot = availablePlots[Math.floor(Math.random() * availablePlots.length)];
    plantCrop(randomPlot.index, gameState.selectedSeed);
}

// Harvest specific plot
function harvestPlot(plotId) {
    const plot = gameState.farmPlots[plotId];
    const crop = crops[plot.cropType];
    
    if (!plot.ready) return;
    
    // Update game state
    plot.planted = false;
    plot.cropType = null;
    plot.ready = false;
    
    gameState.coins += crop.value;
    gameState.sunflowers += plot.cropType === 'sunflower-seeds' ? 1 : 0;
    gameState.experience += 10;
    
    // Check level up
    checkLevelUp();
    
    // Update achievements
    gameState.achievements['harvest-master'].progress++;
    checkAchievement('harvest-master');
    
    gameState.achievements['coin-collector'].progress = gameState.coins;
    checkAchievement('coin-collector');
    
    // Update UI
    updatePlot(plotId);
    updateUI();
    
    showNotification(`Harvested ${crop.name} for ${crop.value} coins!`);
}

// Harvest all ready crops
function harvestAll() {
    let harvested = 0;
    gameState.farmPlots.forEach((plot, index) => {
        if (plot.ready) {
            harvestPlot(index);
            harvested++;
        }
    });
    
    if (harvested === 0) {
        showNotification('No crops ready for harvest!');
    } else {
        showNotification(`Harvested ${harvested} crops!`);
    }
}

// Water all plots (reduces grow time)
function waterAll() {
    if (gameState.energy < 10) {
        showNotification('Not enough energy!');
        return;
    }
    
    let watered = 0;
    gameState.farmPlots.forEach((plot, index) => {
        if (plot.planted && !plot.ready) {
            // Reduce grow time by 50%
            const crop = crops[plot.cropType];
            const remainingTime = crop.growTime - (Date.now() - plot.plantTime);
            if (remainingTime > 0) {
                setTimeout(() => {
                    if (gameState.farmPlots[index].planted) {
                        gameState.farmPlots[index].ready = true;
                        updatePlot(index);
                    }
                }, remainingTime / 2);
                watered++;
            }
        }
    });
    
    gameState.energy -= 10;
    updateUI();
    
    if (watered > 0) {
        showNotification(`Watered ${watered} plots!`);
    } else {
        showNotification('No crops to water!');
    }
}

// Update plot visual
function updatePlot(plotId) {
    const plot = gameState.farmPlots[plotId];
    const plotElement = document.querySelector(`[data-plot-id="${plotId}"]`);
    
    plotElement.className = 'farm-plot';
    
    if (plot.planted) {
        plotElement.classList.add('planted');
        if (plot.ready) {
            plotElement.classList.add('ready');
        }
        
        const crop = crops[plot.cropType];
        plotElement.innerHTML = `<span class="crop-icon">${crop.icon}</span>`;
    }
}

// Buy item from shop
function buyItem(itemType, price) {
    if (gameState.coins >= price) {
        gameState.coins -= price;
        gameState.inventory[itemType]++;
        updateUI();
        showNotification(`Bought ${itemType.replace('-', ' ')}!`);
    } else {
        showNotification('Not enough coins!');
    }
}

// Check level up
function checkLevelUp() {
    const requiredExp = gameState.level * 100;
    if (gameState.experience >= requiredExp) {
        gameState.level++;
        gameState.energy = 100; // Restore energy on level up
        showNotification(`Level up! Now level ${gameState.level}!`);
        updateUI();
    }
}

// Check achievement
function checkAchievement(achievementId) {
    const achievement = gameState.achievements[achievementId];
    if (!achievement.unlocked && achievement.progress >= achievement.max) {
        achievement.unlocked = true;
        showNotification(`Achievement unlocked: ${achievementId.replace('-', ' ')}!`);
        updateAchievements();
    }
}

// Update achievements display
function updateAchievements() {
    Object.keys(gameState.achievements).forEach(achievementId => {
        const achievement = gameState.achievements[achievementId];
        const element = document.querySelector(`[data-achievement="${achievementId}"]`);
        const progressBar = element.querySelector('.progress');
        
        const percentage = Math.min((achievement.progress / achievement.max) * 100, 100);
        progressBar.style.width = `${percentage}%`;
        
        if (achievement.unlocked) {
            element.classList.add('completed');
        }
    });
}

// Update UI
function updateUI() {
    // Update stats
    document.getElementById('coins').textContent = gameState.coins;
    document.getElementById('sunflowers').textContent = gameState.sunflowers;
    document.getElementById('energy').textContent = gameState.energy;
    document.getElementById('level').textContent = gameState.level;
    
    // Update inventory
    Object.keys(gameState.inventory).forEach(item => {
        const element = document.getElementById(item);
        if (element) {
            element.textContent = gameState.inventory[item];
        }
    });
    
    // Update achievements
    updateAchievements();
}

// Show notification
function showNotification(message) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Game loop
function startGameLoop() {
    setInterval(() => {
        // Regenerate energy slowly
        if (gameState.energy < 100) {
            gameState.energy = Math.min(100, gameState.energy + 1);
            updateUI();
        }
        
        // Check for ready crops
        gameState.farmPlots.forEach((plot, index) => {
            if (plot.planted && !plot.ready) {
                const crop = crops[plot.cropType];
                const elapsed = Date.now() - plot.plantTime;
                if (elapsed >= crop.growTime) {
                    plot.ready = true;
                    updatePlot(index);
                }
            }
        });
    }, 1000);
}

// Add some fun animations and effects
function addVisualEffects() {
    // Add click effects to farm plots
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('farm-plot')) {
            e.target.classList.add('bounce');
            setTimeout(() => {
                e.target.classList.remove('bounce');
            }, 600);
        }
    });
    
    // Add hover effects to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Initialize visual effects
addVisualEffects();

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'h':
        case 'H':
            harvestAll();
            break;
        case 'p':
        case 'P':
            plantRandomPlot();
            break;
        case 'w':
        case 'W':
            waterAll();
            break;
    }
});

// Add some initial game tips
setTimeout(() => {
    showNotification('Welcome to Sunflower Land! Click on empty plots to plant crops!');
}, 1000);

setTimeout(() => {
    showNotification('Use H to harvest, P to plant, W to water!');
}, 5000);