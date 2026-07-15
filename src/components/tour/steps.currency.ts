import type { DriveStep } from 'driver.js'

export const currencyTourSteps: DriveStep[] = [
  { element: '[data-tour="currency-settings"]', popover: {
      title: 'Configura tus monedas', description: 'Elige tu moneda base y una secundaria para la vista dual.' } },
  { element: '[data-tour="enabled-currencies"]', popover: {
      title: 'Monedas habilitadas', description: 'Marca las monedas con las que vas a operar.' } },
  { element: '[data-tour="daily-rates"]', popover: {
      title: 'Tasa del día', description: 'Revisa o sobrescribe manualmente la tasa de cambio del día.' } },
]
