const BaseRepository = require('../../core/BaseRepository')
const CalendarExam = require('../../models/CalendarExam.model')

class CalendarExamRepository extends BaseRepository {
  constructor() {
    super(CalendarExam, 'calendar-exam')
  }
}

module.exports = new CalendarExamRepository()
