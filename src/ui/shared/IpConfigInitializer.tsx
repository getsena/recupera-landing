'use client'

import { useCurrencyStore } from '@/lib/store/useCurrencyStore'
import { useEffect } from 'react'

type Props = {
  country: string | null
}

export const IpConfigInitializer = ({ country }: Props) => {
  const { setIpCurrency, setWhatsappCountry, setShouldAutoOpenCountrySelect } = useCurrencyStore()

  useEffect(() => {
    if (!country) {
      console.log('No se pudo obtener el país, usando fallback')
      setShouldAutoOpenCountrySelect(true)
      setIpCurrency('CLP')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
      return
    }

    console.log('País detectado por IP (servidor):', country)

    if (country === 'Peru') {
      setIpCurrency('PEN')
      setWhatsappCountry({
        phoneNumber: '918272599',
        countryCode: '+51',
      })
    } else if (country === 'Chile') {
      setIpCurrency('CLP')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
    } else if (country === 'Colombia') {
      setIpCurrency('COP')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
    } else if (country === 'Mexico') {
      setIpCurrency('MXN')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
    } else if (country === 'Ecuador') {
      setIpCurrency('USD')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
    } else {
      // Default fallback
      setIpCurrency('CLP')
      setWhatsappCountry({
        phoneNumber: '944489673',
        countryCode: '+56',
      })
    }
  }, [country, setIpCurrency, setShouldAutoOpenCountrySelect, setWhatsappCountry])

  return null
}
