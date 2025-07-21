import React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export function SaveForm() {
  const { toast } = useToast()
  
  const handleSave = () => {
    // Simulate save operation
    toast({
      title: "Success!",
      description: "Your data has been saved successfully.",
    })
  }

  return (
    <div className="p-4">
      <Button onClick={handleSave}>
        Save
      </Button>
    </div>
  )
}