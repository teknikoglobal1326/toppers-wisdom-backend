const Joi = require('joi')

const createBookSchema = Joi.object({
  title: Joi.string().trim().required(),
  author: Joi.string().trim().optional().allow(null, ''),
  coverImage: Joi.string().optional().allow(null, ''),
  file: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  price: Joi.number().min(0).optional().default(0),
  sortOrder: Joi.number().integer().min(0).optional().default(0),
  isFree: Joi.boolean().optional().default(false),
  section: Joi.string().valid('eBooks', 'books', 'audioBooks').default('books'),
  buyUrl: Joi.string().uri().optional().allow(null, ''),
  pages: Joi.number().integer().min(0).optional().default(0),
  rating: Joi.number().min(0).max(5).optional().default(0),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status:      Joi.string().valid('active', 'inactive').default('active'),
})

const updateBookSchema = Joi.object({
  title:       Joi.string().trim(),
  author:      Joi.string().trim().optional().allow(null, ''),
  coverImage:  Joi.string().optional().allow(null, ''),
  file:        Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  price:       Joi.number().min(0).optional(),
  sortOrder:   Joi.number().integer().min(0).optional(),
  isFree:      Joi.boolean().optional(),
  section:     Joi.string().valid('myBooks', 'eBooks', 'books', 'audioBooks'),
  buyUrl:      Joi.string().uri().optional().allow(null, ''),
  pages:       Joi.number().integer().min(0).optional(),
  rating:      Joi.number().min(0).max(5).optional(),
  tags:        Joi.array().items(Joi.string()).optional(),
  language:    Joi.string().valid('hi', 'en', 'both'),
  status:      Joi.string().valid('active', 'inactive'),
}).min(1)

const setBuyUrlSchema = Joi.object({
    buyUrl: Joi.string().uri().required(),
})

const createBookDualSchema = Joi.object({
  hi: createBookSchema.required(),
  en: createBookSchema.required(),
})

const listBookQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  section: Joi.string().valid('myBooks', 'eBooks', 'books', 'audioBooks'),
  language: Joi.string().valid('hi', 'en', 'both'),
  q: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
})

module.exports = { createBookSchema, createBookDualSchema, updateBookSchema, setBuyUrlSchema, listBookQuerySchema }
