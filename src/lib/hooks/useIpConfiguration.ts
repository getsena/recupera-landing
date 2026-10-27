import { useGetIpInfo } from '@/lib/services/ipConfigService'
import { useCurrencyStore } from '@/lib/store/useCurrencyStore'
import { useEffect } from 'react'

export const useIpConfiguration = () => {
  const { setIpCurrency, setShouldAutoOpenCountrySelect, setWhatsappCountry } = useCurrencyStore()

  const { data, isError, isSuccess } = useGetIpInfo()

  useEffect(() => {
    if (isError) {
      console.log('Error obteniendo ubicación por IP')
      setShouldAutoOpenCountrySelect(true)
      return
    }

    if (isSuccess && data) {
      if (data.error) {
        console.log('API respondió con error:', data.error)
        setShouldAutoOpenCountrySelect(true)
        return
      }

      const country = data.country
      console.log('País detectado por IP:', country)

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
    }
  }, [data, isError, isSuccess, setIpCurrency, setShouldAutoOpenCountrySelect, setWhatsappCountry])
}
