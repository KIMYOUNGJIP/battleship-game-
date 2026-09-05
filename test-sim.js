import http from 'node:http';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

async function main() {
  console.log('🚀 Starting headless Chrome with CDP on port 9222...');
  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    'http://localhost:3000'
  ]);

  // Wait for CDP to be available
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome CDP endpoint');
  }

  console.log('🔗 Connected to CDP WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.on('open', resolve));

  let reqId = 1;
  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = reqId++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Explicitly navigate and wait for load event
  await sendCdp('Page.enable');
  await new Promise(async (resolve) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Page.loadEventFired') {
        ws.off('message', handler);
        resolve();
      }
    };
    ws.on('message', handler);
    await sendCdp('Page.navigate', { url: 'http://localhost:3000' });
  });
  await new Promise(r => setTimeout(r, 800));

  async function evalJs(expr) {
    const res = await sendCdp('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (!res) return null;
    if (res.exceptionDetails) {
      console.error('CDP Eval Exception:', res.exceptionDetails);
      return null;
    }
    return res.result ? res.result.value : null;
  }

  // Wait for window.pirateGame to be ready
  for (let i = 0; i < 20; i++) {
    const ready = await evalJs(`typeof window.pirateGame !== 'undefined'`);
    if (ready) break;
    await new Promise(r => setTimeout(r, 300));
  }

  // 1. Check initial placement game state
  console.log('Step 1: Check initial placement game state...');
  const initialData = await evalJs(`({
    gamePhase: window.pirateGame.gamePhase,
    state: window.pirateGame.state,
    placementVisible: !window.pirateGame.el.placementPanel.classList.contains('hidden'),
    quizHidden: window.pirateGame.el.mathQuizPanel.classList.contains('hidden'),
    placedCount: window.pirateGame.placedPlayerShips.size
  })`);
  console.log('Initial Placement Status:', initialData);

  if (initialData.gamePhase !== 'PLACEMENT' || !initialData.placementVisible || initialData.placedCount !== 0) {
    throw new Error('Game did not start in PLACEMENT mode');
  }

  // 2. Test auto placement & verify 4 ships placed
  console.log('Step 2: Testing autoPlacePlayerFleet()...');
  await evalJs(`window.pirateGame.autoPlacePlayerFleet()`);
  const afterAutoPlace = await evalJs(`({
    placedCount: window.pirateGame.placedPlayerShips.size,
    isReadyBtnEnabled: !window.pirateGame.el.btnStartBattle.disabled
  })`);
  console.log('After Auto Place:', afterAutoPlace);

  if (afterAutoPlace.placedCount !== 4 || !afterAutoPlace.isReadyBtnEnabled) {
    throw new Error('Auto place did not place 4 ships or ready button not enabled');
  }

  // 3. Test startBattle transition
  console.log('Step 3: Testing startBattle()...');
  await evalJs(`window.pirateGame.startBattle()`);
  const afterBattleStart = await evalJs(`({
    gamePhase: window.pirateGame.gamePhase,
    state: window.pirateGame.state,
    placementHidden: window.pirateGame.el.placementPanel.classList.contains('hidden'),
    quizVisible: !window.pirateGame.el.mathQuizPanel.classList.contains('hidden'),
    questionText: window.pirateGame.currentQuestion.question
  })`);
  console.log('After Battle Start:', afterBattleStart);

  if (afterBattleStart.gamePhase !== 'BATTLE' || afterBattleStart.state !== 'QUESTION') {
    throw new Error('Failed to transition to BATTLE state');
  }

  // 4. Answer math question
  console.log('Step 4: Answering quiz question correctly...');
  await evalJs(`window.pirateGame.handleOptionSelect(window.pirateGame.currentQuestion.correctIndex)`);
  const afterAnswerState = await evalJs(`({
    state: window.pirateGame.state,
    combo: window.pirateGame.combo,
    coins: window.pirateGame.coins
  })`);
  console.log('After Correct Answer:', afterAnswerState);

  // 5. Fire cannonball
  console.log('Step 5: Firing cannonball at enemy board...');
  const enemyCoord = await evalJs(`window.pirateGame.enemyShips[0].coords[0]`);
  await evalJs(`window.pirateGame.handleEnemyCellClick(${enemyCoord.y}, ${enemyCoord.x})`);

  console.log('Waiting for projectile trajectory, AI counterattack, and transition to Question 2...');
  await new Promise(r => setTimeout(r, 4500));

  const finalStatus = await evalJs(`({
    state: window.pirateGame.state,
    turn: window.pirateGame.el.turnBadge.textContent,
    playerHp: window.pirateGame.playerHp,
    enemyHp: window.pirateGame.enemyHp,
    question2: window.pirateGame.currentQuestion.question
  })`);
  console.log('Turn 2 Verified Status:', finalStatus);

  if (finalStatus.state !== 'QUESTION' || !finalStatus.question2) {
    throw new Error('Did not transition back to QUESTION for Turn 2');
  }

  ws.close();
  chromeProc.kill();
  console.log('🎉 FULL BROWSER PLACEMENT & MULTI-TURN BATTLE TEST PASSED WITH 100% SUCCESS!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
