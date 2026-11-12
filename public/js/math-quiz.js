// 초등학교 5학년 2학기 수학 4단원: 소수의 곱셈
// [8차시] 곱의 소수점 위치는 어떻게 달라질까요 (수학 98~99쪽, 수익 66~67쪽)
// 문제 은행 및 자동 생성 시스템

export class MathQuizEngine {
  constructor() {
    this.usedQuestionIds = new Set();
    this.combo = 0;
    this.correctCount = 0;
    this.totalQuestions = 0;
    this.lastCorrectIndex = -1; // 연속 동일 번호 정답 방지용

    // 수제 큐레이션된 교과서(98~99p), 수익(66~67p), 활동지, OX 퀴즈 풀 (24문항)
    this.curatedPool = [
      // 1. 교과서 98~99쪽 핵심 활동 문제
      {
        id: 'cur_1',
        category: '소수점 오른쪽 이동',
        question: '계단을 1칸 오를 때 0.15 kcal를 소모합니다. 계단을 100칸 오르면 몇 kcal를 소모할까요?',
        options: ['15 kcal', '1.5 kcal', '0.15 kcal', '150 kcal'],
        correctIndex: 0,
        hint: '💡 0.15 × 100입니다! 100배가 되면 소수점이 오른쪽으로 두 자리 이동합니다.',
        explanation: '0.15에 100을 곱하면 소수점이 오른쪽으로 두 자리 옮겨져 15 kcal가 됩니다.'
      },
      {
        id: 'cur_2',
        category: '소수점 이동 규칙',
        question: '소수에 10, 100, 1000을 곱할 때 곱의 소수점 위치는 어떻게 달라질까요?',
        options: [
          '왼쪽으로 한 자리씩 옮겨진다',
          '오른쪽으로 한 자리씩 옮겨진다',
          '변하지 않고 그대로이다',
          '항상 소수 첫째 자리가 된다'
        ],
        correctIndex: 1,
        hint: '💡 0.15 × 10 = 1.5, 0.15 × 100 = 15처럼 수가 커질 때 소수점이 어느 쪽으로 가는지 보세요!',
        explanation: '곱하는 수가 10배, 100배, 1000배가 될수록 곱의 소수점은 오른쪽으로 한 자리씩 옮겨집니다.'
      },
      {
        id: 'cur_3',
        category: '소수점 왼쪽 이동',
        question: '자연수나 소수에 0.1, 0.01, 0.001을 차례로 곱할 때 곱의 소수점 위치는 어떻게 될까요?',
        options: [
          '오른쪽으로 한 자리씩 옮겨진다',
          '오른쪽으로 두 자리씩 옮겨진다',
          '왼쪽으로 한 자리씩 옮겨진다',
          '왼쪽으로 두 자리씩 옮겨진다'
        ],
        correctIndex: 2,
        hint: '💡 150 × 0.1 = 15, 150 × 0.01 = 1.5처럼 1/10배씩 작아집니다!',
        explanation: '곱하는 수가 0.1, 0.01, 0.001배가 될수록 곱의 소수점은 왼쪽으로 한 자리씩 옮겨집니다.'
      },
      {
        id: 'cur_4',
        category: '교과서 99쪽',
        question: '4 × 7 = 28을 이용할 때, 0.04 × 0.7의 계산 결과로 알맞은 것은?',
        options: ['2.8', '0.28', '0.0028', '0.028'],
        correctIndex: 3,
        hint: '💡 0.04(소수 두 자리)와 0.7(소수 한 자리)을 곱하면 소수점 아래 총 세 자리가 됩니다!',
        explanation: '두 수의 소수점 아래 자릿수의 합이 2 + 1 = 3이므로 28에서 왼쪽으로 세 칸 이동한 0.028입니다.'
      },
      {
        id: 'cur_5',
        category: '교과서 99쪽',
        question: '1.36 × 1000의 계산 결과는 얼마일까요?',
        options: ['1360', '136', '13.6', '13600'],
        correctIndex: 0,
        hint: '💡 1000을 곱하면 소수점이 오른쪽으로 세 자리 이동합니다. 빈자리는 0으로 채워요!',
        explanation: '1.36에서 소수점을 오른쪽으로 세 자리 옮기면 1360이 됩니다.'
      },
      {
        id: 'cur_6',
        category: '교과서 99쪽',
        question: '528 × 0.001의 계산 결과는 얼마일까요?',
        options: ['52.8', '0.528', '5.28', '0.0528'],
        correctIndex: 1,
        hint: '💡 0.001을 곱하면 소수점이 왼쪽으로 세 자리 옮겨집니다!',
        explanation: '528에서 소수점을 왼쪽으로 세 자리 옮기면 0.528이 됩니다.'
      },
      {
        id: 'cur_7',
        category: '교과서 99쪽',
        question: '[보기] 57 × 39 = 2223을 이용하여 0.57 × 3.9를 계산한 값은?',
        options: ['222.3', '22.23', '2.223', '0.2223'],
        correctIndex: 2,
        hint: '💡 0.57(두 자리)과 3.9(한 자리)를 곱했으므로 소수점 아래 세 자리 수가 됩니다.',
        explanation: '두 수의 소수점 아래 자릿수를 더하면 2 + 1 = 3이므로 2.223입니다.'
      },
      {
        id: 'cur_8',
        category: '교과서 99쪽',
        question: '[보기] 57 × 39 = 2223을 이용하여 0.57 × 0.39를 계산한 값은?',
        options: ['22.23', '2.223', '0.02223', '0.2223'],
        correctIndex: 3,
        hint: '💡 소수 두 자리 수끼리 곱하면 소수점 아래 몇 자리 수가 될까요? (2 + 2 = 4)',
        explanation: '소수점 아래 자릿수가 2자리 + 2자리 = 4자리이므로 2223에서 왼쪽으로 네 칸 옮긴 0.2223입니다.'
      },

      // 2. 활동지 및 수익 66~67쪽 핵심 문제
      {
        id: 'cur_9',
        category: '활동지 핵심',
        question: '2.12 × 100의 계산 결과로 알맞은 것은?',
        options: ['212', '21.2', '2120', '0.212'],
        correctIndex: 0,
        hint: '💡 100을 곱하면 소수점이 오른쪽으로 두 칸 이동합니다!',
        explanation: '2.12에서 소수점을 오른쪽으로 두 자리 옮기면 212가 됩니다.'
      },
      {
        id: 'cur_10',
        category: '활동지 핵심',
        question: '470 × 0.01의 계산 결과는 얼마일까요?',
        options: ['47', '4.7', '0.47', '4700'],
        correctIndex: 1,
        hint: '💡 0.01을 곱하면 소수점이 왼쪽으로 두 자리 이동합니다!',
        explanation: '470에서 소수점을 왼쪽으로 두 자리 옮기면 4.70이므로 4.7이 됩니다.'
      },
      {
        id: 'cur_11',
        category: '활동지 핵심',
        question: '8 × 9 = 72일 때, 0.08 × 0.09의 계산 결과는 얼마일까요?',
        options: ['0.72', '0.072', '0.0072', '7.2'],
        correctIndex: 2,
        hint: '💡 소수 두 자리(0.08)와 소수 두 자리(0.09)를 곱하면 소수점 아래 네 자리가 됩니다!',
        explanation: '72에서 소수점을 왼쪽으로 네 자리 옮기면 빈자리에 0이 두 개 들어가 0.0072가 됩니다.'
      },
      {
        id: 'cur_12',
        category: '보기 활용',
        question: '[보기] 27 × 61 = 1647을 이용할 때, 2.7 × 610의 값은 얼마일까요?',
        options: ['16.47', '164.7', '16470', '1647'],
        correctIndex: 3,
        hint: '💡 27이 1/10배(2.7)가 되고, 61이 10배(610)가 되었으므로 곱은 그대로입니다!',
        explanation: '한쪽은 1/10배, 다른 쪽은 10배가 되어 서로 상쇄되므로 결과는 1647로 같습니다.'
      },
      {
        id: 'cur_13',
        category: '보기 활용',
        question: '[보기] 51 × 35 = 1785일 때, 0.51 × 0.35의 계산 결과는?',
        options: ['0.1785', '1.785', '17.85', '0.01785'],
        correctIndex: 0,
        hint: '💡 소수 두 자리 수와 소수 두 자리 수의 곱은 소수 네 자리 수입니다!',
        explanation: '51 × 35 = 1785에서 소수점 아래 네 자리가 되도록 점을 찍으면 0.1785입니다.'
      },
      {
        id: 'cur_14',
        category: '빈칸 추론',
        question: '397 × 23 = 9131일 때, 3.97 × ( □ ) = 9.131입니다. □ 안에 알맞은 수는?',
        options: ['0.23', '2.3', '23', '0.023'],
        correctIndex: 1,
        hint: '💡 곱이 9.131(소수 세 자리)이고 3.97이 소수 두 자리이므로, □는 소수 한 자리 수여야 합니다!',
        explanation: '소수 두 자리(3.97)와 소수 한 자리(2.3)를 곱해야 소수 세 자리(9.131)가 됩니다.'
      },
      {
        id: 'cur_15',
        category: '빈칸 추론',
        question: '397 × 23 = 9131일 때, ( □ ) × 0.23 = 913.1입니다. □ 안에 알맞은 수는?',
        options: ['39.7', '397', '3970', '3.97'],
        correctIndex: 2,
        hint: '💡 0.23은 23의 1/100배인데, 결과(913.1)는 9131의 1/10배입니다. □는 397의 10배여야 해요!',
        explanation: '3970 × 0.23 = 913.1이므로 □ 안에 들어갈 수는 3970입니다.'
      },
      {
        id: 'cur_16',
        category: '곱 비교하기',
        question: '다음 중 계산 결과가 나머지 셋과 다른 하나는 어느 것일까요?',
        options: [
          '㉠ 12.9 × 0.1',
          '㉡ 0.129 × 10',
          '㉢ 0.0129 × 100',
          '㉣ 1290 × 0.01'
        ],
        correctIndex: 3,
        hint: '💡 각각의 소수점을 이동해 보세요! ㉠, ㉡, ㉢은 모두 1.29가 됩니다.',
        explanation: '㉠, ㉡, ㉢은 모두 1.29이지만, ㉣ 1290 × 0.01은 소수점이 왼쪽으로 두 칸 이동해 12.9가 됩니다.'
      },
      {
        id: 'cur_17',
        category: '곱의 크기 비교',
        question: '[ 4.15 × 10 ] 과 [ 41.5 × 0.1 ] 중 어느 쪽이 더 클까요?',
        options: [
          '4.15 × 10이 더 크다',
          '41.5 × 0.1이 더 크다',
          '두 식의 곱이 같다',
          '비교할 수 없다'
        ],
        correctIndex: 0,
        hint: '💡 4.15 × 10은 소수점이 오른쪽으로 한 칸, 41.5 × 0.1은 왼쪽으로 한 칸 이동합니다!',
        explanation: '4.15 × 10 = 41.5이고, 41.5 × 0.1 = 4.15이므로 4.15 × 10이 더 큽니다.'
      },
      {
        id: 'cur_18',
        category: '실생활 활용',
        question: '농구공 한 개의 무게는 0.57 kg입니다. 농구공 100개의 무게는 몇 kg일까요?',
        options: ['5.7 kg', '57 kg', '570 kg', '0.057 kg'],
        correctIndex: 1,
        hint: '💡 0.57 × 100입니다! 소수점을 오른쪽으로 두 칸 옮겨보세요.',
        explanation: '0.57 × 100 = 57이므로 농구공 100개의 무게는 57 kg입니다.'
      },
      {
        id: 'cur_19',
        category: '수익 67쪽 심화',
        question: '73 × 6 = 438입니다. 0.73 × ( □ ) = 0.0438이 되려면 □ 안에 들어갈 수는?',
        options: ['0.6', '6', '0.06', '0.006'],
        correctIndex: 2,
        hint: '💡 결과(0.0438)가 소수 네 자리이고 0.73이 소수 두 자리이므로, □도 소수 두 자리 수여야 합니다!',
        explanation: '0.73(소수 두 자리) × 0.06(소수 두 자리) = 0.0438(소수 네 자리)이므로 정답은 0.06입니다.'
      },

      // 3. 수업 게임 (재빨리 OX & 응용 문제)
      {
        id: 'cur_20',
        category: '소수점 이동',
        question: '375 × 0.01을 바르게 계산한 값은 얼마일까요?',
        options: ['37.5', '3750', '0.375', '3.75'],
        correctIndex: 3,
        hint: '💡 0.01을 곱하면 소수점이 왼쪽으로 두 자리 옮겨집니다!',
        explanation: '375에서 소수점을 왼쪽으로 두 자리 옮기면 3.75가 됩니다.'
      },
      {
        id: 'cur_21',
        category: '소수점 이동',
        question: '0.83 × ( □ ) = 830이 되려면 □ 안에 어떤 수를 곱해야 할까요?',
        options: ['1000', '100', '10', '0.001'],
        correctIndex: 0,
        hint: '💡 0.83에서 830이 되려면 소수점이 오른쪽으로 몇 칸 이동했는지 세어보세요!',
        explanation: '0.83 → 8.3(10배) → 83(100배) → 830(1000배)으로 세 자리 이동했으므로 1000을 곱해야 합니다.'
      },
      {
        id: 'cur_22',
        category: '보기 활용',
        question: '63 × 42 = 2646일 때, 0.63 × 420의 계산 결과는 얼마일까요?',
        options: ['26.46', '264.6', '2.646', '2646'],
        correctIndex: 1,
        hint: '💡 0.63은 1/100배, 420은 10배이므로 전체 결과는 2646의 1/10배가 됩니다!',
        explanation: '2646에서 소수점을 왼쪽으로 한 자리 옮기면 264.6이 됩니다.'
      },
      {
        id: 'cur_23',
        category: '곱 비교하기',
        question: '㉠ 36 × 0.15, ㉡ 3.6 × 1.5, ㉢ 0.36 × 1.5 중 계산 결과가 다른 하나는?',
        options: ['㉠', '㉡', '㉢', '모두 같다'],
        correctIndex: 2,
        hint: '💡 두 수의 소수점 아래 자릿수의 합을 비교해 보세요! ㉠과 ㉡은 총 두 자리, ㉢은 총 세 자리입니다.',
        explanation: '㉠과 ㉡은 모두 5.4이지만, ㉢ 0.36 × 1.5는 0.54이므로 ㉢이 다릅니다.'
      },
      {
        id: 'cur_24',
        category: '실생활 문장제',
        question: '가로가 0.6m, 세로가 3.2m인 직사각형의 넓이를 구하다가 세로의 소수점을 잘못 찍어 0.192 ㎡가 나왔습니다. 잘못 읽은 세로는 몇 m일까요?',
        options: ['32 m', '0.032 m', '3.2 m', '0.32 m'],
        correctIndex: 3,
        hint: '💡 0.6(소수 한 자리)과 곱해서 0.192(소수 세 자리)가 되려면 세로는 소수 몇 자리여야 할까요?',
        explanation: '바른 식은 0.6 × 3.2 = 1.92 ㎡이고, 0.192 ㎡가 되려면 0.6 × 0.32를 계산한 것이므로 0.32m입니다.'
      }
    ];
  }

  // 끝자리가 0이 되지 않는 두 자연수 생성 헬퍼
  getNonZeroProductPair(minA, maxA, minB, maxB) {
    let aInt, bInt;
    do {
      aInt = Math.floor(Math.random() * (maxA - minA + 1)) + minA;
      bInt = Math.floor(Math.random() * (maxB - minB + 1)) + minB;
    } while (aInt % 10 === 0 || bInt % 10 === 0 || (aInt * bInt) % 10 === 0);
    return [aInt, bInt];
  }

  // 소수점 뒤 불필요한 0 제거 헬퍼 (예: "0.50" -> "0.5", "1.000" -> "1")
  formatCleanDecimal(num, maxDecimals = 5) {
    return parseFloat(num.toFixed(maxDecimals)).toString();
  }

  // 동적 문제 생성기 (8차시 곱의 소수점 위치 규칙 6가지 유형 무한 생성)
  generateDynamicQuestion() {
    const types = [
      '10_100_1000곱하기',
      '0.1_0.01_0.001곱하기',
      '자연수곱셈소수점찾기',
      '빈칸곱하는수추론',
      '곱이같은식찾기',
      '무게열량실생활'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = 'dyn_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // 유형 1: 소수에 10, 100, 1000 곱하기 (소수점 오른쪽 이동)
    if (type === '10_100_1000곱하기') {
      const [baseInt] = this.getNonZeroProductPair(112, 987, 2, 3);
      const decStr = (baseInt / 100).toFixed(2); // 예: 3.47
      const multipliers = [10, 100, 1000];
      const mult = multipliers[Math.floor(Math.random() * multipliers.length)];
      const shift = mult === 10 ? 1 : (mult === 100 ? 2 : 3);

      const correctVal = this.formatCleanDecimal((baseInt / 100) * mult);
      const wrong1 = this.formatCleanDecimal((baseInt / 100) * (mult * 10));
      const wrong2 = this.formatCleanDecimal((baseInt / 100) * (mult / 10));
      const wrong3 = this.formatCleanDecimal((baseInt / 100) / mult);

      return {
        id,
        category: '소수점 오른쪽 이동',
        question: `${decStr} × ${mult}의 계산 결과는 얼마일까요?`,
        options: [correctVal, wrong1, wrong2, wrong3],
        correctIndex: 0,
        hint: `💡 ${mult}을 곱하면 소수점이 오른쪽으로 ${shift}자리 옮겨집니다!`,
        explanation: `${decStr}에 ${mult}을 곱하면 소수점이 오른쪽으로 ${shift}자리 이동하여 ${correctVal}이 됩니다.`
      };
    }

    // 유형 2: 자연수/소수에 0.1, 0.01, 0.001 곱하기 (소수점 왼쪽 이동)
    if (type === '0.1_0.01_0.001곱하기') {
      const [baseInt] = this.getNonZeroProductPair(123, 948, 2, 3);
      const mults = [
        { str: '0.1', factor: 0.1, shift: 1 },
        { str: '0.01', factor: 0.01, shift: 2 },
        { str: '0.001', factor: 0.001, shift: 3 }
      ];
      const m = mults[Math.floor(Math.random() * mults.length)];

      const correctVal = this.formatCleanDecimal(baseInt * m.factor);
      const wrong1 = this.formatCleanDecimal(baseInt * m.factor * 10);
      const wrong2 = this.formatCleanDecimal(baseInt * m.factor * 0.1);
      const wrong3 = this.formatCleanDecimal(baseInt * m.factor * 100);

      return {
        id,
        category: '소수점 왼쪽 이동',
        question: `${baseInt} × ${m.str}의 계산 결과는 얼마일까요?`,
        options: [correctVal, wrong1, wrong2, wrong3],
        correctIndex: 0,
        hint: `💡 ${m.str}을 곱하면 소수점이 왼쪽으로 ${m.shift}자리 옮겨집니다!`,
        explanation: `${baseInt}에 ${m.str}을 곱하면 소수점이 왼쪽으로 ${m.shift}자리 이동하여 ${correctVal}이 됩니다.`
      };
    }

    // 유형 3: [보기] 자연수의 곱을 이용하여 소수×소수 소수점 위치 찾기 (수99p 4번 유형)
    if (type === '자연수곱셈소수점찾기') {
      const [x, y] = this.getNonZeroProductPair(23, 89, 12, 49);
      const prod = x * y;
      const decPatterns = [
        { aDiv: 10, bDiv: 100, totalPlaces: 3 },
        { aDiv: 100, bDiv: 10, totalPlaces: 3 },
        { aDiv: 100, bDiv: 100, totalPlaces: 4 },
        { aDiv: 10, bDiv: 10, totalPlaces: 2 }
      ];
      const pat = decPatterns[Math.floor(Math.random() * decPatterns.length)];
      const aStr = this.formatCleanDecimal(x / pat.aDiv);
      const bStr = this.formatCleanDecimal(y / pat.bDiv);
      const totalDiv = pat.aDiv * pat.bDiv;

      const correctVal = this.formatCleanDecimal(prod / totalDiv);
      const wrong1 = this.formatCleanDecimal((prod / totalDiv) * 10);
      const wrong2 = this.formatCleanDecimal((prod / totalDiv) * 0.1);
      const wrong3 = this.formatCleanDecimal((prod / totalDiv) * 100);

      return {
        id,
        category: '보기 활용',
        question: `[보기] ${x} × ${y} = ${prod}을 이용하여 ${aStr} × ${bStr}을 계산한 값은?`,
        options: [correctVal, wrong1, wrong2, wrong3],
        correctIndex: 0,
        hint: `💡 두 수의 소수점 아래 자릿수를 더하면 총 ${pat.totalPlaces}자리입니다!`,
        explanation: `${x} × ${y} = ${prod}에서 소수점 아래 자릿수의 합이 ${pat.totalPlaces}자리이므로 ${correctVal}입니다.`
      };
    }

    // 유형 4: 빈칸 추론 (10, 100, 0.1, 0.01 등 어떤 수를 곱했는지 찾기)
    if (type === '빈칸곱하는수추론') {
      const [baseInt] = this.getNonZeroProductPair(12, 98, 2, 3);
      const startNum = this.formatCleanDecimal(baseInt / 10); // 예: 4.7
      const choices = [
        { ans: '100', val: this.formatCleanDecimal((baseInt / 10) * 100), desc: '오른쪽으로 두 자리' },
        { ans: '10', val: this.formatCleanDecimal((baseInt / 10) * 10), desc: '오른쪽으로 한 자리' },
        { ans: '0.1', val: this.formatCleanDecimal((baseInt / 10) * 0.1), desc: '왼쪽으로 한 자리' },
        { ans: '0.01', val: this.formatCleanDecimal((baseInt / 10) * 0.01), desc: '왼쪽으로 두 자리' }
      ];
      const picked = choices[Math.floor(Math.random() * choices.length)];
      const options = ['10', '100', '0.1', '0.01'];

      return {
        id,
        category: '빈칸 추론',
        question: `${startNum} × ( □ ) = ${picked.val}일 때, □ 안에 알맞은 수는?`,
        options,
        correctIndex: options.indexOf(picked.ans),
        hint: `💡 ${startNum}에서 ${picked.val}이 되려면 소수점이 어느 쪽으로 몇 칸 이동했는지 확인해 보세요!`,
        explanation: `소수점이 ${picked.desc} 이동했으므로 □ 안에는 ${picked.ans}이 들어가야 합니다.`
      };
    }

    // 유형 5: 곱이 다른 식 찾기 (소수점 자릿수 비교)
    if (type === '곱이같은식찾기') {
      const [x, y] = this.getNonZeroProductPair(12, 48, 2, 9);
      const prod = x * y;
      // 세 식은 소수 두 자리(prod / 100), 한 식은 소수 한 자리(prod / 10)
      const opt1 = `${this.formatCleanDecimal(x / 10)} × ${this.formatCleanDecimal(y / 10)}`;
      const opt2 = `${this.formatCleanDecimal(x / 100)} × ${y}`;
      const opt3 = `${x} × ${this.formatCleanDecimal(y / 100)}`;
      const diffOpt = `${this.formatCleanDecimal(x / 10)} × ${y}`;

      return {
        id,
        category: '곱 비교하기',
        question: '다음 중 계산 결과(소수점의 위치)가 나머지 셋과 다른 하나는?',
        options: [diffOpt, opt1, opt2, opt3],
        correctIndex: 0,
        hint: '💡 곱하는 두 수의 소수점 아래 자릿수의 합이 몇 자리인지 각각 세어보세요!',
        explanation: `나머지 셋은 모두 ${this.formatCleanDecimal(prod / 100)}(소수 두 자리)이지만, ${diffOpt}만 ${this.formatCleanDecimal(prod / 10)}(소수 한 자리)입니다.`
      };
    }

    // 유형 6: 실생활 (10개, 100개, 1000개 무게/열량 구하기)
    const items = [
      { name: '야구공 한 개의 무게', unit: 'kg', val: 0.14 },
      { name: '사과 한 개의 무게', unit: 'kg', val: 0.28 },
      { name: '계단 한 칸을 오를 때 소모 열량', unit: 'kcal', val: 0.15 },
      { name: '초콜릿 한 개의 무게', unit: 'g', val: 9.41 },
      { name: '비타민 한 알의 무게', unit: 'g', val: 1.25 }
    ];
    const item = items[Math.floor(Math.random() * items.length)];
    const counts = [10, 100, 1000];
    const count = counts[Math.floor(Math.random() * counts.length)];

    const correctNum = this.formatCleanDecimal(item.val * count);
    const wrong1Num = this.formatCleanDecimal(item.val * count * 10);
    const wrong2Num = this.formatCleanDecimal(item.val * count * 0.1);
    const wrong3Num = this.formatCleanDecimal(item.val * count * 0.01);

    return {
      id,
      category: '실생활 활용',
      question: `${item.name}가 ${item.val} ${item.unit}일 때, ${count}개의 전체 양은 얼마일까요?`,
      options: [
        `${correctNum} ${item.unit}`,
        `${wrong1Num} ${item.unit}`,
        `${wrong2Num} ${item.unit}`,
        `${wrong3Num} ${item.unit}`
      ],
      correctIndex: 0,
      hint: `💡 ${item.val} × ${count}을 계산해 보세요! 소수점을 오른쪽으로 옮기면 됩니다.`,
      explanation: `${item.val} × ${count} = ${correctNum}이므로 정답은 ${correctNum} ${item.unit}입니다.`
    };
  }

  // 보기 순서를 무작위로 섞고, 이전 문제와 정답 번호가 가급적 겹치지 않게 골고루 배치
  randomizeQuestionOptions(question) {
    const correctAnswerText = question.options[question.correctIndex];
    let shuffledOptions = this.shuffle(question.options);
    let newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

    // 직전 정답 번호와 똑같다면 한 번 더 섞어서 특정 번호 쏠림 방지
    if (newCorrectIndex === this.lastCorrectIndex && question.options.length > 1) {
      shuffledOptions = this.shuffle(question.options);
      newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
    }

    this.lastCorrectIndex = newCorrectIndex;
    return {
      ...question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex
    };
  }

  // 다음 문제 가져오기 (모든 문항의 보기 순서를 출제 시마다 랜덤 셔플)
  getNextQuestion() {
    const unusedCurated = this.curatedPool.filter(q => !this.usedQuestionIds.has(q.id));
    let rawQuestion;
    if (unusedCurated.length > 0) {
      rawQuestion = unusedCurated[Math.floor(Math.random() * unusedCurated.length)];
      this.usedQuestionIds.add(rawQuestion.id);
    } else {
      rawQuestion = this.generateDynamicQuestion();
    }
    return this.randomizeQuestionOptions(rawQuestion);
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  recordAnswer(isCorrect) {
    this.totalQuestions++;
    if (isCorrect) {
      this.combo++;
      this.correctCount++;
    } else {
      this.combo = 0;
    }
    return {
      combo: this.combo,
      correctCount: this.correctCount,
      accuracy: Math.round((this.correctCount / this.totalQuestions) * 100)
    };
  }
}
