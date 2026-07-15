'use client'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export function runTour(steps: DriveStep[]) {
  const d = driver({
    showProgress: true,
    steps,
    popoverClass: 'stocker-tour',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
  })
  d.drive()
}
