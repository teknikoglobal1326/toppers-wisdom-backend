const SpeedMathTest = require('../../models/SpeedMathTest.model')
const SpeedMathAttempt = require('../../models/SpeedMathAttempt.model')
const AppError = require('../../core/AppError')
const BaseService = require('../../core/BaseService')

const DIFFICULTY_CONFIG = {
  easy: {
    addition: { maxOperand: 250, carryAllowed: false },
    subtraction: { maxOperand: 250, borrowAllowed: false, negativeAllowed: false },
    multiplication: { maxOperand: 250 },
    division: { maxDivisor: 250, maxQuotient: 250 },
    percentage: { maxPercent: 100, maxBase: 250 },
    square: { maxOperand: 20 },
    cube: { maxOperand: 10 },
    squareroot: { maxOperand: 20 },
    cuberoot: { maxOperand: 10 }
  },
  medium: {
    addition: { maxOperand: 999, carryAllowed: true },
    subtraction: { maxOperand: 999, borrowAllowed: true, negativeAllowed: false },
    multiplication: { maxOperand: 999 },
    division: { maxDivisor: 999, maxQuotient: 999 },
    percentage: { maxPercent: 100, maxBase: 999 },
    square: { maxOperand: 50 },
    cube: { maxOperand: 20 },
    squareroot: { maxOperand: 50 },
    cuberoot: { maxOperand: 20 }
  },
  hard: {
    addition: { maxOperand: 5000, carryAllowed: true },
    subtraction: { maxOperand: 5000, borrowAllowed: true, negativeAllowed: false },
    multiplication: { maxOperand: 5000 },
    division: { maxDivisor: 5000, maxQuotient: 5000 },
    percentage: { maxPercent: 150, maxBase: 5000 },
    square: { maxOperand: 100 },
    cube: { maxOperand: 50 },
    squareroot: { maxOperand: 100 },
    cuberoot: { maxOperand: 50 }
  }
}

function hasCarryAddition(a, b) {
  let carry = 0
  let tempA = a
  let tempB = b
  while (tempA > 0 || tempB > 0) {
    const sum = (tempA % 10) + (tempB % 10) + carry
    if (sum >= 10) return true
    carry = Math.floor(sum / 10)
    tempA = Math.floor(tempA / 10)
    tempB = Math.floor(tempB / 10)
  }
  return false
}

function hasBorrowSubtraction(a, b) {
  if (a < b) return false
  let tempA = a
  let tempB = b
  while (tempA > 0 || tempB > 0) {
    const digitA = tempA % 10
    const digitB = tempB % 10
    if (digitA < digitB) return true
    tempA = Math.floor(tempA / 10)
    tempB = Math.floor(tempB / 10)
  }
  return false
}

class TestConfigurationValidator {
  static validate(config) {
    let { questionCount, difficulty, operations, rangeMin, rangeMax } = config

    difficulty = difficulty ? difficulty.toLowerCase() : 'easy'

    if (rangeMin === undefined || rangeMax === undefined) {
      if (difficulty === 'easy') {
        rangeMin = 1
        rangeMax = 250
      } else if (difficulty === 'medium') {
        rangeMin = 250
        rangeMax = 999
      } else if (difficulty === 'hard') {
        rangeMin = 999
        rangeMax = 5000
      } else {
        throw new AppError('difficulty must be one of: easy, medium, hard', 400)
      }
    }

    if (!questionCount || isNaN(questionCount) || Number(questionCount) < 1 || Number(questionCount) > 100) {
      throw new AppError('questionCount must be between 1 and 100', 400)
    }
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new AppError('operations must contain at least one supported operation', 400)
    }

    const supported = ['addition', 'subtraction', 'multiplication', 'division', 'percentage', 'square', 'cube', 'squareroot', 'cuberoot', 'brainbooster']
    const uniqueOps = Array.from(new Set(operations.map(o => String(o).toLowerCase().trim())))
    for (const op of uniqueOps) {
      if (!supported.includes(op)) {
        throw new AppError(`Unsupported operation: ${op}`, 400)
      }
    }

    return {
      rangeMin: Number(rangeMin),
      rangeMax: Number(rangeMax),
      questionCount: Number(questionCount),
      difficulty,
      operations: uniqueOps
    }
  }
}

class DifficultyRuleEngine {
  static getOperands(operation, difficulty, rangeMin, rangeMax) {
    const config = DIFFICULTY_CONFIG[difficulty][operation]
    let op1, op2

    for (let attempts = 0; attempts < 100; attempts++) {
      if (operation === 'addition') {
        op1 = Math.floor(Math.random() * (Math.min(rangeMax, config.maxOperand) - rangeMin + 1)) + rangeMin
        op2 = Math.floor(Math.random() * (Math.min(rangeMax, config.maxOperand) - rangeMin + 1)) + rangeMin

        const sum = op1 + op2

        const hasCarry = hasCarryAddition(op1, op2)
        if (difficulty === 'easy' && hasCarry) continue
        if (difficulty === 'medium' && !hasCarry) continue

        return [op1, op2]
      }

      if (operation === 'subtraction') {
        op1 = Math.floor(Math.random() * (Math.min(rangeMax, config.maxOperand) - rangeMin + 1)) + rangeMin
        op2 = Math.floor(Math.random() * (Math.min(rangeMax, config.maxOperand) - rangeMin + 1)) + rangeMin

        if (op1 < op2) {
          const temp = op1
          op1 = op2
          op2 = temp
        }

        const hasBorrow = hasBorrowSubtraction(op1, op2)
        if (difficulty === 'easy' && hasBorrow) continue
        if (difficulty === 'medium' && !hasBorrow) continue

        return [op1, op2]
      }

      if (operation === 'multiplication') {
        const limit = config.maxOperand
        op1 = Math.floor(Math.random() * (Math.min(rangeMax, limit) - rangeMin + 1)) + rangeMin
        op2 = Math.floor(Math.random() * (Math.min(rangeMax, limit) - rangeMin + 1)) + rangeMin

        if (difficulty === 'easy') {
          op1 = Math.floor(Math.random() * 8) + 2
          op2 = Math.floor(Math.random() * 8) + 2
        } else if (difficulty === 'medium') {
          op1 = Math.floor(Math.random() * 10) + 11
          op2 = Math.floor(Math.random() * 8) + 2
        }

        const prod = op1 * op2
        return [op1, op2]
      }

      if (operation === 'division') {
        let divisor, quotient
        if (difficulty === 'easy') {
          divisor = Math.floor(Math.random() * 8) + 2
          quotient = Math.floor(Math.random() * 8) + 2
        } else if (difficulty === 'medium') {
          divisor = Math.floor(Math.random() * 6) + 5
          quotient = Math.floor(Math.random() * 6) + 10
        } else {
          divisor = Math.floor(Math.random() * 15) + 10
          quotient = Math.floor(Math.random() * 15) + 10
        }

        const dividend = divisor * quotient
        return [dividend, divisor]
      }

      if (operation === 'percentage') {
        let percent, base
        if (difficulty === 'easy') {
          percent = (Math.floor(Math.random() * 9) + 1) * 10
          base = (Math.floor(Math.random() * 10) + 1) * 10
        } else if (difficulty === 'medium') {
          percent = (Math.floor(Math.random() * 19) + 1) * 5
          base = (Math.floor(Math.random() * 25) + 1) * 20
        } else {
          percent = Math.floor(Math.random() * 150) + 1
          base = (Math.floor(Math.random() * 20) + 1) * 100
        }

        if ((percent * base) % 100 !== 0) continue
        return [percent, base]
      }

      if (operation === 'square' || operation === 'cube' || operation === 'squareroot' || operation === 'cuberoot') {
        const limit = config.maxOperand
        const root = Math.floor(Math.random() * limit) + 1
        if (operation === 'square' || operation === 'cube') {
          return [root, null]
        } else if (operation === 'squareroot') {
          return [root * root, null]
        } else if (operation === 'cuberoot') {
          return [root * root * root, null]
        }
      }
      if (operation === 'brainbooster') {
        const steps = difficulty === 'easy' ? 3 : (difficulty === 'medium' ? 5 : 7)
        const sequence = []
        let current = Math.floor(Math.random() * (difficulty === 'easy' ? 20 : 50)) + 1
        sequence.push(current)
        
        for (let s = 0; s < steps; s++) {
           const opType = Math.random() > 0.5 ? '+' : '-'
           let val = Math.floor(Math.random() * (difficulty === 'easy' ? 20 : 50)) + 1
           
           if (opType === '-' && current - val < 0 && difficulty !== 'hard') {
              val = Math.min(current, val)
           }
           sequence.push(`${opType}${val}`)
           current = opType === '+' ? current + val : current - val
        }
        return [sequence, null]
      }
    }

    // Fallbacks
    if (operation === 'addition') {
      op1 = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin
      op2 = Math.floor(Math.random() * (rangeMax - op1 - rangeMin + 1)) + rangeMin
    } else if (operation === 'subtraction') {
      op1 = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin
      op2 = Math.floor(Math.random() * (op1 - rangeMin + 1)) + rangeMin
    } else if (operation === 'multiplication') {
      op1 = Math.floor(Math.sqrt(rangeMax))
      op2 = Math.floor(Math.random() * op1) + 1
      op1 = Math.floor(Math.random() * op1) + 1
    } else if (operation === 'division') {
      op2 = Math.floor(Math.random() * 10) + 2
      op1 = op2 * (Math.floor(Math.random() * 10) + 2)
    } else if (operation === 'percentage') {
      op1 = 10
      op2 = 100
    } else if (operation === 'square' || operation === 'cube' || operation === 'squareroot' || operation === 'cuberoot') {
      op1 = 10
      op2 = null
    } else if (operation === 'brainbooster') {
      op1 = [2, '+5', '+10', '+4']
      op2 = null
    }
    return [op1, op2]
  }
}

class AnswerCalculator {
  static calculate(operation, op1, op2) {
    if (operation === 'addition') return op1 + op2
    if (operation === 'subtraction') return op1 - op2
    if (operation === 'multiplication') return op1 * op2
    if (operation === 'division') return Math.floor(op1 / op2)
    if (operation === 'percentage') return (op1 * op2) / 100
    if (operation === 'square') return op1 * op1
    if (operation === 'cube') return op1 * op1 * op1
    if (operation === 'squareroot') return Math.round(Math.sqrt(op1))
    if (operation === 'cuberoot') return Math.round(Math.cbrt(op1))
    if (operation === 'brainbooster') {
      let result = op1[0]
      for (let i = 1; i < op1.length; i++) {
        const step = String(op1[i])
        const opType = step.charAt(0)
        const val = Number(step.slice(1))
        if (opType === '+') result += val
        else if (opType === '-') result -= val
      }
      return result
    }
    throw new AppError(`Unsupported operation: ${operation}`, 400)
  }
}

class DistractorGenerator {
  static generate(operation, operand1, operand2, correctAnswer) {
    const distractors = new Set()
    const candidates = [
      correctAnswer + 1,
      correctAnswer - 1,
      correctAnswer + 10,
      correctAnswer - 10,
      correctAnswer + 2,
      correctAnswer - 2
    ]

    if (operation === 'addition') {
      candidates.push(operand1 + operand2 - 2)
      candidates.push(Math.abs(operand1 - operand2))
      candidates.push(correctAnswer - 9)
      candidates.push(correctAnswer + 9)
    } else if (operation === 'subtraction') {
      candidates.push(operand1 + operand2)
      candidates.push(correctAnswer + 9)
      candidates.push(correctAnswer - 9)
    } else if (operation === 'multiplication') {
      candidates.push(operand1 + operand2)
      candidates.push(correctAnswer + operand1)
      candidates.push(correctAnswer - operand1)
      candidates.push(correctAnswer + operand2)
      candidates.push(correctAnswer - operand2)
      const str = String(correctAnswer)
      if (str.length > 1) {
        candidates.push(Number(str.split('').reverse().join('')))
      }
    } else if (operation === 'division') {
      candidates.push(operand1 * operand2)
      candidates.push(Math.max(1, correctAnswer + 1))
      candidates.push(Math.max(1, correctAnswer - 1))
      candidates.push(Math.max(1, correctAnswer + 2))
      candidates.push(Math.max(1, correctAnswer - 2))
    } else if (operation === 'percentage') {
      candidates.push((operand1 + 10) * operand2 / 100)
      candidates.push(Math.abs(operand1 - 10) * operand2 / 100)
      candidates.push(operand1 * (operand2 + 100) / 100)
      candidates.push(correctAnswer * 10)
      candidates.push(Math.floor(correctAnswer / 10))
    } else if (operation === 'square') {
      candidates.push((operand1 + 1) * (operand1 + 1))
      candidates.push(Math.max(0, (operand1 - 1) * (operand1 - 1)))
      candidates.push(operand1 * 2)
    } else if (operation === 'cube') {
      candidates.push((operand1 + 1) * (operand1 + 1) * (operand1 + 1))
      candidates.push(Math.max(0, (operand1 - 1) * (operand1 - 1) * (operand1 - 1)))
      candidates.push(operand1 * 3)
    } else if (operation === 'squareroot' || operation === 'cuberoot') {
      candidates.push(correctAnswer + 1)
      candidates.push(Math.max(0, correctAnswer - 1))
      candidates.push(correctAnswer * 2)
    } else if (operation === 'brainbooster') {
      candidates.push(correctAnswer + 5)
      candidates.push(correctAnswer - 5)
      candidates.push(correctAnswer + 10)
      candidates.push(correctAnswer - 10)
      candidates.push(correctAnswer + 2)
      candidates.push(correctAnswer - 2)
    }

    for (const cand of candidates) {
      if (cand !== correctAnswer && cand >= 0 && !isNaN(cand)) {
        distractors.add(cand)
      }
    }

    let offset = 1
    while (distractors.size < 3) {
      const high = correctAnswer + offset
      const low = correctAnswer - offset
      if (high !== correctAnswer && high >= 0) distractors.add(high)
      if (low !== correctAnswer && low >= 0) distractors.add(low)
      offset++
    }

    const distractorList = Array.from(distractors)
    return distractorList.sort(() => 0.5 - Math.random()).slice(0, 3)
  }
}

class ExplanationGenerator {
  static generate(operation, operand1, operand2, correctAnswer) {
    if (operation === 'addition') {
      const ones1 = operand1 % 10
      const ones2 = operand2 % 10
      const sumOnes = ones1 + ones2
      const tens1 = Math.floor(operand1 / 10)
      const tens2 = Math.floor(operand2 / 10)
      let carryMsg = ''
      if (sumOnes >= 10) {
        carryMsg = `, plus the carried 1 = ${tens1 + tens2 + 1}`
      }
      return `Add the ones: ${ones1} + ${ones2} = ${sumOnes}. Add the tens: ${tens1} + ${tens2} = ${tens1 + tens2}${carryMsg}. Therefore, ${operand1} + ${operand2} = ${correctAnswer}.`
    }

    if (operation === 'subtraction') {
      const ones1 = operand1 % 10
      const ones2 = operand2 % 10
      if (ones1 < ones2) {
        return `Since the ones digit of ${operand1} (${ones1}) is less than ${operand2} (${ones2}), borrow 1 from the tens. This gives (10 + ${ones1}) - ${ones2} = ${10 + ones1 - ones2} for the ones place, and the tens place becomes ${Math.floor(operand1 / 10) - 1} - ${Math.floor(operand2 / 10)} = ${Math.floor(operand1 / 10) - 1 - Math.floor(operand2 / 10)}. Therefore, ${operand1} - ${operand2} = ${correctAnswer}.`
      }
      return `Subtract the ones: ${ones1} - ${ones2} = ${ones1 - ones2}. Subtract the tens: ${Math.floor(operand1 / 10)} - ${Math.floor(operand2 / 10)} = ${Math.floor(operand1 / 10) - Math.floor(operand2 / 10)}. Therefore, ${operand1} - ${operand2} = ${correctAnswer}.`
    }

    if (operation === 'multiplication') {
      return `Calculate ${operand1} multiplied by ${operand2}. Using multiplication: ${operand1} × ${operand2} = ${correctAnswer}.`
    }

    if (operation === 'division') {
      return `For division, find how many times ${operand2} goes into ${operand1}. Since ${operand2} × ${correctAnswer} = ${operand1}, we have ${operand1} ÷ ${operand2} = ${correctAnswer}.`
    }

    if (operation === 'percentage') {
      return `To find ${operand1}% of ${operand2}, multiply ${operand2} by ${operand1}/100. So, ${operand1}/100 × ${operand2} = ${correctAnswer}.`
    }

    if (operation === 'square') {
      return `The square of ${operand1} is ${operand1} × ${operand1} = ${correctAnswer}.`
    }

    if (operation === 'cube') {
      return `The cube of ${operand1} is ${operand1} × ${operand1} × ${operand1} = ${correctAnswer}.`
    }

    if (operation === 'squareroot') {
      return `The square root of ${operand1} is the number that when multiplied by itself equals ${operand1}. Since ${correctAnswer} × ${correctAnswer} = ${operand1}, the square root is ${correctAnswer}.`
    }

    if (operation === 'cuberoot') {
      return `The cube root of ${operand1} is the number that when cubed equals ${operand1}. Since ${correctAnswer} × ${correctAnswer} × ${correctAnswer} = ${operand1}, the cube root is ${correctAnswer}.`
    }

    if (operation === 'brainbooster') {
       let expl = `Start with ${operand1[0]}.`
       let current = operand1[0]
       for (let i = 1; i < operand1.length; i++) {
         const step = String(operand1[i])
         const opType = step.charAt(0)
         const val = Number(step.slice(1))
         const next = opType === '+' ? current + val : current - val
         expl += ` Then ${current} ${opType === '+' ? '+' : '-'} ${val} = ${next}.`
         current = next
       }
       return expl
    }

    return `${operand1} ${operation} ${operand2} = ${correctAnswer}`
  }
}

class QuestionValidator {
  static validate(q, rangeMin, rangeMax) {
    if (!q.questionId || !q.question || !q.operation || q.correctAnswer === undefined) return false
    if (q.options.length !== 4) return false

    const correctOpts = q.options.filter(o => o.id === q.correctOptionId)
    if (correctOpts.length !== 1) return false
    if (correctOpts[0].value !== q.correctAnswer) return false

    const values = q.options.map(o => o.value)
    if (new Set(values).size !== 4) return false

    if (q.operation === 'division') {
      if (q.operands[0] % q.operands[1] !== 0) return false
    }

    return true
  }
}

class QuestionGenerator {
  static generateQuestion(questionId, questionNumber, operation, difficulty, rangeMin, rangeMax) {
    const [op1, op2] = DifficultyRuleEngine.getOperands(operation, difficulty, rangeMin, rangeMax)
    const correctAnswer = AnswerCalculator.calculate(operation, op1, op2)
    const distractors = DistractorGenerator.generate(operation, op1, op2, correctAnswer)

    const rawOptions = [
      { type: 'correct', value: correctAnswer },
      { type: 'distractor', value: distractors[0] },
      { type: 'distractor', value: distractors[1] },
      { type: 'distractor', value: distractors[2] }
    ]

    // Shuffle options
    const shuffled = rawOptions.sort(() => 0.5 - Math.random())
    const optionIds = ['A', 'B', 'C', 'D']

    const options = shuffled.map((o, index) => ({
      id: optionIds[index],
      value: o.value
    }))

    const correctOptionId = options.find(o => o.value === correctAnswer).id
    
    let questionText = ''
    if (operation === 'percentage') {
      questionText = `${op1}% of ${op2} = ?`
    } else if (operation === 'square') {
      questionText = `${op1}² = ?`
    } else if (operation === 'cube') {
      questionText = `${op1}³ = ?`
    } else if (operation === 'squareroot') {
      questionText = `√${op1} = ?`
    } else if (operation === 'cuberoot') {
      questionText = `∛${op1} = ?`
    } else if (operation === 'brainbooster') {
      questionText = op1.join(' ') + ' = ?'
    } else {
      const opSign = operation === 'addition' ? '+' : operation === 'subtraction' ? '-' : operation === 'multiplication' ? '×' : operation === 'division' ? '÷' : 'of'
      questionText = `${op1} ${opSign} ${op2} = ?`
    }

    const explanation = ExplanationGenerator.generate(operation, op1, op2, correctAnswer)

    return {
      questionId,
      questionNumber,
      operation,
      question: questionText,
      options,
      correctOptionId,
      explanation,
      difficulty,
      correctAnswer,
      operands: operation === 'brainbooster' ? op1 : [op1, op2]
    }
  }
}

class TestAssembler {
  static assemble(userId, config) {
    const { rangeMin, rangeMax, questionCount, difficulty, operations } = config
    const questions = []
    const usedKeys = new Set()

    const opDistribution = []
    const baseCount = Math.floor(questionCount / operations.length)
    let remainder = questionCount % operations.length

    for (const op of operations) {
      let count = baseCount
      if (remainder > 0) {
        count += 1
        remainder -= 1
      }
      for (let i = 0; i < count; i++) {
        opDistribution.push(op)
      }
    }

    opDistribution.sort(() => 0.5 - Math.random())

    const maxAttempts = questionCount * 20
    let attempts = 0
    let questionIndex = 1

    while (questions.length < questionCount && attempts < maxAttempts) {
      attempts++
      const op = opDistribution[questions.length]
      const questionId = `q${questionIndex}`

      const q = QuestionGenerator.generateQuestion(questionId, questionIndex, op, difficulty, rangeMin, rangeMax)

      // Prevent duplicates
      let uniqueKey = ''
      if (op === 'brainbooster') {
        uniqueKey = `${op}_${q.operands.join('_')}`
      } else if (op === 'square' || op === 'cube' || op === 'squareroot' || op === 'cuberoot') {
        uniqueKey = `${op}_${q.operands[0]}`
      } else {
        const minOpVal = Math.min(q.operands[0], q.operands[1])
        const maxOpVal = Math.max(q.operands[0], q.operands[1])
        uniqueKey = (op === 'addition' || op === 'multiplication')
          ? `${op}_${minOpVal}_${maxOpVal}`
          : `${op}_${q.operands[0]}_${q.operands[1]}`
      }

      if (usedKeys.has(uniqueKey)) {
        continue
      }

      if (QuestionValidator.validate(q, rangeMin, rangeMax)) {
        questions.push(q)
        usedKeys.add(uniqueKey)
        questionIndex++
      }
    }

    if (questions.length < questionCount) {
      throw new AppError('Could not generate enough unique/valid questions. Please try different parameters or range.', 400)
    }

    return {
      user: userId,
      configuration: config,
      questions
    }
  }
}

class SpeedMathTestService extends BaseService {
  constructor() {
    super(null, 'speed-math-test')
  }

  async generateTest(userId, rawConfig) {
    const validatedConfig = TestConfigurationValidator.validate(rawConfig)
    const testData = TestAssembler.assemble(userId, validatedConfig)

    const test = await SpeedMathTest.create(testData)

    // Auto-create a started attempt for this test
    const attempt = await SpeedMathAttempt.create({
      user: userId,
      test: test._id,
      startTime: new Date(),
      status: 'started',
      answers: []
    })

    return {
      test,
      attempt
    }
  }

  async getTestQuestions(testId) {
    const test = await SpeedMathTest.findById(testId).lean()
    if (!test) throw new AppError('Test not found', 404)

    // Sanitize questions to remove correct answers, explanation, operands, and correctOptionId
    const sanitizedQuestions = test.questions.map(q => ({
      questionId: q.questionId,
      questionNumber: q.questionNumber,
      operation: q.operation,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
    }))

    return {
      testId: test._id,
      configuration: test.configuration,
      questions: sanitizedQuestions
    }
  }

  async submitAnswer(userId, testId, data) {
    const { questionId, selectedOptionId, typedAnswer, timeTaken } = data
    if (!questionId) {
      throw new AppError('questionId is required', 400)
    }

    const test = await SpeedMathTest.findById(testId).lean()
    if (!test) throw new AppError('Test not found', 404)

    const q = test.questions.find(item => item.questionId === questionId)
    if (!q) throw new AppError('Question not found in test', 404)

    const attempt = await SpeedMathAttempt.findOne({ user: userId, test: testId, status: 'started' })
    if (!attempt) throw new AppError('No active test attempt found', 404)

    let isCorrect = false
    let studentAnswerVal = null
    let optId = null

    if (selectedOptionId) {
      const selectedOption = q.options.find(o => o.id === selectedOptionId)
      if (!selectedOption) throw new AppError('Invalid selectedOptionId', 400)
      studentAnswerVal = selectedOption.value
      optId = selectedOptionId
      isCorrect = (selectedOptionId === q.correctOptionId)
    } else if (typedAnswer !== undefined && typedAnswer !== null) {
      studentAnswerVal = Number(typedAnswer)
      optId = null
      isCorrect = (studentAnswerVal === q.correctAnswer)
    } else {
      throw new AppError('Either selectedOptionId or typedAnswer must be provided', 400)
    }

    // Check if answer already exists
    const existingIndex = attempt.answers.findIndex(ans => ans.questionId === questionId)
    const newAnswer = {
      questionId,
      selectedOptionId: optId,
      studentAnswer: studentAnswerVal,
      timeTaken: Number(timeTaken) || 0,
      isCorrect
    }

    if (existingIndex > -1) {
      attempt.answers[existingIndex] = newAnswer
    } else {
      attempt.answers.push(newAnswer)
    }

    await attempt.save()
    return { success: true }
  }

  async submitTest(userId, testId) {
    const test = await SpeedMathTest.findById(testId).lean()
    if (!test) throw new AppError('Test not found', 404)

    const attempt = await SpeedMathAttempt.findOne({ user: userId, test: testId, status: 'started' })
    if (!attempt) throw new AppError('No active test attempt found', 404)

    attempt.endTime = new Date()
    attempt.status = 'completed'

    let correct = 0
    let incorrect = 0
    let skipped = 0
    let totalTimeTaken = 0

    // Ensure all questions are scored
    for (const q of test.questions) {
      const studentAns = attempt.answers.find(ans => ans.questionId === q.questionId)
      if (studentAns) {
        totalTimeTaken += studentAns.timeTaken
        if (studentAns.isCorrect) {
          correct++
        } else {
          incorrect++
        }
      } else {
        skipped++
      }
    }

    if (totalTimeTaken === 0) {
      totalTimeTaken = attempt.endTime.getTime() - attempt.startTime.getTime();
    }

    const totalQuestions = test.configuration.questionCount
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0

    // QPM calculation (totalTimeTaken is in milliseconds)
    const totalTimeMinutes = (totalTimeTaken / 1000) / 60
    const questionsPerMinute = totalTimeMinutes > 0 ? Number((correct / totalTimeMinutes).toFixed(2)) : 0

    attempt.correct = correct
    attempt.incorrect = incorrect
    attempt.skipped = skipped
    attempt.score = correct
    attempt.accuracy = accuracy
    attempt.timeTaken = totalTimeTaken
    attempt.questionsPerMinute = questionsPerMinute

    await attempt.save()

    return attempt
  }

  async getResult(userId, testId) {
    const test = await SpeedMathTest.findById(testId).lean()
    if (!test) throw new AppError('Test not found', 404)

    const attempt = await SpeedMathAttempt.findOne({ user: userId, test: testId, status: 'completed' }).lean()
    if (!attempt) throw new AppError('No completed attempt found. Please submit the test first.', 404)

    let correctCount = 0;
    
    let incorrectCount = 0;
    let skippedCount = 0;

    // Build rich details mapping questions with answers, explanations, and correctness status
    const details = test.questions.map(q => {
      const studentAns = attempt.answers.find(ans => ans.questionId === q.questionId)

      let isCorrect = false;
      let isSkipped = true;

      if (studentAns) {
        isSkipped = false;
        isCorrect = studentAns.isCorrect;
        if (isCorrect) correctCount++;
        else incorrectCount++;
      } else {
        skippedCount++;
      }

      return {
        questionId: q.questionId,
        questionNumber: q.questionNumber,
        operation: q.operation,
        question: q.question,
        options: q.options,
        correctOptionId: q.correctOptionId,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        studentAnswer: studentAns ? studentAns.studentAnswer : null,
        selectedOptionId: studentAns ? studentAns.selectedOptionId : null,
        timeTaken: studentAns ? studentAns.timeTaken : 0,
        isCorrect,
        isSkipped
      }
    })

    attempt.correct = correctCount;
    attempt.incorrect = incorrectCount;
    attempt.skipped = skippedCount;
    attempt.score = correctCount;
    attempt.accuracy = test.questions.length > 0 ? Math.round((correctCount / test.questions.length) * 100) : 0;

    return {
      testId: test._id,
      configuration: test.configuration,
      attempt,
      questions: details
    }
  }

  async getDashboardData(userId) {
    const attempts = await SpeedMathAttempt.find({ user: userId, status: 'completed' }).lean()

    const totalAttempted = attempts.length

    if (totalAttempted === 0) {
      return {
        totalAttempted: 0,
        overallAccuracy: 0,
        averageTimeTaken: 0,
        averageTimePerQuestion: 0
      }
    }

    let totalAccuracy = 0
    let totalTimeTaken = 0
    let totalQuestionsCount = 0

    for (const att of attempts) {
      totalAccuracy += att.accuracy || 0
      totalTimeTaken += att.timeTaken || 0
      totalQuestionsCount += att.answers.length
    }

    const overallAccuracy = Math.round(totalAccuracy / totalAttempted)
    const averageTimeTaken = Math.round(totalTimeTaken / totalAttempted)
    const averageTimePerQuestion = totalQuestionsCount > 0 ? Math.round(totalTimeTaken / totalQuestionsCount) : 0

    return {
      totalAttempted,
      overallAccuracy,
      averageTimeTaken,
      averageTimePerQuestion
    }
  }
}

module.exports = new SpeedMathTestService()
