import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { session } from '../auth/session'
import { server } from './server'

// jsdom ainda não implementa <dialog>
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
Element.prototype.scrollIntoView = function scrollIntoView() {}
URL.createObjectURL = () => 'blob:preview'
URL.revokeObjectURL = () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  session.clear()
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
