import { Button } from "@/components/ui/button"
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold">Welcome to shadcn/ui</h1>
        <p className="text-muted-foreground">
          Beautifully designed components built with Radix UI and Tailwind CSS.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button onClick={() => setCount(count + 1)}>
            Count is {count}
          </Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        
        <p className="text-sm text-muted-foreground pt-8">
          shadcn/ui is now installed and ready to use. Start editing App.tsx to see changes.
        </p>
      </div>
    </div>
  )
}

export default App
