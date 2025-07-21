import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Download } from 'lucide-react'

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        보고서
      </h1>
      
      <Card>
        <CardContent className="text-center py-16">
          <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">
            보고서 생성 기능
          </h2>
          <p className="text-muted-foreground mb-6">
            급여 보고서, 휴가 현황 보고서, PDF 다운로드 기능이 곧 구현됩니다.
          </p>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            보고서 다운로드
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports