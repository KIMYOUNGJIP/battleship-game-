// 초등학교 5학년 2학기 수학 4단원: 소수의 곱셈
// [7차시] (소수)×(소수)를 알아볼까요(2) - 소수 두 자리 수인 경우 (수학 96~97쪽, 수익 64~65쪽)
// 문제 은행 및 자동 생성 시스템

export class MathQuizEngine {
  constructor() {
    this.usedQuestionIds = new Set();
    this.combo = 0;
    this.correctCount = 0;
    this.totalQuestions = 0;

    // 수제 큐레이션된 교과서, 수익, 활동지, 마피아 퀴즈 풀 (24문항)
    this.curatedPool = [
      // 1. 교과서 및 수업 PPT 마피아 퀴즈 문제
      {
        id: 'cur_1',
        category: '소수의 곱셈',
        question: '0.23 × 0.4의 계산 결과는 얼마일까요?',
        options: ['0.092', '0.92', '9.2', '0.0092'],
        correctIndex: 0,
        hint: '💡 23 × 4 = 92입니다. 소수 두 자리와 소수 한 자리의 곱이므로 소수 셋째 자리 수가 됩니다!',
        explanation: '0.23(소수 2자리) × 0.4(소수 1자리) = 23/100 × 4/10 = 92/1000 = 0.092입니다.'
      },
      {
        id: 'cur_2',
        category: '소수의 곱셈',
        question: '0.32 × 1.3의 계산 결과는 얼마일까요?',
        options: ['0.416', '4.16', '0.0416', '41.6'],
        correctIndex: 0,
        hint: '💡 32 × 13 = 416입니다. 소수점 아래 자릿수가 총 몇 개인지 세어보세요.',
        explanation: '32 × 13 = 416이고, 소수 2자리와 소수 1자리의 곱이므로 소수 세 자리가 되어 0.416입니다.'
      },
      {
        id: 'cur_3',
        category: '소수의 곱셈',
        question: '4.03 × 1.2의 계산 결과로 알맞은 것은?',
        options: ['4.836', '48.36', '0.4836', '4.832'],
        correctIndex: 0,
        hint: '💡 4.03은 약 4, 1.2는 약 1이므로 결과는 약 4 근처(4.836)가 됩니다.',
        explanation: '403 × 12 = 4836에서 소수 두 자리와 소수 한 자리를 곱했으므로 소수 세 자리가 되어 4.836입니다.'
      },
      {
        id: 'cur_4',
        category: '소수의 곱셈',
        question: '3.51 × 2.3의 계산 결과는 얼마일까요?',
        options: ['8.073', '80.73', '0.8073', '7.073'],
        correctIndex: 0,
        hint: '💡 351 × 23 = 8073입니다. 소수점 아래 총 3자리가 되도록 점을 찍어보세요.',
        explanation: '351 × 23 = 8073이므로, 1/100과 1/10을 곱한 1/1000이 되어 8.073입니다.'
      },
      {
        id: 'cur_5',
        category: '끝자리 0 처리',
        question: '0.92 × 3.5의 계산 결과로 알맞은 것은 어느 것일까요?',
        options: ['3.22', '3.220', '32.2', '0.322'],
        correctIndex: 0,
        hint: '💡 92 × 35 = 3220입니다. 소수 세 자리(3.220)에서 맨 끝 0은 생략합니다!',
        explanation: '92 × 35 = 3220이므로 소수 셋째 자리는 3.220이며, 소수점 아래 맨 끝 0을 생략하여 3.22로 씁니다.'
      },
      {
        id: 'cur_6',
        category: '소수의 곱셈',
        question: '1.24 × 0.3의 계산 결과는 얼마일까요?',
        options: ['0.372', '3.72', '0.0372', '37.2'],
        correctIndex: 0,
        hint: '💡 124 × 3 = 372입니다. 소수 2자리와 소수 1자리의 곱입니다.',
        explanation: '124 × 3 = 372이고 1/100 × 1/10 = 1/1000이므로 0.372입니다.'
      },
      {
        id: 'cur_7',
        category: '소수의 곱셈',
        question: '6.27 × 0.2의 계산 결과는 얼마일까요?',
        options: ['1.254', '12.54', '0.1254', '1.244'],
        correctIndex: 0,
        hint: '💡 627 × 2 = 1254입니다. 소수 세 자리 수가 되도록 점을 찍으세요.',
        explanation: '627 × 2 = 1254에서 소수 둘째 자리와 소수 첫째 자리를 곱했으므로 1.254입니다.'
      },
      {
        id: 'cur_8',
        category: '소수의 곱셈',
        question: '2.17 × 1.3의 계산 결과는 얼마일까요?',
        options: ['2.821', '28.21', '0.2821', '2.721'],
        correctIndex: 0,
        hint: '💡 217 × 13 = 2821입니다. 소수점 위치를 확인해 보세요.',
        explanation: '217 × 13 = 2821이며, 소수 세 자리로 나타내면 2.821입니다.'
      },
      {
        id: 'cur_9',
        category: '끝자리 0 처리',
        question: '2.95 × 3.2의 계산 결과로 알맞은 것은?',
        options: ['9.44', '9.440', '94.4', '0.944'],
        correctIndex: 0,
        hint: '💡 295 × 32 = 9440입니다. 소수 셋째 자리는 9.440이지만 끝의 0은 생략합니다.',
        explanation: '295 × 32 = 9440이므로 소수 세 자리는 9.440이고, 끝자리 0을 지우면 9.44가 됩니다.'
      },
      {
        id: 'cur_10',
        category: '소수의 곱셈',
        question: '4.5 × 2.21의 계산 결과는 얼마일까요?',
        options: ['9.945', '99.45', '0.9945', '9.845'],
        correctIndex: 0,
        hint: '💡 45 × 221 = 9945입니다. 소수 한 자리와 소수 두 자리의 곱이므로 총 세 자리입니다.',
        explanation: '45 × 221 = 9945이고, 소수 1자리와 2자리를 곱하면 소수 3자리가 되므로 9.945입니다.'
      },

      // 2. 활동지 암호 해독 문제 풀
      {
        id: 'cur_11',
        category: '활동지 암호문제',
        question: '0.14 × 0.8의 계산 결과는 얼마일까요?',
        options: ['0.112', '1.12', '0.0112', '11.2'],
        correctIndex: 0,
        hint: '💡 14 × 8 = 112입니다. 소수점 아래 두 자리와 한 자리를 더하면 세 자리가 됩니다.',
        explanation: '14 × 8 = 112이므로 1/1000배를 하면 0.112가 됩니다.'
      },
      {
        id: 'cur_12',
        category: '소수의 곱셈',
        question: '0.5 × 0.05의 계산 결과는 얼마일까요?',
        options: ['0.025', '0.25', '0.0025', '2.5'],
        correctIndex: 0,
        hint: '💡 5 × 5 = 25입니다. 소수 한 자리와 소수 두 자리의 곱이므로 소수 세 자리가 되어야 합니다!',
        explanation: '5/10 × 5/100 = 25/1000 = 0.025입니다.'
      },
      {
        id: 'cur_13',
        category: '활동지 암호문제',
        question: '2.3 × 1.41의 계산 결과는 얼마일까요?',
        options: ['3.243', '32.43', '0.3243', '3.443'],
        correctIndex: 0,
        hint: '💡 23 × 141 = 3243입니다. 1/10 × 1/100 = 1/1000이므로 소수 세 자리가 됩니다.',
        explanation: '23 × 141 = 3243이므로 소수점을 세 자리 앞으로 옮기면 3.243입니다.'
      },
      {
        id: 'cur_14',
        category: '끝자리 0 처리',
        question: '0.5 × 1.2의 계산 결과로 가장 알맞은 것은?',
        options: ['0.6', '0.60', '6.0', '0.06'],
        correctIndex: 0,
        hint: '💡 5 × 12 = 60입니다. 소수 두 자리는 0.60이지만 맨 끝 0은 생략합니다.',
        explanation: '0.5 × 1.2 = 0.60이며, 소수점 아래 맨 끝의 0은 생략하여 0.6으로 나타냅니다.'
      },
      {
        id: 'cur_15',
        category: '소수의 곱셈',
        question: '8.4 × 0.1의 계산 결과는 얼마일까요?',
        options: ['0.84', '8.4', '0.084', '84'],
        correctIndex: 0,
        hint: '💡 0.1을 곱하면 소수점이 왼쪽으로 1칸 이동합니다.',
        explanation: '8.4에 0.1(1/10)을 곱하면 소수점이 왼쪽으로 한 칸 이동하여 0.84가 됩니다.'
      },
      {
        id: 'cur_16',
        category: '소수의 곱셈',
        question: '0.7 × 0.31의 계산 결과는 얼마일까요?',
        options: ['0.217', '2.17', '0.0217', '0.271'],
        correctIndex: 0,
        hint: '💡 7 × 31 = 217입니다. 소수 한 자리와 소수 두 자리를 곱하면 소수 세 자리가 됩니다.',
        explanation: '7/10 × 31/100 = 217/1000 = 0.217입니다.'
      },
      {
        id: 'cur_17',
        category: '소수의 곱셈',
        question: '9.1 × 2.9의 계산 결과는 얼마일까요?',
        options: ['26.39', '2.639', '263.9', '27.39'],
        correctIndex: 0,
        hint: '💡 91 × 29 = 2639입니다. 소수 한 자리끼리 곱하면 소수 두 자리 수가 됩니다.',
        explanation: '91 × 29 = 2639에서 1/10 × 1/10 = 1/100이므로 26.39입니다.'
      },
      {
        id: 'cur_18',
        category: '소수의 곱셈',
        question: '3.9 × 3.1의 계산 결과는 얼마일까요?',
        options: ['12.09', '120.9', '1.209', '11.09'],
        correctIndex: 0,
        hint: '💡 39 × 31 = 1209입니다. 약 4 × 3 = 12 정도가 되는지 어림해 보세요.',
        explanation: '39 × 31 = 1209이고 소수 두 자리 수가 되므로 12.09입니다.'
      },
      {
        id: 'cur_19',
        category: '소수의 곱셈',
        question: '1.2 × 4.1의 계산 결과는 얼마일까요?',
        options: ['4.92', '49.2', '0.492', '4.82'],
        correctIndex: 0,
        hint: '💡 12 × 41 = 492입니다. 1/100배를 하면 소수점이 어디에 찍힐까요?',
        explanation: '12 × 41 = 492에서 소수점 아래 두 자리 수가 되므로 4.92입니다.'
      },

      // 3. 교과서 원리 & 소수점 위치 & 문장제
      {
        id: 'cur_20',
        category: '자연수 곱셈 활용',
        question: '141 × 23 = 3243을 이용하여 1.41 × 2.3의 값을 구하면?',
        options: ['3.243', '32.43', '0.3243', '324.3'],
        correctIndex: 0,
        hint: '💡 1.41은 141의 1/100배, 2.3은 23의 1/10배이므로 전체 결과는 1/1000배가 됩니다.',
        explanation: '141이 1/100배, 23이 1/10배 되었으므로 곱은 3243의 1/1000배인 3.243입니다.'
      },
      {
        id: 'cur_21',
        category: '소수점 위치 규칙',
        question: '(소수 두 자리 수) × (소수 한 자리 수)의 곱은 소수점 아래가 몇 자리일까요? (끝자리가 0이 아닌 경우)',
        options: ['소수 세 자리', '소수 두 자리', '소수 한 자리', '소수 네 자리'],
        correctIndex: 0,
        hint: '💡 곱하는 두 수의 소수점 아래 자리 수(2자리 + 1자리)를 더해보세요!',
        explanation: '소수 두 자리 수(1/100)와 소수 한 자리 수(1/10)를 곱하면 1/1000이 되므로 소수 세 자리가 됩니다.'
      },
      {
        id: 'cur_22',
        category: '분수의 곱셈 변환',
        question: '0.23 × 0.4를 분수의 곱셈으로 바르게 나타낸 식은 어느 것일까요?',
        options: [
          '23/100 × 4/10 = 92/1000',
          '23/10 × 4/100 = 92/100',
          '23/100 × 4/100 = 92/10000',
          '23/10 × 4/10 = 92/100'
        ],
        correctIndex: 0,
        hint: '💡 0.23은 23/100이고, 0.4는 4/10입니다.',
        explanation: '0.23 = 23/100, 0.4 = 4/10이므로 23/100 × 4/10 = 92/1000 = 0.092입니다.'
      },
      {
        id: 'cur_23',
        category: '어림하기',
        question: '5.02 × 1.9의 계산 결과를 어림하여 가장 알맞은 소수점 위치를 찾은 것은?',
        options: ['9.538', '95.38', '0.9538', '953.8'],
        correctIndex: 0,
        hint: '💡 5.02는 약 5, 1.9는 약 2이므로 5 × 2 = 10 근처의 값을 찾으세요!',
        explanation: '5.02 ≒ 5, 1.9 ≒ 2이므로 곱은 약 10 근처여야 합니다. 따라서 9.538이 올바른 값입니다.'
      },
      {
        id: 'cur_24',
        category: '실생활 문장제',
        question: '해적선 깃발의 가로가 1.4m, 세로가 0.25m입니다. 이 깃발의 넓이는 몇 ㎡일까요?',
        options: ['0.35 ㎡', '3.5 ㎡', '0.035 ㎡', '35 ㎡'],
        correctIndex: 0,
        hint: '💡 직사각형의 넓이 = 가로 × 세로입니다. 14 × 25 = 350을 계산해 보세요.',
        explanation: '1.4 × 0.25 = 0.350 ㎡이며 끝자리 0을 생략하면 0.35 ㎡가 됩니다.'
      }
    ];
  }

  // 동적 문제 생성기 (소수×소수 6가지 유형 무한 생성)
  generateDynamicQuestion() {
    const types = [
      '소수두자리X한자리',
      '소수한자리X두자리',
      '자연수곱셈이용',
      '소수점자릿수판별',
      '끝자리0생략',
      '직사각형넓이문장제'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = 'dyn_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // 유형 1: (소수 두 자리) × (소수 한 자리) -> 소수 세 자리
    if (type === '소수두자리X한자리') {
      const aInt = Math.floor(Math.random() * 80) + 11; // 11 ~ 90 (끝자리가 0이 아니도록)
      const bInt = Math.floor(Math.random() * 8) + 2;   // 2 ~ 9
      const a = (aInt / 100).toFixed(2);
      const b = (bInt / 10).toFixed(1);
      const productInt = aInt * bInt;
      const correctVal = (productInt / 1000).toFixed(3);

      const wrong1 = (productInt / 100).toFixed(2);
      const wrong2 = (productInt / 10000).toFixed(4);
      const wrong3 = ((productInt + 10) / 1000).toFixed(3);

      const options = this.shuffle([correctVal, wrong1, wrong2, wrong3]);
      return {
        id,
        category: '소수의 곱셈',
        question: `${a} × ${b}의 계산 결과는 얼마일까요?`,
        options,
        correctIndex: options.indexOf(correctVal),
        hint: `💡 ${aInt} × ${bInt} = ${productInt}입니다. 소수 두 자리와 한 자리를 곱했으므로 소수 세 자리가 됩니다.`,
        explanation: `${a} × ${b} = ${aInt}/100 × ${bInt}/10 = ${productInt}/1000 = ${correctVal}입니다.`
      };
    }

    // 유형 2: (소수 한 자리) × (소수 두 자리) -> 소수 세 자리
    if (type === '소수한자리X두자리') {
      const aInt = Math.floor(Math.random() * 8) + 2;   // 2 ~ 9
      const bInt = Math.floor(Math.random() * 80) + 11; // 11 ~ 90
      const a = (aInt / 10).toFixed(1);
      const b = (bInt / 100).toFixed(2);
      const productInt = aInt * bInt;
      const correctVal = (productInt / 1000).toFixed(3);

      const wrong1 = (productInt / 100).toFixed(2);
      const wrong2 = (productInt / 10).toFixed(1);
      const wrong3 = (productInt / 10000).toFixed(4);

      const options = this.shuffle([correctVal, wrong1, wrong2, wrong3]);
      return {
        id,
        category: '소수의 곱셈',
        question: `${a} × ${b}의 계산 결과는 얼마일까요?`,
        options,
        correctIndex: options.indexOf(correctVal),
        hint: `💡 ${aInt} × ${bInt} = ${productInt}입니다. 소수점 아래 총 자릿수를 확인하세요!`,
        explanation: `${a} × ${b} = ${aInt}/10 × ${bInt}/100 = ${productInt}/1000 = ${correctVal}입니다.`
      };
    }

    // 유형 3: 자연수 곱셈 관계를 이용한 소수점 위치 찾기
    if (type === '자연수곱셈이용') {
      const x = Math.floor(Math.random() * 80) + 12; // 12 ~ 91
      const y = Math.floor(Math.random() * 8) + 3;   // 3 ~ 10
      const prod = x * y;
      const a = (x / 100).toFixed(2);
      const b = (y / 10).toFixed(1);
      const correctVal = (prod / 1000).toFixed(3);

      const wrong1 = (prod / 100).toFixed(2);
      const wrong2 = (prod / 10).toFixed(1);
      const wrong3 = (prod / 10000).toFixed(4);

      const options = this.shuffle([correctVal, wrong1, wrong2, wrong3]);
      return {
        id,
        category: '자연수 곱셈 활용',
        question: `${x} × ${y} = ${prod}일 때, ${a} × ${b}의 값은?`,
        options,
        correctIndex: options.indexOf(correctVal),
        hint: `💡 ${a}은 ${x}의 1/100배, ${b}는 ${y}의 1/10배이므로 결과는 1/1000배가 됩니다.`,
        explanation: `${x} × ${y} = ${prod}에서 1/100 × 1/10 = 1/1000배이므로 ${correctVal}입니다.`
      };
    }

    // 유형 4: 소수점 자릿수 판별
    if (type === '소수점자릿수판별') {
      const qTypes = [
        { desc: '소수 두 자리 수와 소수 한 자리 수', digits: 3, answer: '소수 셋째 자리' },
        { desc: '소수 두 자리 수와 소수 두 자리 수', digits: 4, answer: '소수 넷째 자리' },
        { desc: '소수 한 자리 수와 소수 두 자리 수', digits: 3, answer: '소수 셋째 자리' }
      ];
      const item = qTypes[Math.floor(Math.random() * qTypes.length)];
      const correctVal = item.answer;
      const options = this.shuffle(['소수 셋째 자리', '소수 둘째 자리', '소수 첫째 자리', '소수 넷째 자리']);
      return {
        id,
        category: '소수점 위치 규칙',
        question: `끝자리가 0이 아닐 때, ${item.desc}를 곱하면 그 결과는 소수 몇째 자리 수일까요?`,
        options,
        correctIndex: options.indexOf(correctVal),
        hint: '💡 곱하는 두 수의 소수점 아래 자리 수를 서로 더해보세요!',
        explanation: `${item.desc}를 곱하면 소수점 아래 자릿수의 합이 되므로 ${correctVal} 수가 됩니다.`
      };
    }

    // 유형 5: 끝자리 0이 생략되는 경우 (예: 0.5 × 1.2 = 0.6)
    if (type === '끝자리0생략') {
      const pairs = [
        { a: 0.5, b: 0.4, full: '0.20', clean: '0.2' },
        { a: 0.5, b: 1.2, full: '0.60', clean: '0.6' },
        { a: 0.25, b: 0.4, full: '0.100', clean: '0.1' },
        { a: 1.5, b: 0.2, full: '0.30', clean: '0.3' },
        { a: 0.35, b: 0.2, full: '0.070', clean: '0.07' }
      ];
      const item = pairs[Math.floor(Math.random() * pairs.length)];
      const correctVal = item.clean;
      const wrong1 = item.full;
      const wrong2 = (parseFloat(item.clean) * 10).toString();
      const wrong3 = (parseFloat(item.clean) / 10).toString();

      const options = this.shuffle([correctVal, wrong1, wrong2, wrong3]);
      return {
        id,
        category: '끝자리 0 처리',
        question: `${item.a} × ${item.b}의 결과를 끝자리 0을 생략하여 바르게 나타낸 것은?`,
        options,
        correctIndex: options.indexOf(correctVal),
        hint: '💡 소수점 아래 맨 끝에 있는 0은 생략하여 간단히 나타냅니다!',
        explanation: `${item.a} × ${item.b} = ${item.full}이지만, 맨 끝의 0은 생략하므로 ${correctVal}로 씁니다.`
      };
    }

    // 유형 6: 직사각형 넓이 문장제
    const w = (Math.floor(Math.random() * 5) + 1) * 0.5 + 0.5; // 1.0, 1.5, 2.0 등
    const h = 0.25;
    const area = (w * h).toFixed(3).replace(/0$/, '');
    const correctVal = `${area} ㎡`;
    const wrong1 = `${(w * h * 10).toFixed(2)} ㎡`;
    const wrong2 = `${(w * h / 10).toFixed(3)} ㎡`;
    const wrong3 = `${(w + h).toFixed(2)} ㎡`;

    const options = this.shuffle([correctVal, wrong1, wrong2, wrong3]);
    return {
      id,
      category: '실생활 문장제',
      question: `가로가 ${w}m이고 세로가 ${h}m인 해적 보물지도의 넓이는 몇 ㎡일까요?`,
      options,
      correctIndex: options.indexOf(correctVal),
      hint: '💡 직사각형의 넓이 = 가로 × 세로입니다.',
      explanation: `${w} × ${h} = ${correctVal}입니다.`
    };
  }

  // 다음 문제 가져오기
  getNextQuestion() {
    const unusedCurated = this.curatedPool.filter(q => !this.usedQuestionIds.has(q.id));
    let question;
    if (unusedCurated.length > 0) {
      question = unusedCurated[Math.floor(Math.random() * unusedCurated.length)];
      this.usedQuestionIds.add(question.id);
    } else {
      question = this.generateDynamicQuestion();
    }
    return question;
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
