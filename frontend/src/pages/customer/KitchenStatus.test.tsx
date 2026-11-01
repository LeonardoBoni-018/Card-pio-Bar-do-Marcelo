import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KitchenStatus } from './KitchenStatus'

const terca = (hhmm: string) => new Date(`2026-11-03T${hhmm}:00-03:00`)

describe('KitchenStatus (selo fixo do cabeçalho)', () => {
  it('cozinha aberta: mostra o estado e até que horas', () => {
    render(<KitchenStatus now={terca('19:00')} />)
    const botao = screen.getByRole('button', { name: /Cozinha aberta, até 22:00\. Ver horário da cozinha/ })
    expect(within(botao).getByText('Cozinha aberta')).toBeInTheDocument()
    expect(within(botao).getByText('até 22:00')).toBeInTheDocument()
  })

  it('fechada: mostra quando abre', () => {
    render(<KitchenStatus now={terca('12:00')} />)
    expect(screen.getByRole('button', { name: /Cozinha fechada, abre hoje às 15:30/ })).toBeInTheDocument()
  })

  it('ao tocar abre os horários completos com o dia de hoje destacado e fecha no botão', async () => {
    const user = userEvent.setup()
    render(<KitchenStatus now={terca('19:00')} />)
    await user.click(screen.getByRole('button', { name: /Ver horário da cozinha/ }))

    const dialog = screen.getByRole('dialog', { name: 'Horário da cozinha' })
    expect(within(dialog).getByText('Terça a sexta')).toBeInTheDocument()
    expect(within(dialog).getByText('15:30 às 22:00')).toBeInTheDocument()
    expect(within(dialog).getByText('Sábado')).toBeInTheDocument()
    expect(within(dialog).getByText('10:30 às 17:00')).toBeInTheDocument()
    expect(within(within(dialog).getByText('Terça a sexta').closest('li')!).getByText('hoje')).toBeInTheDocument()
    expect(within(within(dialog).getByText('Sábado').closest('li')!).queryByText('hoje')).toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog', { name: 'Horário da cozinha' })).toBeNull()
  })
})
