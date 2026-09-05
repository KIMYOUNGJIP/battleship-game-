// 초등학교 5학년 2학기 수학 1단원: 수의 범위와 어림하기 (이상, 이하, 초과, 미만, 올림, 버림, 반올림)
// 문제 은행 및 자동 생성 시스템

export class MathQuizEngine {
  constructor() {
    this.usedQuestionIds = new Set();
    this.combo = 0;
    this.correctCount = 0;
    this.totalQuestions = 0;

    // 수제 큐레이션된 스토리텔링 & 핵심 문제 풀
    this.curatedPool = [
      // 1. 이상 (>=)
      {
        id: 'cur_1',
        category: '이상',
        question: '다음 중 "45 이상인 수"에 해당하는 것은 어느 것일까요?',
        options: ['44', '44.9', '45', '39'],
        correctIndex: 2,
        hint: '💡 "이상"은 어떤 수와 같거나 큰 수이므로 기준이 되는 수도 포함됩니다!',
        explanation: '45 이상인 수는 45와 같거나 큰 수이므로, 45가 포함됩니다.'
      },
      {
        id: 'cur_2',
        category: '이상',
        question: '놀이공원에서 키가 130cm 이상인 사람만 롤러코스터를 탈 수 있습니다. 탈 수 있는 학생은?',
        options: ['민호: 129cm', '지우: 130cm', '서연: 128.5cm', '유진: 125cm'],
        correctIndex: 1,
        hint: '💡 130cm 이상은 130cm와 같거나 더 큰 키를 의미합니다.',
        explanation: '130cm 이상에는 130cm가 포함되므로 키가 딱 130cm인 지우는 탈 수 있습니다.'
      },
      // 2. 이하 (<=)
      {
        id: 'cur_3',
        category: '이하',
        question: '다음 중 "28 이하인 수"가 아닌 것은 어느 것일까요?',
        options: ['28', '27', '21', '29'],
        correctIndex: 3,
        hint: '💡 "이하"는 어떤 수와 같거나 작은 수입니다. 28보다 큰 수를 찾아보세요!',
        explanation: '29는 28보다 크므로 28 이하인 수에 포함되지 않습니다.'
      },
      {
        id: 'cur_4',
        category: '이하',
        question: '몸무게가 40kg 이하인 학생들만 시소 타기 경기에 나갑니다. 출전할 수 없는 학생은?',
        options: ['도윤: 38kg', '하은: 40kg', '시우: 39.5kg', '준우: 41kg'],
        correctIndex: 3,
        hint: '💡 40kg 이하는 40kg과 같거나 가벼워야 합니다.',
        explanation: '준우(41kg)는 40kg을 넘으므로(초과) 출전할 수 없습니다.'
      },
      // 3. 초과 (>)
      {
        id: 'cur_5',
        category: '초과',
        question: '다음 중 "50 초과인 수"는 어느 것일까요?',
        options: ['49', '50', '50.1', '35'],
        correctIndex: 2,
        hint: '💡 "초과"는 어떤 수보다 큰 수이며, 그 수는 포함되지 않습니다!',
        explanation: '50 초과는 50보다 큰 수이므로 50은 들어가지 않고 50.1이 해당합니다.'
      },
      {
        id: 'cur_6',
        category: '초과',
        question: '어떤 터널은 통과 차량 높이가 3m를 초과하면 진입할 수 없습니다. 진입할 수 없는 차량의 높이는?',
        options: ['2.8m', '2.9m', '3.0m', '3.2m'],
        correctIndex: 3,
        hint: '💡 3m 초과는 3m보다 큰 경우를 말합니다.',
        explanation: '3.2m는 3m보다 크므로(초과) 진입할 수 없습니다.'
      },
      // 4. 미만 (<)
      {
        id: 'cur_7',
        category: '미만',
        question: '다음 중 "16 미만인 수"에 속하지 않는 것은 어느 것일까요?',
        options: ['12', '15', '16', '14.8'],
        correctIndex: 2,
        hint: '💡 "미만"은 어떤 수보다 작은 수이므로, 그 수는 포함되지 않습니다!',
        explanation: '16 미만인 수에는 16이 포함되지 않습니다.'
      },
      {
        id: 'cur_8',
        category: '수의 범위',
        question: '10 이상 15 미만인 자연수는 모두 몇 개일까요?',
        options: ['4개', '5개', '6개', '7개'],
        correctIndex: 1,
        hint: '💡 10은 포함되고, 15는 포함되지 않습니다: 10, 11, 12, 13, 14',
        explanation: '해당 자연수는 10, 11, 12, 13, 14로 총 5개입니다.'
      },
      {
        id: 'cur_9',
        category: '수의 범위',
        question: '수직선에서 20에는 채운 동그라미(●), 25에는 빈 동그라미(○)가 그려져 있습니다. 이 범위를 바르게 나타낸 것은?',
        options: ['20 이상 25 이하', '20 초과 25 미만', '20 이상 25 미만', '20 초과 25 이하'],
        correctIndex: 2,
        hint: '💡 채운 동그라미(●)는 이상/이하, 빈 동그라미(○)는 초과/미만입니다.',
        explanation: '20은 포함되므로 "이상", 25는 미포함이므로 "미만"입니다. (20 이상 25 미만)'
      },
      // 5. 올림
      {
        id: 'cur_10',
        category: '올림',
        question: '241을 "십의 자리까지 올림"하면 얼마일까요?',
        options: ['240', '250', '300', '245'],
        correctIndex: 1,
        hint: '💡 십의 자리 아래의 수(일의 자리: 1)가 0이 아니므로 십의 자리를 1 올려줍니다.',
        explanation: '일의 자리 수가 1이므로 올림하면 십의 자리가 4에서 5가 되어 250이 됩니다.'
      },
      {
        id: 'cur_11',
        category: '올림',
        question: '사탕 153개를 10개씩 묶음 상자에 모두 담으려면 상자가 최소 몇 개 필요할까요?',
        options: ['15개', '16개', '17개', '150개'],
        correctIndex: 1,
        hint: '💡 남은 사탕 3개도 담아야 하므로 올림을 이용합니다!',
        explanation: '15상자에 담고 남은 3개도 상자가 필요하므로 올림하여 16상자가 필요합니다.'
      },
      {
        id: 'cur_12',
        category: '올림',
        question: '4328을 "백의 자리까지 올림"한 수는 얼마일까요?',
        options: ['4300', '4400', '4330', '5000'],
        correctIndex: 1,
        hint: '💡 백의 자리 아래(28)가 0이 아니므로 백의 자리(3)를 1 올려서 4400이 됩니다.',
        explanation: '백의 자리 아래 수 28을 올려서 백의 자리를 4로 만들면 4400입니다.'
      },
      // 6. 버림
      {
        id: 'cur_13',
        category: '버림',
        question: '576을 "십의 자리까지 버림"하면 얼마일까요?',
        options: ['570', '580', '500', '560'],
        correctIndex: 0,
        hint: '💡 십의 자리 아래인 일의 자리(6)를 버리고 0으로 바꿉니다.',
        explanation: '일의 자리 6을 0으로 버리면 570이 됩니다.'
      },
      {
        id: 'cur_14',
        category: '버림',
        question: '동전 14,850원을 은행에서 1,000원짜리 지폐로만 바꾼다면 최대 얼마까지 바꿀 수 있을까요?',
        options: ['14,000원', '15,000원', '14,800원', '14,900원'],
        correctIndex: 0,
        hint: '💡 1,000원 미만의 금액(850원)은 지폐로 바꿀 수 없으므로 버림합니다.',
        explanation: '천의 자리 아래(850원)를 버림하면 14,000원까지 바꿀 수 있습니다.'
      },
      {
        id: 'cur_15',
        category: '버림',
        question: '8392를 "백의 자리까지 버림"한 값은?',
        options: ['8300', '8400', '8390', '8000'],
        correctIndex: 0,
        hint: '💡 백의 자리 아래인 92를 버려 00으로 만듭니다.',
        explanation: '백의 자리 아래(92)를 버리면 8300이 됩니다.'
      },
      // 7. 반올림
      {
        id: 'cur_16',
        category: '반올림',
        question: '456을 "십의 자리까지 반올림"하면 얼마일까요?',
        options: ['450', '460', '500', '455'],
        correctIndex: 1,
        hint: '💡 구하려는 자리 바로 아래(일의 자리)가 6이므로 5 이상입니다. 올림을 합니다!',
        explanation: '일의 자리 숫자가 6(5 이상)이므로 올림하여 460이 됩니다.'
      },
      {
        id: 'cur_17',
        category: '반올림',
        question: '7241을 "백의 자리까지 반올림"하면 얼마일까요?',
        options: ['7200', '7300', '7240', '7000'],
        correctIndex: 0,
        hint: '💡 백의 자리 바로 아래(십의 자리) 숫자가 4입니다. 4는 버림할까요, 올림할까요?',
        explanation: '십의 자리 숫자가 4(4 이하)이므로 버림하여 7200이 됩니다.'
      },
      {
        id: 'cur_18',
        category: '반올림',
        question: '소수 첫째 자리에서 반올림하여 6이 되는 수가 아닌 것은?',
        options: ['5.8', '6.3', '5.5', '6.6'],
        correctIndex: 3,
        hint: '💡 반올림하여 6이 되는 범위는 5.5 이상 6.5 미만입니다.',
        explanation: '6.6을 소수 첫째 자리에서 반올림하면 7이 되므로 6이 되지 않습니다.'
      },
      {
        id: 'cur_19',
        category: '반올림',
        question: '3.74를 "소수 첫째 자리까지 반올림"하면 얼마일까요?',
        options: ['3.7', '3.8', '4.0', '3.75'],
        correctIndex: 0,
        hint: '💡 소수 둘째 자리의 숫자가 4이므로 버림합니다.',
        explanation: '소수 둘째 자리의 숫자 4는 버림 대상이므로 3.7이 됩니다.'
      },
      {
        id: 'cur_20',
        category: '수의 범위',
        question: '체온이 37.5℃를 초과하면 발열로 봅니다. 발열 상태인 학생의 체온은?',
        options: ['37.0℃', '37.5℃', '37.8℃', '36.8℃'],
        correctIndex: 2,
        hint: '💡 37.5℃ 초과는 37.5℃보다 높은 체온이어야 합니다!',
        explanation: '37.8℃는 37.5℃보다 높으므로(초과) 발열 상태에 해당합니다.'
      }
    ];
  }

  // 동적 문제 생성기 (무한 플레이 가능)
  generateDynamicQuestion() {
    const types = ['이상', '이하', '초과', '미만', '올림', '버림', '반올림', '범위개수'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = 'dyn_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    if (type === '이상') {
      const base = (Math.floor(Math.random() * 8) + 2) * 10; // 20, 30, ... 90
      const correct = base;
      const wrong1 = base - 1;
      const wrong2 = base - 2;
      const wrong3 = base - 10;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '이상',
        question: `다음 중 "${base} 이상인 수"에 해당하는 것은?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 "${base} 이상"은 ${base}와 같거나 큰 수입니다. 기준 수(${base})도 포함됩니다.`,
        explanation: `${base} 이상인 수는 ${base}를 포함하여 그보다 큰 수이므로 ${correct}가 정답입니다.`
      };
    }

    if (type === '이하') {
      const base = (Math.floor(Math.random() * 7) + 3) * 10 + 5; // 35, 45...
      const correct = base;
      const wrong1 = base + 1;
      const wrong2 = base + 5;
      const wrong3 = base + 10;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '이하',
        question: `다음 중 "${base} 이하인 수"에 해당하는 것은?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 "${base} 이하"는 ${base}와 같거나 작은 수입니다. 기준 수(${base})도 포함됩니다.`,
        explanation: `${base} 이하인 수는 ${base}와 같거나 작으므로 ${correct}가 정답입니다.`
      };
    }

    if (type === '초과') {
      const base = Math.floor(Math.random() * 40) + 20;
      const correct = base + 2;
      const wrong1 = base; // 함정 (포함 안 됨)
      const wrong2 = base - 1;
      const wrong3 = base - 5;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '초과',
        question: `다음 중 "${base} 초과인 수"는 어느 것일까요?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 "${base} 초과"는 ${base}보다 큰 수이며, ${base}는 포함되지 않습니다!`,
        explanation: `${base} 초과는 ${base}보다 커야 하므로 ${base}는 포함되지 않고 ${correct}가 정답입니다.`
      };
    }

    if (type === '미만') {
      const base = Math.floor(Math.random() * 40) + 30;
      const correct = base - 3;
      const wrong1 = base; // 함정
      const wrong2 = base + 1;
      const wrong3 = base + 7;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '미만',
        question: `다음 중 "${base} 미만인 수"는 어느 것일까요?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 "${base} 미만"은 ${base}보다 작은 수이며, ${base}는 포함되지 않습니다!`,
        explanation: `${base} 미만은 ${base}보다 작아야 하므로 ${correct}가 정답입니다.`
      };
    }

    if (type === '올림') {
      const hundreds = Math.floor(Math.random() * 8) + 1;
      const tens = Math.floor(Math.random() * 8) + 1;
      const ones = Math.floor(Math.random() * 8) + 1;
      const num = hundreds * 100 + tens * 10 + ones;
      const correct = hundreds * 100 + (tens + 1) * 10;
      const wrong1 = hundreds * 100 + tens * 10;
      const wrong2 = (hundreds + 1) * 100;
      const wrong3 = correct + 5;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '올림',
        question: `${num}을 "십의 자리까지 올림"한 값은?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 십의 자리 아래 일의 자리 숫자(${ones})가 0이 아니므로 올려서 십의 자리가 1 늘어납니다.`,
        explanation: `${num}의 일의 자리 ${ones}를 올려 십의 자리까지 나타내면 ${correct}입니다.`
      };
    }

    if (type === '버림') {
      const hundreds = Math.floor(Math.random() * 8) + 1;
      const tens = Math.floor(Math.random() * 8) + 1;
      const ones = Math.floor(Math.random() * 8) + 2;
      const num = hundreds * 100 + tens * 10 + ones;
      const correct = hundreds * 100 + tens * 10;
      const wrong1 = hundreds * 100 + (tens + 1) * 10;
      const wrong2 = hundreds * 100;
      const wrong3 = correct - 10;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '버림',
        question: `${num}을 "십의 자리까지 버림"한 값은?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 십의 자리 아래 일의 자리 숫자(${ones})를 버려 0으로 만듭니다.`,
        explanation: `${num}의 일의 자리 ${ones}를 버리면 ${correct}이 됩니다.`
      };
    }

    if (type === '반올림') {
      const tens = Math.floor(Math.random() * 8) + 2;
      const isUp = Math.random() > 0.5;
      const ones = isUp ? Math.floor(Math.random() * 5) + 5 : Math.floor(Math.random() * 5); // 5~9 또는 0~4
      const num = tens * 10 + ones;
      const correct = isUp ? (tens + 1) * 10 : tens * 10;
      const wrong1 = isUp ? tens * 10 : (tens + 1) * 10;
      const wrong2 = correct + 5;
      const wrong3 = correct - 5;
      const options = this.shuffle([String(correct), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id,
        category: '반올림',
        question: `${num}을 "십의 자리까지 반올림"하면?`,
        options,
        correctIndex: options.indexOf(String(correct)),
        hint: `💡 일의 자리 숫자가 ${ones}입니다. 0,1,2,3,4는 버리고 5,6,7,8,9는 올립니다!`,
        explanation: `일의 자리 숫자가 ${ones}이므로 ${isUp ? '올림하여 ' + correct : '버림하여 ' + correct}가 됩니다.`
      };
    }

    // 범위 자연수 개수
    const min = Math.floor(Math.random() * 20) + 10;
    const diff = Math.floor(Math.random() * 5) + 4; // 4~8
    const max = min + diff;
    const count = max - min;
    const options = this.shuffle([`${count}개`, `${count - 1}개`, `${count + 1}개`, `${count + 2}개`]);
    return {
      id,
      category: '수의 범위',
      question: `${min} 이상 ${max} 미만인 자연수는 모두 몇 개일까요?`,
      options,
      correctIndex: options.indexOf(`${count}개`),
      hint: `💡 ${min}은 포함되고, ${max}는 포함되지 않습니다!`,
      explanation: `${min}부터 ${max - 1}까지의 자연수이므로 총 ${count}개입니다.`
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
