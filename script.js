document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.querySelector('.app-container');

    // =================================================================
    // --- SUPABASE & SDK INITIALIZATION ---
    // =================================================================
    const SUPABASE_URL = 'https://vddnlobgtnwwplburlja.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZG5sb2JndG53d3BsYnVybGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDEyMTcsImV4cCI6MjA3NTUxNzIxN30.2zYyICX5QyNDcLcGWia1F04yXPfNH6M09aczNlsLFSM';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Adsgram SDKs
    const AdController = window.Adsgram ? window.Adsgram.init({ blockId: "int-14190" }) : { show: () => Promise.reject('Adsgram stubbed') };
    const TreasureAdController = window.Adsgram ? window.Adsgram.init({ blockId: "int-15943" }) : { show: () => Promise.reject('Adsgram stubbed') };
    const TicketAdController = window.Adsgram ? window.Adsgram.init({ blockId: "int-15944" }) : { show: () => Promise.reject('Adsgram stubbed') };

    const REEL_ITEM_HEIGHT = 90;
    const SPIN_DURATION = 4000;
    const POINTS_PER_BLOCK = 1000000;
    const TON_PER_BLOCK = 0.3;
    const SOL_PER_BLOCK = 0.0038;
    const WITHDRAWAL_FEE_PERCENT = 1.5;
    const MIN_TON_WITHDRAWAL = 1;
    const MIN_SOL_WITHDRAWAL = 0.01;
    const GACHA_ITEMS = [ { symbol: '🍓', points: 5 }, { symbol: '🍌', points: 10 }, { symbol: '🍊', points: 15 }, { symbol: '🍉', points: 20 }, { symbol: '🥑', points: 25 }, { symbol: '🌶️', points: 30 }, { symbol: '🍇', points: 60 }, { symbol: '💎', points: 100 } ];
    const STREAK_REWARDS = [
        { day: 1, points: 2000, pulls: 3 }, { day: 2, points: 4000, pulls: 5 }, { day: 3, points: 6000, pulls: 7 }, { day: 4, points: 8000, pulls: 9 }, { day: 5, points: 10000, pulls: 10 }, { day: 6, points: 12000, pulls: 11 }, { day: 7, points: 15000, pulls: 15 }
    ];
    const DAILY_TASK_KEYS = ['pull10', 'watch2', 'winPair', 'earn10k', 'winJackpot'];
    const TREASURE_COOLDOWN = 3 * 60 * 1000;
    const TREASURE_REWARD_POINTS = 2000;
    const TICKET_COOLDOWN = 5 * 60 * 1000;
    const TICKET_REWARD_PULLS = 10;
    
    // --- STATE MANAGEMENT ---
    let user = {}; 
    let tasks = {}; 
    let taskProgress = {};
    let isSpinning = false;
    
    // --- DOM ELEMENT SELECTORS ---
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-button');
    const profileButton = document.getElementById('profile-button');
    const pointsValueTop = document.getElementById('points-value');
    const profileNameEl = document.getElementById('profile-name');
    const profileUsernameEl = document.getElementById('profile-username');
    const profilePointsEl = document.getElementById('profile-points-value');
    const pullsAmountEl = document.getElementById('currency-amount');
    const gachaMachine = document.getElementById('gacha-machine');
    const pullButton = document.getElementById('pull-button');
    const watchAdButton = document.getElementById('watch-ad-button');
    const reels = document.querySelectorAll('.reel');
    const resultText = document.getElementById('result-text');
    const reelShutter = document.querySelector('.reel-shutter');
    const tonBalanceEl = document.getElementById('ton-balance');
    const solBalanceEl = document.getElementById('sol-balance');
    const exchangeButton = document.getElementById('exchange-button');
    const withdrawButton = document.getElementById('withdraw-button');
    const pointsToExchangeInput = document.getElementById('points-to-exchange');
    const exchangeCryptoSelect = document.getElementById('exchange-crypto-select');
    const exchangeFeedbackEl = document.getElementById('exchange-feedback');
    const withdrawalAmountInput = document.getElementById('withdrawal-amount');
    const cryptoSelect = document.getElementById('crypto-select');
    const walletAddressInput = document.getElementById('wallet-address');
    const withdrawalFeedbackEl = document.getElementById('withdrawal-feedback');
    const streakContainer = document.getElementById('streak-container');
    const tasksContainer = document.getElementById('tasks-container');
    const treasureTimerEl = document.getElementById('treasure-timer');
    const treasureClaimBtn = document.getElementById('treasure-claim-button');
    const ticketTimerEl = document.getElementById('ticket-timer');
    const ticketClaimBtn = document.getElementById('ticket-claim-button');
    const historyDetails = document.getElementById('history-details');
    const withdrawalHistoryContainer = document.getElementById('withdrawal-history-container');
    const closeProfileButton = document.getElementById('close-profile-button');
    const leaderboardDetails = document.getElementById('leaderboard-details');
    const leaderboardList = document.getElementById('leaderboard-list');
    const totalUsersValueEl = document.getElementById('total-users-value');
    const totalPointsValueEl = document.getElementById('total-points-value');
    const referralLinkInput = document.getElementById('referral-link-input');
    const copyReferralLinkButton = document.getElementById('copy-referral-link-button');
    const referralsDetails = document.getElementById('referrals-details');
    const referralsList = document.getElementById('referrals-list');

    // =================================================================
    // --- DATA & INITIALIZATION LOGIC ---
    // =================================================================

    const main = async () => {
        setupEventListeners();
        initializeReels();

        const TWA = window.Telegram.WebApp;
        TWA.ready();
        TWA.expand();
        document.body.style.backgroundColor = TWA.themeParams.bg_color || '#1a1a2e';

        if (!TWA.initData) {
            throw new Error("Telegram initData not found. Please launch from Telegram.");
        }
        
        // NEW: This now calls our secure Edge Function
        await loadInitialData(TWA.initData);
        
        // This function does not need to be async anymore, but leaving it is fine
        await checkDailyResets();
        
        updateAllUI();
        generateAndDisplayReferralLink();
        updateButtonStates();
        renderTasksPage();
        initializeTimedRewards();
        
        loadingOverlay.style.opacity = '0';
        appContainer.style.opacity = '1';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
    };

    /**
     * CRITICAL FIX: Loads all initial user data from the secure Edge Function.
     * This function now replaces the direct database calls that were failing due to RLS.
     */
    const loadInitialData = async (initData) => {
        const { data, error } = await supabase.functions.invoke('get-user-data', {
            body: { initData },
        });

        if (error) {
            throw new Error(`Failed to contact server: ${error.message}`);
        }
        if (data.error) {
            throw new Error(`Server error: ${data.error}`);
        }

        user = data.profile;
        const taskDefs = data.tasks;
        const progressData = data.taskProgress;

        // Process tasks and progress from the data returned by the function
        tasks = taskDefs.reduce((acc, task) => { acc[task.id] = task; return acc; }, {});
        const progressByTaskId = progressData.reduce((acc, p) => { acc[p.task_id] = p; return acc; }, {});
        
        taskProgress = {};
        for (const taskId in tasks) {
            const task = tasks[taskId];
            taskProgress[task.task_key] = progressByTaskId[taskId] || { current_progress: 0, is_claimed: false };
        }
    };
    
    // The functions below make direct calls to Supabase from the client.
    // This is acceptable for actions performed by the user on their own data,
    // as long as you have the correct RLS policies in place.

    async function updateUserProfile(updateData) {
        Object.assign(user, updateData); // Optimistic update for smooth UI
        const { data: updatedUser, error } = await supabase.from('profiles').update(updateData).eq('id', user.id).select().single();
        if (error) {
            console.error("Error updating profile:", error);
            // In a real app, you might want to revert the optimistic update here
        } else {
            user = updatedUser; // Sync with the final state from the database
        }
    }

    async function updateTaskProgress(taskKey, incrementValue = 1) {
        const taskDef = Object.values(tasks).find(t => t.task_key === taskKey);
        if (!taskDef) return;

        const currentProg = taskProgress[taskKey]?.current_progress || 0;
        const newProgress = currentProg + incrementValue;
        taskProgress[taskKey].current_progress = newProgress;
        
        // Using upsert is efficient for creating/updating progress
        await supabase.from('user_task_progress').upsert({
            user_id: user.id, task_id: taskDef.id, date: getTodayDateString(), current_progress: newProgress
        }, { onConflict: 'user_id, task_id, date' });
    }
    
    // =================================================================
    // --- UI & EVENT LISTENERS ---
    // =================================================================
    function setupEventListeners() {
        navButtons.forEach(button => button.addEventListener('click', () => navigateTo(button.dataset.page)));
        profileButton.addEventListener('click', () => navigateTo('profile-page'));
        pullButton.addEventListener('click', handlePull);
        watchAdButton.addEventListener('click', handleWatchAd);
        exchangeButton.addEventListener('click', handleExchange);
        withdrawButton.addEventListener('click', handleWithdraw);
        treasureClaimBtn.addEventListener('click', handleClaimTreasure);
        ticketClaimBtn.addEventListener('click', handleClaimTickets);
        historyDetails.addEventListener('toggle', handleHistoryToggle);
        closeProfileButton.addEventListener('click', () => navigateTo('home-page'));
        leaderboardDetails.addEventListener('toggle', handleLeaderboardToggle);
        copyReferralLinkButton.addEventListener('click', handleCopyReferralLink);
        referralsDetails.addEventListener('toggle', handleReferralsToggle);
    }
    
    function navigateTo(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        navButtons.forEach(button => button.classList.toggle('active', button.dataset.page === pageId));
        if (pageId === 'tasks-page') renderTasksPage();
        if (pageId === 'wallet-page') fetchAndRenderWithdrawalHistory();
        if (pageId === 'events-page') fetchAndRenderEventStats();
        if (pageId === 'referral-page' && referralsDetails.open) fetchAndRenderReferrals();
    }
    
    function updateAllUI() {
        if (!user || !user.id) return;
        pointsValueTop.textContent = Math.floor(user.points).toLocaleString();
        profileNameEl.textContent = user.full_name;
        profileUsernameEl.textContent = user.username;
        profilePointsEl.textContent = Math.floor(user.points).toLocaleString();
        pullsAmountEl.textContent = user.pulls;
        tonBalanceEl.textContent = parseFloat(user.ton_balance).toFixed(2);
        solBalanceEl.textContent = parseFloat(user.sol_balance).toFixed(4);
    }
    
    function updateButtonStates() {
        if (isSpinning || !user?.id) return;
        if (user.pulls > 0) {
            pullButton.disabled = false;
            watchAdButton.disabled = true;
            resultText.textContent = "PULL THE LEVER!";
        } else {
            pullButton.disabled = true;
            watchAdButton.disabled = false;
            resultText.textContent = "WATCH AD TO PLAY";
        }
    }
    
    async function checkDailyResets() {
        const today = getTodayDateString();
        const lastClaimDateStr = user.last_streak_claim_date;
        if (lastClaimDateStr && lastClaimDateStr !== today) {
            const lastClaimDate = new Date(lastClaimDateStr);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastClaimDate.toISOString().split('T')[0] !== yesterday.toISOString().split('T')[0]) {
                await updateUserProfile({ daily_streak: 0 });
            }
        }
    }
    
    function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
    
    function renderTasksPage() {
        renderDailyStreak();
        renderDailyTasks();
    }

    function renderDailyStreak() {
        streakContainer.innerHTML = '';
        const today = getTodayDateString();
        STREAK_REWARDS.forEach(reward => {
            const dayEl = document.createElement('div'); dayEl.className = 'streak-day';
            let rewardText = reward.points ? `🎁 ${reward.points.toLocaleString()}` : `🎟️ ${reward.pulls}`;
            dayEl.innerHTML = `<div class="day-label">Day ${reward.day}</div><div class="day-reward">${rewardText}</div>`;
            if (user.daily_streak >= reward.day) dayEl.classList.add('claimed');
            else if (user.daily_streak + 1 === reward.day && user.last_streak_claim_date !== today) {
                dayEl.classList.add('active');
                dayEl.onclick = () => claimStreakReward(reward.day);
            }
            streakContainer.appendChild(dayEl);
        });
    }

    function renderDailyTasks() {
        tasksContainer.innerHTML = '';
        DAILY_TASK_KEYS.forEach(taskKey => {
            const taskDef = Object.values(tasks).find(t => t.task_key === taskKey);
            if (!taskDef) return;
            
            const progress = taskProgress[taskKey]?.current_progress || 0;
            const isClaimed = taskProgress[taskKey]?.is_claimed || false;
            const isComplete = progress >= taskDef.target_value;

            const taskEl = document.createElement('div'); taskEl.className = 'task-item';
            let rewardText = taskDef.reward_type === 'points' ? `+${taskDef.reward_amount.toLocaleString()} PTS` : `+${taskDef.reward_amount} Pulls`;

            taskEl.innerHTML = `
                <div class="task-info">
                    <p>${taskDef.description} (${progress}/${taskDef.target_value})</p>
                    <div class="progress-bar"><div class="progress-bar-inner" style="width: ${Math.min(100, (progress / taskDef.target_value) * 100)}%;"></div></div>
                </div>
                <div class="task-reward">${rewardText}</div>
                <button class="claim-button" data-task-key="${taskDef.task_key}" ${(!isComplete || isClaimed) ? 'disabled' : ''}>${isClaimed ? 'Claimed' : 'Claim'}</button>`;
            tasksContainer.appendChild(taskEl);
        });
        tasksContainer.querySelectorAll('.claim-button').forEach(button => button.addEventListener('click', (e) => claimTaskReward(e.currentTarget.dataset.taskKey)));
    }

    function showFeedback(element, message, type) {
        element.textContent = message;
        element.className = `feedback-message ${type}`;
        setTimeout(() => { element.textContent = ''; element.className = 'feedback-message'; }, 4000);
    }
    
    function initializeTimedRewards() { setInterval(updateTimedRewards, 1000); updateTimedRewards(); }
    function updateTimedRewards() {
        const now = Date.now();
        const lastTreasureClaim = user.last_treasure_claim ? new Date(user.last_treasure_claim).getTime() : 0;
        const treasureCooldownEnd = lastTreasureClaim + TREASURE_COOLDOWN;
        if (now < treasureCooldownEnd) {
            treasureTimerEl.textContent = formatTime(treasureCooldownEnd - now); treasureClaimBtn.disabled = true;
        } else {
            treasureTimerEl.textContent = `+${TREASURE_REWARD_POINTS.toLocaleString()} Pts`; treasureClaimBtn.disabled = false;
        }
        const lastTicketClaim = user.last_ticket_claim ? new Date(user.last_ticket_claim).getTime() : 0;
        const ticketCooldownEnd = lastTicketClaim + TICKET_COOLDOWN;
        if (now < ticketCooldownEnd) {
            ticketTimerEl.textContent = formatTime(ticketCooldownEnd - now); ticketClaimBtn.disabled = true;
        } else {
            ticketTimerEl.textContent = `+${TICKET_REWARD_PULLS} Pulls`; ticketClaimBtn.disabled = false;
        }
    }
    function formatTime(ms) { const totalSeconds = Math.ceil(ms / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
    
    async function handleClaimTreasure() {
        if (treasureClaimBtn.disabled) return;
        treasureClaimBtn.disabled = true;
        treasureClaimBtn.textContent = 'Loading...';

        TreasureAdController.show().then(async () => {
            await updateUserProfile({ points: user.points + TREASURE_REWARD_POINTS, last_treasure_claim: new Date().toISOString() });
            updateAllUI();
        }).catch(() => {
            console.error("Treasure ad failed to show.");
        }).finally(() => {
            treasureClaimBtn.textContent = 'Claim';
            updateTimedRewards(); 
        });
    }

    async function handleClaimTickets() {
        if (ticketClaimBtn.disabled) return;
        ticketClaimBtn.disabled = true;
        ticketClaimBtn.textContent = 'Loading...';

        TicketAdController.show().then(async () => {
            await updateUserProfile({ pulls: user.pulls + TICKET_REWARD_PULLS, last_ticket_claim: new Date().toISOString() });
            updateAllUI();
            updateButtonStates();
        }).catch(() => {
            console.error("Ticket ad failed to show.");
        }).finally(() => {
            ticketClaimBtn.textContent = 'Claim';
            updateTimedRewards();
        });
    }
    
    async function claimStreakReward(day) { const today = getTodayDateString(); if (user.last_streak_claim_date === today || user.daily_streak + 1 !== day) return; const reward = STREAK_REWARDS.find(r => r.day === day); await updateUserProfile({ daily_streak: user.daily_streak + 1, last_streak_claim_date: today, points: user.points + (reward.points || 0), pulls: user.pulls + (reward.pulls || 0) }); updateAllUI(); updateButtonStates(); renderTasksPage(); }
    async function claimTaskReward(taskKey) {
        const progressData = taskProgress[taskKey]; if (!progressData || progressData.is_claimed) return;
        const taskDef = Object.values(tasks).find(t => t.task_key === taskKey);
        if (progressData.current_progress >= taskDef.target_value) {
            let profileUpdate = {};
            if (taskDef.reward_type === 'points') profileUpdate.points = user.points + taskDef.reward_amount;
            else if (taskDef.reward_type === 'pulls') profileUpdate.pulls = user.pulls + taskDef.reward_amount;
            await updateUserProfile(profileUpdate);
            progressData.is_claimed = true;
            await supabase.from('user_task_progress').update({ is_claimed: true }).match({ user_id: user.id, task_id: taskDef.id, date: getTodayDateString() });
            updateAllUI(); updateButtonStates(); renderTasksPage();
        }
    }
    function handleWatchAd() { watchAdButton.disabled = true; watchAdButton.textContent = "LOADING AD..."; AdController.show().then(async () => { await updateUserProfile({ pulls: user.pulls + 10 }); await updateTaskProgress('watch2'); updateAllUI(); updateButtonStates(); resultText.textContent = "YOU GOT 10 PULLS!"; }).catch(() => { resultText.textContent = "AD FAILED. NO REWARD."; }).finally(() => { watchAdButton.disabled = false; watchAdButton.textContent = "WATCH AD FOR 10 PULLS"; updateButtonStates(); renderTasksPage(); }); }
    async function handlePull() { if (user.pulls <= 0 || isSpinning) return; isSpinning = true; await updateUserProfile({ pulls: user.pulls - 1 }); await updateTaskProgress('pull10'); updateAllUI(); pullButton.disabled = true; watchAdButton.disabled = true; resultText.classList.remove('win', 'jackpot'); resultText.textContent = 'GET READY...'; reelShutter.classList.add('open'); setTimeout(() => { gachaMachine.classList.add('shake-animation'); resultText.textContent = 'SPINNING...'; const finalResults = []; reels.forEach((reel, index) => { reel.innerHTML = ''; const newReelItems = buildReel(); reel.appendChild(newReelItems); const finalItem = GACHA_ITEMS[Math.floor(Math.random() * GACHA_ITEMS.length)]; finalResults.push(finalItem); const finalElement = document.createElement('div'); finalElement.className = 'reel-item'; finalElement.textContent = finalItem.symbol; newReelItems.appendChild(finalElement); const stopPosition = (newReelItems.children.length - 1) * REEL_ITEM_HEIGHT; setTimeout(() => { newReelItems.style.transition = `transform ${SPIN_DURATION / 1000}s cubic-bezier(0.34, 1.56, 0.64, 1)`; newReelItems.style.transform = `translateY(-${stopPosition}px)`; }, 100 + index * 200); }); setTimeout(async () => { await checkWin(finalResults); isSpinning = false; gachaMachine.classList.remove('shake-animation'); reelShutter.classList.remove('open'); updateButtonStates(); }, SPIN_DURATION + 600); }, 500); }
    async function checkWin(results) { const symbols = results.map(r => r.symbol); let pointsWon = 0; let isJackpot = false; let isPair = false; if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) { pointsWon = results[0].points * 10; resultText.textContent = `JACKPOT! +${pointsWon}`; resultText.classList.add('jackpot'); isJackpot = true; } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) { const pairSymbol = symbols[0] === symbols[1] ? symbols[0] : (symbols[0] === symbols[2] ? symbols[0] : symbols[1]); pointsWon = results.find(r => r.symbol === pairSymbol).points * 2; resultText.textContent = `PAIR! +${pointsWon}`; resultText.classList.add('win'); isPair = true; } else { results.forEach(item => pointsWon += item.points); resultText.textContent = `+${pointsWon} PTS`; resultText.classList.add('win'); } await updateUserProfile({ points: user.points + pointsWon }); await updateTaskProgress('earn10k', pointsWon); if (isJackpot) await updateTaskProgress('winJackpot'); if (isPair) await updateTaskProgress('winPair'); updateAllUI(); renderTasksPage(); }
    function buildReel() { const reelItems = document.createElement('div'); reelItems.className = 'reel-items'; for (let i = 0; i < 50; i++) { const item = GACHA_ITEMS[Math.floor(Math.random() * GACHA_ITEMS.length)]; const div = document.createElement('div'); div.className = 'reel-item'; div.textContent = item.symbol; reelItems.appendChild(div); } return reelItems; }
    function initializeReels() { reels.forEach(reel => { reel.innerHTML = ''; reel.appendChild(buildReel()); }); }

    async function handleExchange() {
        const pointsToExchange = parseInt(pointsToExchangeInput.value, 10);
        const selectedCrypto = exchangeCryptoSelect.value;
        if (isNaN(pointsToExchange) || pointsToExchange <= 0) return showFeedback(exchangeFeedbackEl, "Please enter a valid number.", "error");
        if (pointsToExchange > user.points) return showFeedback(exchangeFeedbackEl, "You do not have enough points.", "error");
        if (pointsToExchange % POINTS_PER_BLOCK !== 0) return showFeedback(exchangeFeedbackEl, `Exchange in blocks of ${POINTS_PER_BLOCK.toLocaleString()}.`, "error");
        const blocks = pointsToExchange / POINTS_PER_BLOCK;
        let profileUpdate = { points: user.points - pointsToExchange };
        let feedbackMessage = '';
        if (selectedCrypto === 'ton') {
            const tonGained = blocks * TON_PER_BLOCK;
            profileUpdate.ton_balance = parseFloat(user.ton_balance) + tonGained;
            feedbackMessage = `Exchanged for ${tonGained.toFixed(2)} TON!`;
        } else if (selectedCrypto === 'sol') {
            const solGained = blocks * SOL_PER_BLOCK;
            profileUpdate.sol_balance = parseFloat(user.sol_balance) + solGained;
            feedbackMessage = `Exchanged for ${solGained.toFixed(4)} SOL!`;
        }
        await updateUserProfile(profileUpdate);
        await supabase.from('transaction_logs').insert({ user_id: user.id, transaction_type: 'exchange', points_exchanged: pointsToExchange, currency: selectedCrypto.toUpperCase(), status: 'completed' });
        updateAllUI();
        pointsToExchangeInput.value = '';
        showFeedback(exchangeFeedbackEl, feedbackMessage, "success");
    }

    async function handleWithdraw() { 
        const currency = cryptoSelect.value; const amount = parseFloat(withdrawalAmountInput.value); const address = walletAddressInput.value.trim(); if (isNaN(amount) || amount <= 0) return showFeedback(withdrawalFeedbackEl, "Please enter a valid amount.", "error"); if (address === '') return showFeedback(withdrawalFeedbackEl, "Please enter a wallet address.", "error"); let newBalance; if (currency === 'ton') { if (amount < MIN_TON_WITHDRAWAL) return showFeedback(withdrawalFeedbackEl, `Minimum TON withdrawal is ${MIN_TON_WITHDRAWAL}.`, "error"); if (amount > user.ton_balance) return showFeedback(withdrawalFeedbackEl, `Insufficient TON balance.`, "error"); newBalance = { ton_balance: parseFloat(user.ton_balance) - amount }; } else if (currency === 'sol') { if (amount < MIN_SOL_WITHDRAWAL) return showFeedback(withdrawalFeedbackEl, `Minimum SOL withdrawal is ${MIN_SOL_WITHDRAWAL}.`, "error"); if (amount > user.sol_balance) return showFeedback(withdrawalFeedbackEl, `Insufficient SOL balance.`, "error"); newBalance = { sol_balance: parseFloat(user.sol_balance) - amount }; } await updateUserProfile(newBalance); await supabase.from('transaction_logs').insert({ user_id: user.id, transaction_type: 'withdrawal', currency: currency.toUpperCase(), amount: amount, withdrawal_address: address, status: 'pending' }); updateAllUI(); withdrawalAmountInput.value = ''; walletAddressInput.value = ''; showFeedback(withdrawalFeedbackEl, `Withdrawal request of ${amount} ${currency.toUpperCase()} submitted for processing.`, "success"); fetchAndRenderWithdrawalHistory(); 
    }
    
    async function handleHistoryToggle(event) { if (event.target.open) await fetchAndRenderWithdrawalHistory(); }
    async function fetchAndRenderWithdrawalHistory() {
        withdrawalHistoryContainer.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const { data, error } = await supabase.from('transaction_logs').select('*').eq('user_id', user.id).eq('transaction_type', 'withdrawal').order('created_at', { ascending: false });
        if (error) { console.error('Error fetching withdrawal history:', error); withdrawalHistoryContainer.innerHTML = '<p class="no-history" style="color: var(--error-color);">Could not load history.</p>'; return; }
        if (data.length === 0) { withdrawalHistoryContainer.innerHTML = '<p class="no-history">No withdrawal history yet.</p>'; return; }
        withdrawalHistoryContainer.innerHTML = data.map(tx => `<div class="history-item"><div class="history-details"><p>Amount: <strong>${tx.amount} ${tx.currency}</strong></p><p class="history-address">To: ${tx.withdrawal_address}</p></div><div class="history-status ${tx.status}">${tx.status}</div><div class="history-date">${new Date(tx.created_at).toLocaleString()}</div></div>`).join('');
    }

    async function handleLeaderboardToggle(event) { if (event.target.open) await fetchAndRenderLeaderboard(); }
    async function fetchAndRenderLeaderboard() {
        leaderboardList.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const { data, error } = await supabase.from('profiles').select('full_name, points').order('points', { ascending: false }).limit(100);
        if (error) { console.error('Error fetching leaderboard:', error); leaderboardList.innerHTML = '<p class="no-history" style="color: var(--error-color);">Could not load leaderboard.</p>'; return; }
        if (data.length === 0) { leaderboardList.innerHTML = '<p class="no-history">Leaderboard is empty.</p>'; return; }
        leaderboardList.innerHTML = data.map((player, index) => `<div class="leaderboard-item"><span class="leaderboard-rank">#${index + 1}</span><span class="leaderboard-name">${player.full_name}</span><span class="leaderboard-points">${Math.floor(player.points).toLocaleString()}</span></div>`).join('');
    }
    async function fetchAndRenderEventStats() {
        totalUsersValueEl.textContent = 'Loading...'; totalPointsValueEl.textContent = 'Loading...';
        const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (countError) { console.error('Error fetching total users:', countError); totalUsersValueEl.textContent = 'Error'; } else { totalUsersValueEl.textContent = count.toLocaleString(); }
        const { data: totalPoints, error: rpcError } = await supabase.rpc('get_total_points');
        if (rpcError) { console.error('Error fetching total points:', rpcError); totalPointsValueEl.textContent = 'Error'; } else { totalPointsValueEl.textContent = Math.floor(totalPoints).toLocaleString(); }
    }
    function generateAndDisplayReferralLink() {
        if (user && user.telegram_id) {
            referralLinkInput.value = `https://t.me/Crypto_drop_ya_bot?startapp=${user.telegram_id}`;
        }
    }
    function handleCopyReferralLink() {
        referralLinkInput.select();
        document.execCommand('copy');
        copyReferralLinkButton.textContent = 'COPIED!';
        setTimeout(() => { copyReferralLinkButton.textContent = 'COPY'; }, 2000);
    }
    async function handleReferralsToggle(event) { if (event.target.open) await fetchAndRenderReferrals(); }
    async function fetchAndRenderReferrals() {
        referralsList.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const { data, error } = await supabase.from('profiles').select('full_name').eq('referred_by', user.id);
        if (error) { console.error('Error fetching referrals:', error); referralsList.innerHTML = '<p class="no-history" style="color: var(--error-color);">Could not load referrals.</p>'; return; }
        if (data.length === 0) { referralsList.innerHTML = '<p class="no-history">You haven\'t referred anyone yet.</p>'; return; }
        referralsList.innerHTML = data.map(ref => `<div class="referral-item"><span class="referral-name">${ref.full_name}</span><span class="referral-reward">+2,500</span></div>`).join('');
    }

    // --- START THE APP ---
    main().catch(error => {
        console.error("Failed to initialize the app:", error);
        loadingOverlay.innerHTML = `<p style="color: var(--error-color); text-align: center;">${error.message}<br>Please refresh and try again.</p>`;
    });
});
