import { api, apiForm } from '@/api'
import { useMutation } from '@tanstack/react-query'
import { ContactFormRequest } from '../types/contact'

const postContactForm = async (data: ContactFormRequest) => {
  const res = await api.post('users/send_contact_info/', data)
  return res.data
}

export const usePostContactForm = () => {
  const {
    mutate: postContactFormMutate,
    mutateAsync: postContactFormAsync,
    isPending: isLoadingPostContactForm,
  } = useMutation({
    mutationFn: (user: ContactFormRequest) => postContactForm(user),
  })

  return {
    postContactFormMutate,
    postContactFormAsync,
    isLoadingPostContactForm,
  }
}
