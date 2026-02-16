import { useLocalSearchParams } from 'expo-router'
import CreateCard from '@/app/create-card'

export default function EditCardPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  if (!id || Array.isArray(id)) return null
  return <CreateCard cardId={id} />
}
