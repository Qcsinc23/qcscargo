import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('Logger', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any
  let consoleInfoSpy: any
  let consoleDebugSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('should log messages in development', () => {
      logger.log('Test message', { component: 'TestComponent' })
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log errors with Error object', () => {
      const error = new Error('Test error')
      logger.error('Error occurred', error, { component: 'TestComponent' })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log errors with custom error object', () => {
      logger.error('Error occurred', { message: 'Custom error' }, { component: 'TestComponent' })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should log warnings', () => {
      logger.warn('Warning message', { component: 'TestComponent' })
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Info message', { component: 'TestComponent' })
      expect(consoleInfoSpy).toHaveBeenCalled()
    })
  })

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Debug message', { test: 'data' })
      expect(consoleDebugSpy).toHaveBeenCalled()
    })
  })

  describe('time and timeEnd', () => {
    it('should track time correctly', () => {
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {})
      const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {})

      logger.time('test-operation')
      logger.timeEnd('test-operation')

      expect(timeSpy).toHaveBeenCalledWith('test-operation')
      expect(timeEndSpy).toHaveBeenCalledWith('test-operation')

      timeSpy.mockRestore()
      timeEndSpy.mockRestore()
    })
  })
})
