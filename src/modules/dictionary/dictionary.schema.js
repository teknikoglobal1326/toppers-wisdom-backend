const Joi = require('joi');

const getWordsSchema = Joi.object({
  sub: Joi.string().valid('rep', 'exam', 'theme', 'alpha').optional(),
  group: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

const getMcqSchema = Joi.object({
  sub: Joi.string().valid('mixed', 'theme').optional(),
  group: Joi.string().optional()
});

const searchSchema = Joi.object({
  q: Joi.string().required(),
  cat: Joi.string().optional()
});

const flashcardProgressSchema = Joi.object({
  wordId: Joi.string().required(),
  selfRating: Joi.number().min(1).max(5).required() // 1-5 scale for SuperMemo
});

const mcqProgressSchema = Joi.object({
  questionId: Joi.string().required(),
  selectedOption: Joi.string().required()
});

module.exports = {
  getWordsSchema,
  getMcqSchema,
  searchSchema,
  flashcardProgressSchema,
  mcqProgressSchema
};
